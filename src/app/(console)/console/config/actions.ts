"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { setSetting } from "@/server/settings";

export interface ConfigFormState {
  ok?: boolean;
  error?: string;
}

export async function updatePriceAction(_prev: ConfigFormState, formData: FormData): Promise<ConfigFormState> {
  const actor = await requireAdminWithMfa("/console/config");
  if (!actor.operatorId) return { error: "Compte sans tenant." };

  const updates: { id: string; amount: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("amount:") || typeof value !== "string") continue;
    const amount = Number(value.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) return { error: "Montant invalide." };
    updates.push({ id: key.slice("amount:".length), amount });
  }

  let changed = 0;
  for (const u of updates) {
    const rule = await db.priceRule.findUnique({ where: { id: u.id } });
    if (!rule || rule.operatorId !== actor.operatorId || rule.amount === u.amount) continue;
    await db.priceRule.update({ where: { id: u.id }, data: { amount: u.amount } });
    await audit({
      operatorId: actor.operatorId,
      actorId: actor.id,
      actorEmail: actor.email,
      action: "price.update",
      entity: "PriceRule",
      entityId: u.id,
      before: { amount: rule.amount },
      after: { amount: u.amount, tier: rule.tier, zone: rule.zone },
    });
    changed++;
  }
  revalidatePath("/console/config");
  revalidatePath("/tarifs");
  return { ok: true, ...(changed === 0 ? {} : {}) };
}

export async function updateSettingsAction(_prev: ConfigFormState, formData: FormData): Promise<ConfigFormState> {
  const actor = await requireAdminWithMfa("/console/config");
  if (!actor.operatorId) return { error: "Compte sans tenant." };

  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/[^0-9]/g, "");
  const duration = Number(formData.get("duration") ?? 30);
  if (!Number.isFinite(duration) || duration < 1 || duration > 366) return { error: "Durée invalide (1–366 jours)." };

  const rates: Record<string, number> = {};
  for (const tier of ["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"]) {
    const v = Number(formData.get(`rate:${tier}`));
    if (!Number.isFinite(v) || v < 0 || v > 0.9) return { error: `Taux invalide pour ${tier} (0–0,9).` };
    rates[tier] = v;
  }

  await setSetting(actor.operatorId, "manual_payment.whatsapp_number", whatsapp || null);
  await setSetting(actor.operatorId, "manual_payment.duration_days", duration);
  await setSetting(actor.operatorId, "commission.rates", rates);
  await audit({
    operatorId: actor.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "settings.update",
    entity: "Setting",
    entityId: "operator",
    after: { whatsapp: whatsapp ? "défini" : "hérité env", duration, rates },
  });
  revalidatePath("/console/config");
  return { ok: true };
}
