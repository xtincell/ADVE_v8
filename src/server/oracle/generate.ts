import { createHash } from "node:crypto";
import type { OracleReport, PillarKind, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { asPillarFields } from "@/server/brands/pillar-config";
import type { SectionContent } from "./blocks";
import type { FrozenPillars, OracleContext } from "./context";
import { ORACLE_SECTIONS, sectionDef } from "./sections";

// Génération de l'Oracle : gèle le snapshot des piliers (hash), compose les 35
// sections avec statut par section et régénération unitaire (cahier §5.1).
// « Le rapport ne dit que ce que la marque a déclaré. »

async function buildContext(brandId: string, frozen: FrozenPillars, generatedAt: Date): Promise<OracleContext> {
  const brand = await db.brand.findUniqueOrThrow({ where: { id: brandId } });
  const [community, signals, assets, pillars] = await Promise.all([
    db.communityMember.findMany({
      where: { brandId },
      select: { name: true, level: true, channel: true, note: true },
      orderBy: { level: "desc" },
    }),
    db.marketSignal.findMany({
      where: { brandId },
      select: { title: true, source: true, summary: true, publishedAt: true },
      orderBy: { fetchedAt: "desc" },
      take: 20,
    }),
    db.brandAsset.findMany({
      where: { brandId, status: { in: ["DRAFT", "ACTIVE"] } },
      select: { kind: true, title: true, status: true },
    }),
    db.pillar.findMany({ where: { brandId }, select: { kind: true, score: true } }),
  ]);
  const pillarScores = {} as Record<PillarKind, number>;
  for (const p of pillars) pillarScores[p.kind] = p.score;
  return {
    brand: {
      id: brand.id,
      name: brand.name,
      sector: brand.sector,
      country: brand.country,
      city: brand.city,
      score: brand.score,
      tier: brand.tier,
    },
    pillars: frozen,
    pillarScores,
    community,
    signals,
    assets,
    generatedAt,
  };
}

function hashPillars(frozen: FrozenPillars): string {
  return createHash("sha256").update(JSON.stringify(frozen)).digest("hex").slice(0, 16);
}

async function freezePillars(brandId: string): Promise<FrozenPillars> {
  const pillars = await db.pillar.findMany({ where: { brandId } });
  const frozen: FrozenPillars = {};
  for (const p of pillars) frozen[p.kind] = asPillarFields(p.fields);
  return frozen;
}

/** Crée un rapport (nouvelle version) et compose toutes les sections. */
export async function generateOracleReport(
  brandId: string,
  actor: { id?: string | null; email?: string | null },
): Promise<OracleReport> {
  const brand = await db.brand.findUniqueOrThrow({ where: { id: brandId } });
  const frozen = await freezePillars(brandId);
  const generatedAt = new Date();

  const last = await db.oracleReport.findFirst({ where: { brandId }, orderBy: { version: "desc" } });
  const report = await db.oracleReport.create({
    data: {
      brandId,
      version: (last?.version ?? 0) + 1,
      scoreAtGen: brand.score,
      tierAtGen: brand.tier,
      pillarsHash: hashPillars(frozen),
      pillarsFrozen: frozen as unknown as Prisma.InputJsonValue,
      generatedById: actor.id ?? null,
      sections: {
        create: ORACLE_SECTIONS.map((s) => ({
          number: s.number,
          title: s.title,
          tier: s.tier,
          status: "PENDING" as const,
        })),
      },
    },
  });

  const ctx = await buildContext(brandId, frozen, generatedAt);
  for (const def of ORACLE_SECTIONS) {
    await composeSection(report.id, def.number, ctx);
  }

  await audit({
    operatorId: brand.operatorId,
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    action: "oracle.generate",
    entity: "OracleReport",
    entityId: report.id,
    after: { version: report.version, score: brand.score, hash: report.pillarsHash },
  });

  return db.oracleReport.findUniqueOrThrow({ where: { id: report.id } });
}

/** Compose (ou régénère) UNE section — statut PENDING→GENERATING→COMPLETE/FAILED. */
export async function composeSection(reportId: string, number: number, prebuilt?: OracleContext): Promise<void> {
  const def = sectionDef(number);
  const row = await db.oracleSection.findUniqueOrThrow({
    where: { reportId_number: { reportId, number } },
    include: { report: true },
  });
  await db.oracleSection.update({
    where: { id: row.id },
    data: { status: "GENERATING", error: null },
  });
  try {
    const ctx =
      prebuilt ??
      (await buildContext(row.report.brandId, row.report.pillarsFrozen as unknown as FrozenPillars, row.report.createdAt));
    // Composition déterministe (fallback honnête). L'enrichissement LLM optionnel
    // des sections 22–35 se branche ici quand une clé est configurée (tranche LLM).
    const content: SectionContent = def.compose(ctx);
    await db.oracleSection.update({
      where: { id: row.id },
      data: {
        status: "COMPLETE",
        content: content as unknown as Prisma.InputJsonValue,
        llmUsed: false,
        generatedAt: new Date(),
      },
    });
  } catch (e) {
    await db.oracleSection.update({
      where: { id: row.id },
      data: { status: "FAILED", error: e instanceof Error ? e.message : String(e) },
    });
  }
}

export async function getReportWithSections(reportId: string) {
  return db.oracleReport.findUnique({
    where: { id: reportId },
    include: { sections: { orderBy: { number: "asc" } }, brand: true },
  });
}
