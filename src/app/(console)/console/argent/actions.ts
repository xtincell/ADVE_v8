"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { rejectPayment, settlePayment } from "@/server/payments/settle";

// File de validation des paiements manuels WhatsApp (cahier §4.3 / §6.1).
// La validation est L'acte qui ouvre les droits — audité, jamais automatique.

export async function validateManualPaymentAction(formData: FormData): Promise<void> {
  const operator = await requireAdminWithMfa("/console/argent");
  const paymentId = String(formData.get("paymentId") ?? "");
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.operatorId !== operator.operatorId || payment.provider !== "MANUAL_WHATSAPP") return;
  await settlePayment({ paymentId, validatedById: operator.id });
  revalidatePath("/console/argent");
}

export async function rejectManualPaymentAction(formData: FormData): Promise<void> {
  const operator = await requireAdminWithMfa("/console/argent");
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "Fonds non reçus";
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.operatorId !== operator.operatorId || payment.provider !== "MANUAL_WHATSAPP") return;
  await rejectPayment(paymentId, operator.id, reason);
  revalidatePath("/console/argent");
}
