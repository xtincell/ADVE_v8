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

/**
 * Encaissement d'un relevé MCP gelé : même règle que le manuel WhatsApp — après
 * réception EFFECTIVE des fonds. Le règlement passe par le rail Payment existant
 * (facture émise, notification, audit), puis le relevé pointe son paiement.
 */
export async function settleMcpStatementAction(formData: FormData): Promise<void> {
  const operator = await requireAdminWithMfa("/console/argent");
  const statementId = String(formData.get("statementId") ?? "");
  const statement = await db.mcpStatement.findUnique({
    where: { id: statementId },
    include: { key: true },
  });
  if (!statement || statement.operatorId !== operator.operatorId || statement.paymentId) return;
  const period = statement.periodStart.toISOString().slice(0, 7);
  const payment = await db.payment.create({
    data: {
      operatorId: statement.operatorId,
      userId: statement.key.userId,
      provider: "MANUAL_WHATSAPP",
      amount: statement.amount,
      currency: statement.currency,
      status: "PENDING",
      metadata: { mcpStatementId: statement.id, period },
    },
  });
  await settlePayment({
    paymentId: payment.id,
    validatedById: operator.id,
    invoiceLabel: `La Fusée — API MCP ${period} (${statement.callCount} appels, clé ${statement.key.prefix}…)`,
  });
  await db.mcpStatement.update({ where: { id: statement.id }, data: { paymentId: payment.id } });
  revalidatePath("/console/argent");
  revalidatePath("/cockpit/reglages");
}
