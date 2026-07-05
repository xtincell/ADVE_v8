"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { checkOneShotGate } from "@/server/billing/gates";
import { composeSection, generateOracleReport } from "@/server/oracle/generate";
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
