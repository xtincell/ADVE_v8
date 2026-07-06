"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
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

// ─────────────────────────────── Litiges (cahier §4.3/§6 — arbitrage manuel, pas d'escrow auto)

export interface DisputeFormState {
  ok?: boolean;
  error?: string;
}

const openDisputeSchema = z.object({
  missionId: z.string().min(1),
  reason: z.string().min(10).max(2000),
});

/** Ouvre un litige sur une mission (signalement reçu par l'opérateur — WhatsApp, email…). */
export async function openDisputeAction(_prev: DisputeFormState, formData: FormData): Promise<DisputeFormState> {
  const operator = await requireAdminWithMfa("/console/argent");
  const parsed = openDisputeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Mission et motif (10 caractères min.) requis." };
  const mission = await db.mission.findUnique({ where: { id: parsed.data.missionId } });
  if (!mission || mission.operatorId !== operator.operatorId) return { error: "Mission introuvable dans votre tenant." };
  const dispute = await db.dispute.create({
    data: {
      operatorId: mission.operatorId,
      missionId: mission.id,
      openedById: operator.id,
      reason: parsed.data.reason,
      status: "UNDER_REVIEW",
    },
  });
  await audit({
    operatorId: mission.operatorId,
    actorId: operator.id,
    actorEmail: operator.email,
    action: "dispute.open",
    entity: "Dispute",
    entityId: dispute.id,
    after: { missionId: mission.id },
  });
  revalidatePath("/console/argent");
  return { ok: true };
}

const resolveDisputeSchema = z.object({
  disputeId: z.string().min(1),
  outcome: z.enum(["RESOLVED_CLIENT", "RESOLVED_TALENT", "CANCELED"]),
  resolution: z.string().min(5).max(2000),
});

/** Arbitrage manuel : décision motivée, auditée — aucun mouvement d'argent automatique. */
export async function resolveDisputeAction(_prev: DisputeFormState, formData: FormData): Promise<DisputeFormState> {
  const operator = await requireAdminWithMfa("/console/argent");
  const parsed = resolveDisputeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Décision motivée requise (5 caractères min.)." };
  const dispute = await db.dispute.findUnique({ where: { id: parsed.data.disputeId } });
  if (!dispute || dispute.operatorId !== operator.operatorId) return { error: "Litige introuvable." };
  await db.dispute.update({
    where: { id: dispute.id },
    data: {
      status: parsed.data.outcome,
      resolution: parsed.data.resolution,
      resolvedById: operator.id,
      resolvedAt: new Date(),
    },
  });
  await audit({
    operatorId: dispute.operatorId,
    actorId: operator.id,
    actorEmail: operator.email,
    action: "dispute.resolve",
    entity: "Dispute",
    entityId: dispute.id,
    after: { status: parsed.data.outcome },
  });
  revalidatePath("/console/argent");
  return { ok: true };
}
