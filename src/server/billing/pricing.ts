import type { PlanTier } from "@prisma/client";
import { db } from "@/server/db";

// Grille tarifaire localisée (cahier §6.2) : données seedées, modifiables en Console.
// Jamais de prix en dur dans le code. FCFA d'abord ; fallback par proximité économique.

export interface LocalizedPrice {
  tier: PlanTier;
  amount: number; // FCFA entiers, ou centimes EUR
  currency: string;
  zone: string;
  formatted: string;
  /** amount === 0 sur un tier payant = « sur devis » */
  onQuote: boolean;
}

const ZONE_FALLBACK = "UEMOA";

export async function zoneForCountry(countryCode: string | null | undefined): Promise<string> {
  if (!countryCode) return ZONE_FALLBACK;
  const country = await db.country.findUnique({ where: { code: countryCode.toUpperCase() } });
  return country?.zone ?? "OTHER";
}

export function formatMoney(amount: number, currency: string): string {
  if (currency === "EUR") {
    const euros = amount / 100;
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: euros % 1 === 0 ? 0 : 2 }).format(euros)} €`;
  }
  // XOF/XAF : pas de centimes, affichage FCFA
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

export async function priceFor(
  operatorId: string,
  tier: PlanTier,
  countryCode: string | null | undefined,
): Promise<LocalizedPrice | null> {
  const zone = await zoneForCountry(countryCode);
  const rule =
    (await db.priceRule.findUnique({ where: { operatorId_tier_zone: { operatorId, tier, zone } } })) ??
    (await db.priceRule.findUnique({
      where: { operatorId_tier_zone: { operatorId, tier, zone: ZONE_FALLBACK } },
    }));
  if (!rule || !rule.active) return null;
  const onQuote = rule.amount === 0 && tier !== "INTAKE_FREE";
  return {
    tier,
    amount: rule.amount,
    currency: rule.currency,
    zone: rule.zone,
    formatted: onQuote ? "Sur devis" : formatMoney(rule.amount, rule.currency),
    onQuote,
  };
}

export async function priceGridForZone(operatorId: string, zone: string): Promise<LocalizedPrice[]> {
  const rules = await db.priceRule.findMany({ where: { operatorId, zone, active: true } });
  return rules.map((r) => ({
    tier: r.tier,
    amount: r.amount,
    currency: r.currency,
    zone: r.zone,
    formatted: r.amount === 0 && r.tier !== "INTAKE_FREE" ? "Sur devis" : formatMoney(r.amount, r.currency),
    onQuote: r.amount === 0 && r.tier !== "INTAKE_FREE",
  }));
}

export const TIER_NAMES: Record<PlanTier, string> = {
  INTAKE_FREE: "Diagnostic gratuit",
  INTAKE_PDF: "Rapport PDF",
  ORACLE_FULL: "Oracle — rapport complet",
  COCKPIT_MONTHLY: "Cockpit",
  RETAINER_BASE: "Retainer Base",
  RETAINER_PRO: "Retainer Pro",
  RETAINER_ENTERPRISE: "Retainer Enterprise",
};
