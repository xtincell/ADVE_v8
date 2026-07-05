import type { Brand, BrandAsset, CommunityMember, MarketSignal, PillarKind } from "@prisma/client";
import { pillarDef, type FieldValue, type PillarFields } from "@/server/brands/pillar-config";
import { structuralCompleteness } from "@/server/scoring/score";

// Contexte de composition Oracle : le snapshot GELÉ des piliers au moment de la
// génération (« le rapport ne dit que ce que la marque a déclaré ») + les données
// réelles annexes (communauté, signaux, assets). Aucune invention possible :
// toutes les lectures passent par ces accesseurs.

export type FrozenPillars = Partial<Record<PillarKind, PillarFields>>;

export interface OracleContext {
  brand: Pick<Brand, "id" | "name" | "sector" | "country" | "city" | "score" | "tier">;
  pillars: FrozenPillars;
  pillarScores: Record<PillarKind, number>;
  community: Pick<CommunityMember, "name" | "level" | "channel" | "note">[];
  signals: Pick<MarketSignal, "title" | "source" | "summary" | "publishedAt">[];
  assets: Pick<BrandAsset, "kind" | "title" | "status">[];
  generatedAt: Date;
}

/** Valeur texte d'un champ (listes jointes) — chaîne vide si absent. */
export function text(ctx: OracleContext, kind: PillarKind, key: string): string {
  const state = ctx.pillars[kind]?.[key];
  if (!state) return "";
  return Array.isArray(state.value) ? state.value.join(" · ") : state.value.trim();
}

/** Valeur liste d'un champ — [] si absent. */
export function items(ctx: OracleContext, kind: PillarKind, key: string): string[] {
  const state = ctx.pillars[kind]?.[key];
  if (!state) return [];
  if (Array.isArray(state.value)) return state.value.filter(Boolean);
  const v = state.value.trim();
  return v ? v.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

export function has(ctx: OracleContext, kind: PillarKind, key: string): boolean {
  const state = ctx.pillars[kind]?.[key];
  return !!state && structuralCompleteness(state.value) > 0;
}

export function completenessOf(ctx: OracleContext, kind: PillarKind, key: string): number {
  const state = ctx.pillars[kind]?.[key];
  return state ? structuralCompleteness(state.value) : 0;
}

export function fieldLabel(kind: PillarKind, key: string): string {
  return pillarDef(kind).fields.find((f) => f.key === key)?.label ?? key;
}

/** Champs déclarés forts (complétude 1) — les « forces » factuelles du socle. */
export function strongFields(ctx: OracleContext): { kind: PillarKind; key: string; label: string }[] {
  const out: { kind: PillarKind; key: string; label: string }[] = [];
  for (const kind of ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] as PillarKind[]) {
    for (const f of pillarDef(kind).fields) {
      if (completenessOf(ctx, kind, f.key) >= 1) out.push({ kind, key: f.key, label: f.label });
    }
  }
  return out;
}

export function superfans(ctx: OracleContext) {
  return ctx.community.filter((m) => m.level === "AMBASSADEUR" || m.level === "EVANGELISTE");
}

export function devotionDistribution(ctx: OracleContext): Record<string, number> {
  const dist: Record<string, number> = {
    SPECTATEUR: 0,
    INTERESSE: 0,
    PARTICIPANT: 0,
    ENGAGE: 0,
    AMBASSADEUR: 0,
    EVANGELISTE: 0,
  };
  for (const m of ctx.community) dist[m.level] = (dist[m.level] ?? 0) + 1;
  return dist;
}

/** Valeur brute (pour geler dans le rapport). */
export function raw(ctx: OracleContext, kind: PillarKind, key: string): FieldValue | null {
  return ctx.pillars[kind]?.[key]?.value ?? null;
}
