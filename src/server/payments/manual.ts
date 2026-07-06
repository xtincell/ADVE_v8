import "server-only";
import { db } from "@/server/db";
import { env } from "@/env";
import { getSetting } from "@/server/settings";
import type { CheckoutInput, CheckoutResult, PaymentProviderAdapter, ProviderAvailability } from "./types";

// Paiement manuel WhatsApp (cahier §6.1) — le rail roi du marché local sans CB.
// Crée un état `pending` qui n'ouvre AUCUN droit ; l'activation passe par la
// file de validation de la Console (un humain confirme la réception des fonds).

async function whatsappNumber(operatorId: string): Promise<string | null> {
  const fromSettings = await getSetting<string>(operatorId, "manual_payment.whatsapp_number");
  return fromSettings ?? env().MANUAL_PAYMENT_WHATSAPP_NUMBER ?? null;
}

async function availability(operatorId: string): Promise<ProviderAvailability> {
  const number = await whatsappNumber(operatorId);
  return number
    ? { status: "CONFIGURED" }
    : { status: "DEFERRED_AWAITING_CREDENTIALS", missing: ["MANUAL_PAYMENT_WHATSAPP_NUMBER"] };
}

async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const number = await whatsappNumber(input.operatorId);
  if (!number) return { kind: "deferred", missing: ["MANUAL_PAYMENT_WHATSAPP_NUMBER"] };

  const payment = await db.payment.findUniqueOrThrow({ where: { id: input.paymentId } });
  const reference = `FUS-${payment.id.slice(-8).toUpperCase()}`;

  // Abonnement : un enregistrement PENDING_MANUAL est créé — zéro droit ouvert (cahier §6.1).
  if (input.recurring && input.userId) {
    const sub = await db.subscription.create({
      data: {
        operatorId: input.operatorId,
        userId: input.userId,
        brandId: input.brandId ?? null,
        tier: input.tier,
        status: "PENDING_MANUAL",
        provider: "MANUAL_WHATSAPP",
      },
    });
    await db.payment.update({ where: { id: payment.id }, data: { subscriptionId: sub.id, providerRef: reference } });
  } else {
    await db.payment.update({ where: { id: payment.id }, data: { providerRef: reference } });
  }

  const message = encodeURIComponent(
    `Bonjour UPgraders — je confirme mon paiement « ${input.tier} » (référence ${reference}, montant ${input.amount} ${input.currency}). Voici ma preuve de transfert :`,
  );
  return {
    kind: "manual",
    reference,
    waLink: `https://wa.me/${number.replace(/[^0-9]/g, "")}?text=${message}`,
    instructions:
      "Effectuez le transfert (Wave, Orange Money, MTN MoMo ou dépôt) puis envoyez la preuve sur WhatsApp avec votre référence. Un opérateur valide en journée — votre accès s'ouvre à la validation, pour 30 jours.",
  };
}

export const manualAdapter: PaymentProviderAdapter = {
  id: "MANUAL_WHATSAPP",
  label: "Paiement manuel (WhatsApp)",
  availability,
  createCheckout,
};
