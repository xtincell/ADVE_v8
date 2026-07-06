import "server-only";
import type { PlanTier } from "@prisma/client";
import { db } from "@/server/db";
import type { SessionUser } from "@/server/auth/guards";

// Gates payants (cahier §6.2) : les fonctions premium vérifient un abonnement
// active|trialing sur les tiers récurrents. Refus STRUCTURÉ (TIER_GATE_DENIED
// + upgrade path), jamais une exception brute. One-shots exclus des gates.
// God-mode bypass.

export const RECURRING_TIERS: PlanTier[] = ["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"];

export type GateResult =
  | { allowed: true; via: "god_mode" | "staff" | "subscription" | "one_shot" }
  | {
      allowed: false;
      code: "TIER_GATE_DENIED";
      reason: string;
      requiredTiers: PlanTier[];
      upgradePath: string;
      pending: boolean; // un paiement manuel attend validation
    };

/** Gate récurrent : abonnement actif/en essai sur l'un des tiers requis. */
export async function checkSubscriptionGate(
  user: SessionUser,
  requiredTiers: PlanTier[] = RECURRING_TIERS,
): Promise<GateResult> {
  if (user.godMode) return { allowed: true, via: "god_mode" };
  // Le staff opère pour ses clients : pas de gate interne (la Console n'est jamais vendue).
  if (user.roles.includes("ADMIN") || user.roles.includes("OPERATOR")) return { allowed: true, via: "staff" };
  const sub = await db.subscription.findFirst({
    where: {
      userId: user.id,
      tier: { in: requiredTiers },
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: new Date() } }],
    },
  });
  if (sub) return { allowed: true, via: "subscription" };
  const pending = await db.subscription.findFirst({
    where: { userId: user.id, tier: { in: requiredTiers }, status: "PENDING_MANUAL" },
  });
  return {
    allowed: false,
    code: "TIER_GATE_DENIED",
    reason: pending
      ? "Votre paiement est en attente de validation par un opérateur."
      : "Cette fonction fait partie de l'abonnement Cockpit.",
    requiredTiers,
    upgradePath: "/cockpit/abonnement",
    pending: !!pending,
  };
}

/** Gate one-shot : un achat SUCCEEDED du tier pour cette marque (ou cet intake). */
export async function checkOneShotGate(
  user: SessionUser | null,
  tier: PlanTier,
  scope: { brandId?: string; intakeSessionId?: string },
): Promise<GateResult> {
  if (user?.godMode) return { allowed: true, via: "god_mode" };
  if (user && (user.roles.includes("ADMIN") || user.roles.includes("OPERATOR"))) return { allowed: true, via: "staff" };
  const paid = await db.payment.findFirst({
    where: {
      tier,
      status: "SUCCEEDED",
      OR: [
        scope.brandId ? { brandId: scope.brandId } : undefined,
        scope.intakeSessionId ? { intakeSessionId: scope.intakeSessionId } : undefined,
        user ? { userId: user.id, brandId: scope.brandId ?? undefined } : undefined,
      ].filter(Boolean) as never,
    },
  });
  if (paid) return { allowed: true, via: "one_shot" };
  // Les retainers incluent l'Oracle (accompagnement) — pas le Cockpit seul.
  if (user && tier === "ORACLE_FULL") {
    const retainer = await db.subscription.findFirst({
      where: {
        userId: user.id,
        tier: { in: ["RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"] },
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });
    if (retainer) return { allowed: true, via: "subscription" };
  }
  const pending = await db.payment.findFirst({
    where: {
      tier,
      status: "PENDING",
      provider: "MANUAL_WHATSAPP",
      OR: [
        scope.brandId ? { brandId: scope.brandId } : undefined,
        scope.intakeSessionId ? { intakeSessionId: scope.intakeSessionId } : undefined,
      ].filter(Boolean) as never,
    },
  });
  return {
    allowed: false,
    code: "TIER_GATE_DENIED",
    reason: pending
      ? "Votre paiement est en attente de validation par un opérateur."
      : "Ce livrable est un achat one-shot.",
    requiredTiers: [tier],
    upgradePath: scope.intakeSessionId ? "" : `/paiement?offre=${tier}${scope.brandId ? `&marque=${scope.brandId}` : ""}`,
    pending: !!pending,
  };
}
