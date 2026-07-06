import "server-only";
import Stripe from "stripe";
import { env } from "@/env";
import type { CheckoutInput, CheckoutResult, PaymentProviderAdapter, ProviderAvailability } from "./types";

// Stripe (cahier §6.1) : cartes, abonnements récurrents + one-shots.
// Secret SYSTÈME en env (pas dans le vault opérateur). Test mode en dev.

let client: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

async function availability(): Promise<ProviderAvailability> {
  const missing: string[] = [];
  if (!env().STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!env().STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  return missing.length > 0 ? { status: "DEFERRED_AWAITING_CREDENTIALS", missing } : { status: "CONFIGURED" };
}

async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const stripe = stripeClient();
  if (!stripe) return { kind: "deferred", missing: ["STRIPE_SECRET_KEY"] };

  // XOF/XAF sont des devises zéro-décimale chez Stripe : montant tel quel.
  const session = await stripe.checkout.sessions.create({
    mode: input.recurring ? "subscription" : "payment",
    customer_email: input.customerEmail ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amount,
          product_data: { name: `La Fusée — ${input.tier}` },
          ...(input.recurring ? { recurring: { interval: "month" as const } } : {}),
        },
      },
    ],
    metadata: {
      paymentId: input.paymentId,
      tier: input.tier,
      userId: input.userId ?? "",
      brandId: input.brandId ?? "",
      intakeToken: input.intakeToken ?? "",
      operatorId: input.operatorId,
    },
    ...(input.recurring
      ? { subscription_data: { metadata: { paymentId: input.paymentId, tier: input.tier, userId: input.userId ?? "", operatorId: input.operatorId } } }
      : {}),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) throw new Error("Stripe n'a pas retourné d'URL de paiement.");
  return { kind: "redirect", url: session.url };
}

export const stripeAdapter: PaymentProviderAdapter = {
  id: "STRIPE",
  label: "Carte bancaire",
  availability,
  createCheckout,
};
