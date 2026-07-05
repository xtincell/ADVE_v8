import "server-only";
import { settlePayment } from "./settle";
import type { CheckoutInput, CheckoutResult, PaymentProviderAdapter, ProviderAvailability } from "./types";

// Provider MOCK — dev/tests UNIQUEMENT (cahier §6.1) : interdit en production,
// échec bruyant. Sert aux E2E « paiement test » sans clé Stripe.
// Opt-in explicite par PAYMENT_MOCK_ENABLED ; la CI exécute un build de
// production (NODE_ENV=production) sur localhost — le verrou anti-production
// porte donc sur l'URL publique : un déploiement réel n'est jamais sur localhost.

function isLocalhost(): boolean {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return base.includes("://localhost") || base.includes("://127.0.0.1");
}

function forbiddenInProd(): boolean {
  return process.env.NODE_ENV === "production" && !isLocalhost();
}

function enabled(): boolean {
  return process.env.PAYMENT_MOCK_ENABLED === "true" && !forbiddenInProd();
}

export const mockAdapter: PaymentProviderAdapter = {
  id: "MOCK",
  label: "Paiement de test (mock)",
  availability: async (): Promise<ProviderAvailability> => {
    if (forbiddenInProd()) return { status: "DISABLED", reason: "Mock interdit en production." };
    if (!enabled()) return { status: "DISABLED", reason: "PAYMENT_MOCK_ENABLED non activé." };
    return { status: "CONFIGURED" };
  },
  createCheckout: async (input: CheckoutInput): Promise<CheckoutResult> => {
    if (forbiddenInProd()) {
      throw new Error("PAIEMENT MOCK APPELÉ EN PRODUCTION — interdit (cahier §6.1). Configurez un vrai rail.");
    }
    if (!enabled()) throw new Error("Provider mock désactivé (PAYMENT_MOCK_ENABLED).");
    await settlePayment({ paymentId: input.paymentId, providerRef: `mock_${input.paymentId}` });
    return { kind: "granted" };
  },
};
