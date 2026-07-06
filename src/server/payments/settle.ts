import "server-only";
import type { PlanTier, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { env } from "@/env";
import { getSetting } from "@/server/settings";
import { notify } from "@/server/notifications";
import { sendEmail } from "@/server/notifications/email";

// Règlement d'un paiement confirmé — LE point de bascule des droits.
// Idempotent (un paiement déjà SUCCEEDED ne rejoue rien). Un paiement n'arrive
// ici QUE confirmé : webhook vérifié par signature, statut re-lu chez le
// provider, ou validation humaine (manuel WhatsApp).

const RECURRING_TIERS: PlanTier[] = ["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"];

export interface SettleInput {
  paymentId: string;
  providerRef?: string;
  /** Fin de période fournie par le provider (Stripe) — sinon durée manuelle (30 j). */
  periodEnd?: Date;
  validatedById?: string | null;
}

export async function settlePayment(input: SettleInput): Promise<{ alreadySettled: boolean }> {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
  if (payment.status === "SUCCEEDED") return { alreadySettled: true };

  const durationDays = (await getSetting<number>(payment.operatorId, "manual_payment.duration_days")) ?? 30;
  const periodEnd = input.periodEnd ?? new Date(Date.now() + durationDays * 86_400_000);

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        providerRef: input.providerRef ?? payment.providerRef,
        validatedById: input.validatedById ?? null,
        validatedAt: new Date(),
      },
    });

    // Activation des droits récurrents
    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
          validatedById: input.validatedById ?? null,
          validatedAt: new Date(),
        },
      });
    } else if (payment.tier && RECURRING_TIERS.includes(payment.tier) && payment.userId) {
      const sub = await tx.subscription.create({
        data: {
          operatorId: payment.operatorId,
          userId: payment.userId,
          brandId: payment.brandId,
          tier: payment.tier,
          status: "ACTIVE",
          provider: payment.provider,
          providerRef: input.providerRef,
          currentPeriodEnd: periodEnd,
          validatedById: input.validatedById ?? null,
          validatedAt: new Date(),
        },
      });
      await tx.payment.update({ where: { id: payment.id }, data: { subscriptionId: sub.id } });
    }

    // Facture
    const count = await tx.invoice.count({ where: { operatorId: payment.operatorId } });
    const number = `FUS-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
    const user = payment.userId ? await tx.user.findUnique({ where: { id: payment.userId } }) : null;
    const intake = payment.intakeSessionId
      ? await tx.intakeSession.findUnique({ where: { id: payment.intakeSessionId } })
      : null;
    await tx.invoice.create({
      data: {
        number,
        operatorId: payment.operatorId,
        paymentId: payment.id,
        toName: user?.name ?? intake?.brandName ?? "Client",
        toEmail: user?.email ?? intake?.email ?? "",
        lines: [{ label: `La Fusée — ${payment.tier ?? "paiement"}`, amount: payment.amount }] as Prisma.InputJsonValue,
        amount: payment.amount,
        currency: payment.currency,
      },
    });

    await audit(
      {
        operatorId: payment.operatorId,
        actorId: input.validatedById ?? null,
        action: "payment.settle",
        entity: "Payment",
        entityId: payment.id,
        before: { status: payment.status },
        after: { status: "SUCCEEDED", providerRef: input.providerRef ?? payment.providerRef, periodEnd: periodEnd.toISOString() },
      },
      tx,
    );
  });

  // Notification temps réel + email — après commit (le droit est acquis).
  if (payment.userId) {
    const [user, invoice] = await Promise.all([
      db.user.findUnique({ where: { id: payment.userId } }),
      db.invoice.findUnique({ where: { paymentId: payment.id } }),
    ]);
    const recurring = !!payment.subscriptionId || (payment.tier != null && RECURRING_TIERS.includes(payment.tier));
    await notify({
      userId: payment.userId,
      type: recurring ? "SUBSCRIPTION_ACTIVATED" : "PAYMENT_RECEIVED",
      title: "Paiement confirmé",
      body: `Votre paiement ${payment.tier ?? ""} est confirmé${invoice ? ` — facture ${invoice.number}` : ""}.`,
      href: "/cockpit/abonnement",
    });
    if (user) {
      await sendEmail(payment.operatorId, "paiement_confirme", user.email, {
        name: user.name ?? "",
        tier: payment.tier ?? "paiement",
        amount: `${payment.amount} ${payment.currency}`,
        invoice: invoice?.number ?? "—",
        url: env().NEXT_PUBLIC_BASE_URL,
      });
    }
  }

  return { alreadySettled: false };
}

/** Rejet d'un paiement manuel (fonds non reçus) — trace + notification, aucun droit. */
export async function rejectPayment(paymentId: string, actorId: string, reason: string): Promise<void> {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "PENDING") throw new Error("Seul un paiement en attente peut être rejeté.");
  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED", metadata: { rejectReason: reason } as Prisma.InputJsonValue } });
    if (payment.subscriptionId) {
      await tx.subscription.update({ where: { id: payment.subscriptionId }, data: { status: "CANCELED", canceledAt: new Date() } });
    }
    if (payment.userId) {
      await tx.notification.create({
        data: {
          userId: payment.userId,
          type: "SYSTEM",
          title: "Paiement non validé",
          body: `Votre paiement n'a pas pu être confirmé : ${reason}`,
          href: "/cockpit/abonnement",
        },
      });
    }
    await audit(
      { operatorId: payment.operatorId, actorId, action: "payment.reject", entity: "Payment", entityId: paymentId, after: { reason } },
      tx,
    );
  });
}
