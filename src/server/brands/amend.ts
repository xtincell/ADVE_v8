import type { AmendMode, Brand, Certainty, Pillar, PillarKind, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { asPillarFields, fieldDef, isDerived, pillarDef, type FieldValue, type PillarFields } from "./pillar-config";
import {
  adveCompletenessRatio,
  compositeScore,
  derivedFreshness,
  scoreDerivedPillar,
  scorePillar,
  tierForScore,
} from "@/server/scoring/score";

function pillarDefName(kind: PillarKind): string {
  return pillarDef(kind).name;
}

// ═══════════════════════════════════════════════════════════════════
// POINT D'ÉCRITURE UNIQUE des piliers (cahier §3.1).
// Toute écriture de contenu de pilier passe par amendPillar() :
// validation → version → rescoring → snapshot → propagation staleness → audit.
// Toute autre écriture de Pillar.fields dans le code est un bug.
// ═══════════════════════════════════════════════════════════════════

interface FieldChange {
  value: FieldValue;
  /** défaut : DECLARED (saisie humaine). INFERRED réservé aux pré-remplissages IA. */
  certainty?: Certainty;
}

export interface AmendInput {
  brandId: string;
  kind: PillarKind;
  changes: Record<string, FieldChange>;
  mode: AmendMode;
  actor?: { id?: string | null; email?: string | null } | null;
  note?: string;
}

export interface AmendResult {
  pillar: Pillar;
  brand: Brand;
  pillarScore: number;
  compositeScore: number;
}

const HUMAN_MODES: AmendMode[] = ["DIRECT", "LLM_REFORMULATE", "LLM_STRATEGIC", "INTAKE", "SEED"];

export async function amendPillar(input: AmendInput): Promise<AmendResult> {
  const { brandId, kind, changes, mode, actor, note } = input;

  // ── Règles d'écriture (cahier §3.1–3.2)
  if (isDerived(kind) && mode !== "RTIS_REFRESH" && mode !== "SEED") {
    throw new Error(`Le pilier ${kind} est dérivé : il se recalcule (refresh), il ne s'édite pas.`);
  }
  if (!isDerived(kind) && mode === "RTIS_REFRESH") {
    throw new Error(`Le pilier ${kind} est fondateur (ADVE) : il ne se recalcule pas, il s'amende.`);
  }
  if (Object.keys(changes).length === 0) {
    throw new Error("Aucun changement fourni.");
  }

  const now = new Date().toISOString();
  const validated: PillarFields = {};
  for (const [key, change] of Object.entries(changes)) {
    const def = fieldDef(kind, key);
    if (!def) throw new Error(`Champ inconnu pour le pilier ${kind} : « ${key} ».`);
    const certainty = change.certainty ?? "DECLARED";
    if (certainty === "INFERRED" && !def.inferable) {
      throw new Error(
        `Le champ « ${def.label} » est non-inférable par nature : il exige une saisie humaine (cahier §3.1).`,
      );
    }
    let value = change.value;
    if (def.type === "list" && typeof value === "string") {
      value = value.split("\n").map((s) => s.trim()).filter(Boolean);
    }
    if (typeof value === "string") value = value.trim();
    validated[key] = {
      value,
      certainty,
      updatedAt: now,
      updatedBy: actor?.email ?? undefined,
    };
  }

  return db.$transaction(async (tx) => {
    const brand = await tx.brand.findUniqueOrThrow({ where: { id: brandId } });
    const existing = await tx.pillar.findUnique({ where: { brandId_kind: { brandId, kind } } });
    const beforeFields = (existing?.fields ?? {}) as unknown as PillarFields;
    const merged: PillarFields = { ...beforeFields, ...validated };
    const newVersion = (existing?.version ?? 0) + 1;

    const pillar = await tx.pillar.upsert({
      where: { brandId_kind: { brandId, kind } },
      create: {
        brandId,
        kind,
        fields: merged as unknown as Prisma.InputJsonValue,
        version: newVersion,
        stale: false,
        refreshedAt: isDerived(kind) ? new Date() : null,
      },
      update: {
        fields: merged as unknown as Prisma.InputJsonValue,
        version: newVersion,
        stale: false,
        staleAt: null,
        staleReason: null,
        ...(isDerived(kind) ? { refreshedAt: new Date() } : {}),
      },
    });

    // ── Propagation de staleness (cahier §3.2) : un amendement ADVE périme
    // les RTIS et les livrables dépendants — visible dans l'UI, jamais silencieux.
    // (Avant rescoring : la péremption pèse immédiatement sur le score.)
    if (!isDerived(kind) && HUMAN_MODES.includes(mode) && mode !== "SEED") {
      const reason = `Amendement du pilier ${pillarDefName(kind)} (v${newVersion})`;
      const staleDate = new Date();
      await tx.pillar.updateMany({
        where: { brandId, kind: { in: ["RISQUE", "TRACK", "INNOVATION", "STRATEGIE"] }, version: { gt: 0 } },
        data: { stale: true, staleAt: staleDate, staleReason: reason },
      });
      await tx.oracleReport.updateMany({
        where: { brandId, stale: false },
        data: { stale: true },
      });
      await tx.oracleSection.updateMany({
        where: { report: { brandId }, status: "COMPLETE" },
        data: { status: "STALE" },
      });
      await tx.brandAsset.updateMany({
        where: { brandId, status: "ACTIVE", staleAt: null },
        data: { staleAt: staleDate },
      });
    }

    // ── Rescoring complet (à CHAQUE écriture de pilier — cahier §3.3).
    // ADVE : complétude structurelle des champs. RTIS : socle × fraîcheur.
    const allPillars = await tx.pillar.findMany({
      where: { brandId },
      select: { id: true, kind: true, fields: true, version: true, stale: true, score: true },
    });
    const pillarScores = {} as Record<PillarKind, number>;
    for (const p of allPillars) {
      if (!isDerived(p.kind)) pillarScores[p.kind] = scorePillar(p.kind, asPillarFields(p.fields));
    }
    const ratio = adveCompletenessRatio(pillarScores);
    for (const p of allPillars) {
      if (isDerived(p.kind)) pillarScores[p.kind] = scoreDerivedPillar(ratio, derivedFreshness(p));
    }
    for (const p of allPillars) {
      const target = pillarScores[p.kind] ?? 0;
      if (p.score !== target) {
        await tx.pillar.update({ where: { id: p.id }, data: { score: target } });
      }
    }

    const effectiveScore = pillarScores[kind] ?? 0;
    await tx.pillarVersion.create({
      data: {
        pillarId: pillar.id,
        version: newVersion,
        fields: merged as unknown as Prisma.InputJsonValue,
        score: effectiveScore,
        mode,
        authorId: actor?.id ?? null,
        authorEmail: actor?.email ?? null,
        note: note ?? null,
      },
    });

    const composite = compositeScore(pillarScores);
    const tier = tierForScore(composite);

    const updatedBrand = await tx.brand.update({
      where: { id: brandId },
      data: { score: composite, tier },
    });

    await tx.brandSnapshot.create({
      data: {
        brandId,
        score: composite,
        tier,
        pillarScores: pillarScores as unknown as Prisma.InputJsonValue,
      },
    });

    await audit(
      {
        operatorId: brand.operatorId,
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action: "pillar.amend",
        entity: "Pillar",
        entityId: pillar.id,
        before: { version: existing?.version ?? 0, score: existing?.score ?? 0, keys: Object.keys(changes) },
        after: { version: newVersion, score: effectiveScore, mode, composite, tier },
      },
      tx,
    );

    return { pillar: { ...pillar, score: effectiveScore }, brand: updatedBrand, pillarScore: effectiveScore, compositeScore: composite };
  });
}
