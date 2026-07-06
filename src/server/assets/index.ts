import "server-only";
import type { AssetKind, BrandAsset } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { asPillarFields } from "@/server/brands/pillar-config";
import { composeAsset, EXPOSED_KINDS, type AssetContent, type ComposeContext } from "./composers";

// Vault d'assets (cahier §5.2) : interface unique entrée typée → sortie validée
// Zod. Lifecycle DRAFT → ACTIVE → SUPERSEDED/ARCHIVED ; la péremption `staleAt`
// des assets ACTIFS est posée par amendPillar quand l'ADVE bouge.

export const assetContentSchema = z.object({
  sections: z
    .array(z.object({ title: z.string().min(1).max(200), text: z.string().min(1).max(8000) }))
    .min(1)
    .max(12),
});

export function isExposedKind(kind: string): kind is AssetKind {
  return EXPOSED_KINDS.some((k) => k.kind === kind);
}

/** Contexte de composition depuis les piliers ADVE actuels de la marque. */
async function buildComposeContext(brandId: string): Promise<ComposeContext> {
  const brand = await db.brand.findUniqueOrThrow({ where: { id: brandId } });
  const pillars = await db.pillar.findMany({
    where: { brandId, kind: { in: ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] } },
  });
  const adve: ComposeContext["adve"] = {};
  for (const p of pillars) {
    adve[p.kind as keyof ComposeContext["adve"]] = asPillarFields(p.fields);
  }
  return { brandName: brand.name, sector: brand.sector, adve };
}

export interface ForgeInput {
  brandId: string;
  kind: AssetKind;
  objectif?: string;
  actor: { id: string; email: string };
}

/** Forge un asset (composition déterministe) → nouvelle version DRAFT dans le vault. */
export async function forgeAsset(input: ForgeInput): Promise<BrandAsset> {
  if (!isExposedKind(input.kind)) {
    throw new Error(`Kind d'asset non exposé dans la forge : ${input.kind}`);
  }
  const ctx = await buildComposeContext(input.brandId);
  const { title, content } = composeAsset(input.kind, ctx, { objectif: input.objectif });
  const validated = assetContentSchema.parse(content);
  const last = await db.brandAsset.findFirst({
    where: { brandId: input.brandId, kind: input.kind },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const asset = await db.brandAsset.create({
    data: {
      brandId: input.brandId,
      kind: input.kind,
      title,
      content: validated,
      status: "DRAFT",
      version: (last?.version ?? 0) + 1,
      llmUsed: false,
      createdById: input.actor.id,
    },
  });
  const brand = await db.brand.findUniqueOrThrow({ where: { id: input.brandId }, select: { operatorId: true } });
  await audit({
    operatorId: brand.operatorId,
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    action: "asset.forge",
    entity: "BrandAsset",
    entityId: asset.id,
    after: { kind: asset.kind, version: asset.version },
  });
  return asset;
}

/**
 * Active un asset : l'ACTIF précédent du même kind passe SUPERSEDED.
 * Honnêteté : si l'ADVE a bougé depuis la composition, l'asset naît déjà périmé.
 */
export async function activateAsset(assetId: string, actor: { id: string; email: string }): Promise<void> {
  const asset = await db.brandAsset.findUniqueOrThrow({ where: { id: assetId } });
  const adveMovedSince = await db.pillar.findFirst({
    where: {
      brandId: asset.brandId,
      kind: { in: ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] },
      updatedAt: { gt: asset.createdAt },
    },
    select: { updatedAt: true },
  });
  await db.$transaction(async (tx) => {
    await tx.brandAsset.updateMany({
      where: { brandId: asset.brandId, kind: asset.kind, status: "ACTIVE", id: { not: asset.id } },
      data: { status: "SUPERSEDED" },
    });
    await tx.brandAsset.update({
      where: { id: asset.id },
      data: { status: "ACTIVE", staleAt: adveMovedSince ? adveMovedSince.updatedAt : null },
    });
  });
  const brand = await db.brand.findUniqueOrThrow({ where: { id: asset.brandId }, select: { operatorId: true } });
  await audit({
    operatorId: brand.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "asset.activate",
    entity: "BrandAsset",
    entityId: asset.id,
    after: { kind: asset.kind, version: asset.version },
  });
}

export async function archiveAsset(assetId: string, actor: { id: string; email: string }): Promise<void> {
  const asset = await db.brandAsset.update({ where: { id: assetId }, data: { status: "ARCHIVED" } });
  const brand = await db.brand.findUniqueOrThrow({ where: { id: asset.brandId }, select: { operatorId: true } });
  await audit({
    operatorId: brand.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "asset.archive",
    entity: "BrandAsset",
    entityId: asset.id,
  });
}

/** Édition manuelle des sections (manual-first) — même schéma de sortie que la forge. */
export async function updateAssetContent(
  assetId: string,
  content: AssetContent,
  actor: { id: string; email: string },
): Promise<void> {
  const validated = assetContentSchema.parse(content);
  const asset = await db.brandAsset.update({ where: { id: assetId }, data: { content: validated } });
  const brand = await db.brand.findUniqueOrThrow({ where: { id: asset.brandId }, select: { operatorId: true } });
  await audit({
    operatorId: brand.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "asset.edit",
    entity: "BrandAsset",
    entityId: asset.id,
  });
}
