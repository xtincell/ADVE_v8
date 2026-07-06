import "server-only";
import type { PaymentProvider, PlanTier } from "@prisma/client";
import { db } from "@/server/db";
import { env } from "@/env";
import { priceFor } from "@/server/billing/pricing";
import { manualAdapter } from "./manual";
import { mockAdapter } from "./mock";
import { cinetpayAdapter, momoAdapter, orangeAdapter, paypalAdapter, waveAdapter } from "./mobile-money";
import { stripeAdapter } from "./stripe";
import type { CheckoutResult, PaymentProviderAdapter, ProviderAvailability } from "./types";

// Routing provider par pays (cahier §6.1) : mobile money d'abord (le rail roi),
// carte ensuite, manuel WhatsApp toujours. Chaque provider expose son état réel.

const ADAPTERS: Record<PaymentProvider, PaymentProviderAdapter> = {
  STRIPE: stripeAdapter,
  WAVE: waveAdapter,
  MTN_MOMO: momoAdapter,
  ORANGE_MONEY: orangeAdapter,
  CINETPAY: cinetpayAdapter,
  PAYPAL: paypalAdapter,
  MANUAL_WHATSAPP: manualAdapter,
  MOCK: mockAdapter,
};

/** Rails mobile money pertinents par pays (donnée de routing, ajustable). */
const MOBILE_BY_COUNTRY: Record<string, PaymentProvider[]> = {
  SN: ["WAVE", "ORANGE_MONEY"],
  CI: ["WAVE", "ORANGE_MONEY", "MTN_MOMO"],
  BJ: ["MTN_MOMO"],
  BF: ["ORANGE_MONEY"],
  ML: ["ORANGE_MONEY"],
  NE: ["ORANGE_MONEY"],
  TG: ["MTN_MOMO"],
  CM: ["MTN_MOMO", "ORANGE_MONEY"],
  GA: ["MTN_MOMO"],
  CG: ["MTN_MOMO"],
  TD: ["MTN_MOMO"],
  GN: ["MTN_MOMO", "ORANGE_MONEY"],
  CD: ["ORANGE_MONEY"],
};

export interface ProviderOption {
  id: PaymentProvider;
  label: string;
  availability: ProviderAvailability;
}

export async function providerOptions(operatorId: string, countryCode: string | null | undefined): Promise<ProviderOption[]> {
  const ids: PaymentProvider[] = [
    ...(countryCode ? (MOBILE_BY_COUNTRY[countryCode.toUpperCase()] ?? []) : []),
    "CINETPAY",
    "STRIPE",
    "PAYPAL",
    "MANUAL_WHATSAPP",
    "MOCK",
  ];
  const seen = new Set<PaymentProvider>();
  const out: ProviderOption[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const adapter = ADAPTERS[id];
    const availability = await adapter.availability(operatorId);
    if (availability.status === "DISABLED") continue; // mock hors dev, etc.
    out.push({ id, label: adapter.label, availability });
  }
  return out;
}

export interface StartCheckoutInput {
  operatorId: string;
  provider: PaymentProvider;
  tier: PlanTier;
  countryCode: string | null | undefined;
  recurring: boolean;
  userId?: string | null;
  brandId?: string | null;
  intakeToken?: string | null;
  customerEmail?: string | null;
  returnPath: string; // chemin de retour (succès) — le paymentId y est ajouté
}

/** Crée le Payment PENDING puis délègue au provider. Montant nul → droit ouvert proprement. */
export async function startCheckout(input: StartCheckoutInput): Promise<{ result: CheckoutResult; paymentId: string }> {
  const price = await priceFor(input.operatorId, input.tier, input.countryCode);
  if (!price) throw new Error(`Aucun prix configuré pour ${input.tier}.`);
  if (price.onQuote) throw new Error("Cette offre est sur devis — contactez l'opérateur.");

  const intakeSession = input.intakeToken
    ? await db.intakeSession.findUnique({ where: { token: input.intakeToken } })
    : null;

  const payment = await db.payment.create({
    data: {
      operatorId: input.operatorId,
      userId: input.userId ?? null,
      brandId: input.brandId ?? null,
      intakeSessionId: intakeSession?.id ?? null,
      tier: input.tier,
      provider: input.provider,
      amount: price.amount,
      currency: price.currency,
      status: "PENDING",
    },
  });

  // Montant nul (ex. zone à 0) : bypass propre — aucun rail appelé (cahier §4.1).
  if (price.amount === 0) {
    const { settlePayment } = await import("./settle");
    await settlePayment({ paymentId: payment.id, providerRef: "montant-nul" });
    return { result: { kind: "granted" }, paymentId: payment.id };
  }

  const baseUrl = env().NEXT_PUBLIC_BASE_URL;
  const sep = input.returnPath.includes("?") ? "&" : "?";
  const result = await ADAPTERS[input.provider].createCheckout({
    operatorId: input.operatorId,
    tier: input.tier,
    amount: price.amount,
    currency: price.currency,
    recurring: input.recurring,
    paymentId: payment.id,
    userId: input.userId,
    brandId: input.brandId,
    intakeToken: input.intakeToken,
    customerEmail: input.customerEmail,
    successUrl: `${baseUrl}${input.returnPath}${sep}paiement=${payment.id}`,
    cancelUrl: `${baseUrl}${input.returnPath}${sep}paiement=annule`,
  });
  return { result, paymentId: payment.id };
}
