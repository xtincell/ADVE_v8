import type { BrandTier, Certainty, PillarKind } from "@prisma/client";
import { PILLARS, pillarDef, type FieldValue, type PillarFields } from "@/server/brands/pillar-config";

// ═══════════════════════════════════════════════════════════════════
// Scoring 100 % DÉTERMINISTE (cahier §3.3) — aucun LLM dans ce chemin.
// Chaque pilier est scoré /25 sur la complétude/qualité structurelle
// de ses champs (pondérations fixes). Composite /200 = Σ des 8 piliers.
// ═══════════════════════════════════════════════════════════════════

export const PILLAR_MAX = 25;
export const COMPOSITE_MAX = 200;

/** Multiplicateur de certitude : une donnée inférée non validée vaut moins qu'une donnée déclarée. */
const CERTAINTY_FACTOR: Record<Certainty, number> = {
  INFERRED: 0.6,
  DECLARED: 0.9,
  OFFICIAL: 1.0,
};

/** Complétude structurelle d'une valeur (0..1) — seuils fixes, indépendants du contenu sémantique. */
export function structuralCompleteness(value: FieldValue | null | undefined): number {
  if (value == null) return 0;
  if (Array.isArray(value)) {
    const items = value.map((v) => v.trim()).filter(Boolean);
    if (items.length === 0) return 0;
    if (items.length === 1) return 0.45;
    if (items.length === 2) return 0.7;
    return 1;
  }
  const len = value.trim().length;
  if (len === 0) return 0;
  if (len < 30) return 0.35;
  if (len < 120) return 0.7;
  return 1;
}

/** Score d'un pilier /25 à partir de ses champs. */
export function scorePillar(kind: PillarKind, fields: PillarFields): number {
  const def = pillarDef(kind);
  let weighted = 0;
  let totalWeight = 0;
  for (const f of def.fields) {
    totalWeight += f.weight;
    const state = fields[f.key];
    if (!state) continue;
    weighted += f.weight * structuralCompleteness(state.value) * CERTAINTY_FACTOR[state.certainty];
  }
  if (totalWeight === 0) return 0;
  return Math.round(PILLAR_MAX * (weighted / totalWeight));
}

/** Composite /200 = somme des 8 piliers. Les piliers absents comptent 0. */
export function compositeScore(pillarScores: Partial<Record<PillarKind, number>>): number {
  return PILLARS.reduce((sum, p) => sum + (pillarScores[p.kind] ?? 0), 0);
}

// ── Piliers dérivés (RTIS) — le score mesure l'état de l'appareil stratégique,
// pas le volume de contenu dérivé (sinon une marque trouée scorerait mieux au
// pilier Risque qu'une marque saine — incitation inversée).
// Score dérivé = 25 × (complétude du socle ADVE) × (fraîcheur du recalcul).

/** Ratio 0..1 : somme des 4 scores ADVE rapportée à 100. */
export function adveCompletenessRatio(pillarScores: Partial<Record<PillarKind, number>>): number {
  const sum =
    (pillarScores.AUTHENTICITE ?? 0) +
    (pillarScores.DISTINCTION ?? 0) +
    (pillarScores.VALEUR ?? 0) +
    (pillarScores.ENGAGEMENT ?? 0);
  return Math.min(1, sum / 100);
}

/** Fraîcheur : jamais recalculé = 0 ; périmé (stale) = 0.5 ; frais = 1. */
export function derivedFreshness(pillar: { version: number; stale: boolean }): number {
  if (pillar.version === 0) return 0;
  return pillar.stale ? 0.5 : 1;
}

export function scoreDerivedPillar(adveRatio: number, freshness: number): number {
  return Math.round(PILLAR_MAX * adveRatio * freshness);
}

/** Palier de marque (bornes cahier §3.3). */
export function tierForScore(score: number): BrandTier {
  if (score <= 40) return "LATENT";
  if (score <= 80) return "FRAGILE";
  if (score <= 120) return "ORDINAIRE";
  if (score <= 160) return "FORTE";
  if (score <= 180) return "CULTE";
  return "ICONE";
}

export const TIER_LABELS: Record<BrandTier, string> = {
  LATENT: "Latente",
  FRAGILE: "Fragile",
  ORDINAIRE: "Ordinaire",
  FORTE: "Forte",
  CULTE: "Culte",
  ICONE: "Icône",
};

export const TIER_BOUNDS: Record<BrandTier, [number, number]> = {
  LATENT: [0, 40],
  FRAGILE: [41, 80],
  ORDINAIRE: [81, 120],
  FORTE: [121, 160],
  CULTE: [161, 180],
  ICONE: [181, 200],
};

