import type { PaymentProvider, PlanTier } from "@prisma/client";

// Contrat commun des rails de paiement (cahier §6.1).
// Dégradation par provider (§3.5.4) : sans credentials, un connecteur répond
// DEFERRED_AWAITING_CREDENTIALS — il n'échoue jamais en silence, ne simule jamais un succès.

export type ProviderAvailability =
  | { status: "CONFIGURED" }
  | { status: "DEFERRED_AWAITING_CREDENTIALS"; missing: string[] }
  | { status: "DISABLED"; reason: string };

export interface CheckoutInput {
  operatorId: string;
  tier: PlanTier;
  amount: number; // FCFA entiers ou centimes EUR
  currency: string;
  /** Récurrent (abonnement mensuel) ou one-shot. */
  recurring: boolean;
  /** Référence interne du Payment créé en amont (PENDING). */
  paymentId: string;
  userId?: string | null;
  brandId?: string | null;
  intakeToken?: string | null;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export type CheckoutResult =
  | { kind: "redirect"; url: string }
  | { kind: "manual"; waLink: string; reference: string; instructions: string }
  | { kind: "deferred"; missing: string[] }
  | { kind: "granted" }; // montant nul / mock : droit ouvert immédiatement

export interface PaymentProviderAdapter {
  id: PaymentProvider;
  label: string;
  availability(operatorId: string): Promise<ProviderAvailability>;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
