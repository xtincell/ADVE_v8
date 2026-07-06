"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AssetKind, BrandAsset } from "@prisma/client";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { checkOneShotGate } from "@/server/billing/gates";
import { composeSection, generateOracleReport } from "@/server/oracle/generate";
import { activateAsset, archiveAsset, forgeAsset, isExposedKind, updateAssetContent } from "@/server/assets";
import { db } from "@/server/db";

export async function generateOracleAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/livrables");
  const brandId = String(formData.get("brandId") ?? "");
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return;
  // Gate one-shot ORACLE_FULL (god-mode et retainers passent) — refus structuré → paywall.
  const gate = await checkOneShotGate(user, "ORACLE_FULL", { brandId: brand.id });
  if (!gate.allowed) redirect(`/paiement?offre=ORACLE_FULL&marque=${brand.id}`);
  const report = await generateOracleReport(brand.id, { id: user.id, email: user.email });
  await db.notification.create({
    data: {
      userId: user.id,
      type: "ORACLE_READY",
      title: "Votre Oracle est prêt",
      body: `Rapport v${report.version} généré pour ${brand.name} — ${report.scoreAtGen}/200.`,
      href: `/cockpit/livrables/oracle/${report.id}`,
    },
  });
  redirect(`/cockpit/livrables/oracle/${report.id}`);
}

/** Régénération unitaire d'une section (cahier §5.1). */
export async function regenerateSectionAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/livrables");
  const reportId = String(formData.get("reportId") ?? "");
  const number = Number(formData.get("number") ?? 0);
  const report = await db.oracleReport.findUnique({ where: { id: reportId } });
  if (!report) return;
  const brand = await getOwnedBrand(user, report.brandId);
  if (!brand) return;
  await composeSection(reportId, number);
  revalidatePath(`/cockpit/livrables/oracle/${reportId}`);
}

// ─────────────────────────────── Forge & vault d'assets (cahier §5.2)

export interface ForgeFormState {
  error?: string;
}

/** Charge un asset en vérifiant que l'utilisateur possède la marque. */
async function ownedAsset(assetId: string): Promise<{ asset: BrandAsset; actor: { id: string; email: string } } | null> {
  const user = await requireUser("/cockpit/livrables");
  const asset = await db.brandAsset.findUnique({ where: { id: assetId } });
  if (!asset) return null;
  const brand = await getOwnedBrand(user, asset.brandId);
  if (!brand) return null;
  return { asset, actor: { id: user.id, email: user.email } };
}

export async function forgeAssetAction(_prev: ForgeFormState, formData: FormData): Promise<ForgeFormState> {
  const user = await requireUser("/cockpit/livrables");
  const brandId = String(formData.get("brandId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const objectif = String(formData.get("objectif") ?? "").trim();
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) return { error: "Marque introuvable ou accès refusé." };
  if (!isExposedKind(kind)) return { error: "Type de livrable inconnu." };
  if (kind === "CREATIVE_BRIEF" && objectif.length < 5) {
    return { error: "Le brief créatif exige un objectif (5 caractères min.)." };
  }
  const asset = await forgeAsset({
    brandId: brand.id,
    kind: kind as AssetKind,
    objectif: objectif || undefined,
    actor: { id: user.id, email: user.email },
  });
  redirect(`/cockpit/livrables/asset/${asset.id}`);
}

export async function activateAssetAction(formData: FormData): Promise<void> {
  const owned = await ownedAsset(String(formData.get("id") ?? ""));
  if (!owned) return;
  await activateAsset(owned.asset.id, owned.actor);
  revalidatePath("/cockpit/livrables");
  revalidatePath(`/cockpit/livrables/asset/${owned.asset.id}`);
}

export async function archiveAssetAction(formData: FormData): Promise<void> {
  const owned = await ownedAsset(String(formData.get("id") ?? ""));
  if (!owned) return;
  await archiveAsset(owned.asset.id, owned.actor);
  revalidatePath("/cockpit/livrables");
  revalidatePath(`/cockpit/livrables/asset/${owned.asset.id}`);
}

/** Reforge le même kind depuis les piliers actuels → nouvelle version DRAFT. */
export async function reforgeAssetAction(formData: FormData): Promise<void> {
  const owned = await ownedAsset(String(formData.get("id") ?? ""));
  if (!owned) return;
  const objectif = owned.asset.kind === "CREATIVE_BRIEF" ? owned.asset.title.replace(/^Brief créatif — /, "") : undefined;
  const fresh = await forgeAsset({
    brandId: owned.asset.brandId,
    kind: owned.asset.kind,
    objectif,
    actor: owned.actor,
  });
  redirect(`/cockpit/livrables/asset/${fresh.id}`);
}

/** Édition manuelle des textes de sections (manual-first). */
export async function updateAssetAction(formData: FormData): Promise<void> {
  const owned = await ownedAsset(String(formData.get("id") ?? ""));
  if (!owned) return;
  const sections: { title: string; text: string }[] = [];
  for (let i = 0; ; i++) {
    const title = formData.get(`title-${i}`);
    const text = formData.get(`text-${i}`);
    if (title === null || text === null) break;
    sections.push({ title: String(title), text: String(text).trim() || "—" });
  }
  if (sections.length === 0) return;
  await updateAssetContent(owned.asset.id, { sections }, owned.actor);
  revalidatePath(`/cockpit/livrables/asset/${owned.asset.id}`);
}
