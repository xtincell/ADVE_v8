import "server-only";
import { settlePayment } from "./settle";
import type { CheckoutInput, CheckoutResult, PaymentProviderAdapter, ProviderAvailability } from "./types";

// Provider MOCK — dev/tests UNIQUEMENT (cahier §6.1) : interdit en production,
// échec bruyant. Sert aux E2E « paiement test » sans clé Stripe.

function enabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.PAYMENT_MOCK_ENABLED === "true";
}

export const mockAdapter: PaymentProviderAdapter = {
  id: "MOCK",
  label: "Paiement de test (mock)",
  availability: async (): Promise<ProviderAvailability> => {
    if (process.env.NODE_ENV === "production") return { status: "DISABLED", reason: "Mock interdit en production." };
    if (!enabled()) return { status: "DISABLED", reason: "PAYMENT_MOCK_ENABLED non activé." };
    return { status: "CONFIGURED" };
  },
  createCheckout: async (input: CheckoutInput): Promise<CheckoutResult> => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("PAIEMENT MOCK APPELÉ EN PRODUCTION — interdit (cahier §6.1). Configurez un vrai rail.");
    }
    if (!enabled()) throw new Error("Provider mock désactivé (PAYMENT_MOCK_ENABLED).");
    await settlePayment({ paymentId: input.paymentId, providerRef: `mock_${input.paymentId}` });
    return { kind: "granted" };
  },
};
