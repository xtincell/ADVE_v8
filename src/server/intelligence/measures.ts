import type { DevotionLevel } from "@prisma/client";
import { structuralCompleteness } from "@/server/scoring/score";
import type { PillarFields } from "@/server/brands/pillar-config";

// Mesures d'audience (cahier §3.4, §8) — heuristiques honnêtes et paramétriques :
// chaque valeur provient de données réelles ; sans données, l'état est
// INSUFFICIENT_DATA (jamais une valeur fabriquée). Fonctions pures, testées.

export type Devotion = Record<DevotionLevel, number>;

export const EMPTY_DEVOTION: Devotion = {
  SPECTATEUR: 0,
  INTERESSE: 0,
  PARTICIPANT: 0,
  ENGAGE: 0,
  AMBASSADEUR: 0,
  EVANGELISTE: 0,
};

const DEVOTION_WEIGHTS: Devotion = {
  SPECTATEUR: 0,
  INTERESSE: 10,
  PARTICIPANT: 30,
  ENGAGE: 55,
  AMBASSADEUR: 80,
  EVANGELISTE: 100,
};

export function devotionFromMembers(levels: DevotionLevel[]): Devotion {
  const dist = { ...EMPTY_DEVOTION };
  for (const level of levels) dist[level]++;
  return dist;
}

export function superfanCount(devotion: Devotion): number {
  return devotion.AMBASSADEUR + devotion.EVANGELISTE;
}

/** Cult Index /100 : profondeur de dévotion moyenne pondérée. null si aucune donnée. */
export function cultIndex(devotion: Devotion): { value: number; sample: number } | null {
  const total = Object.values(devotion).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const weighted = (Object.entries(devotion) as [DevotionLevel, number][]).reduce(
    (sum, [level, n]) => sum + DEVOTION_WEIGHTS[level] * n,
    0,
  );
  return { value: Math.round(weighted / total), sample: total };
}

// ── Radar de fenêtre d'Overton (heuristique paramétrique — cahier §8) ──

export type AxisStatus = "OK" | "DEGRADED" | "INSUFFICIENT_DATA";

export interface OvertonAxis {
  key: string;
  label: string;
  /** 0–100, null si INSUFFICIENT_DATA */
  value: number | null;
  status: AxisStatus;
  /** D'où vient la valeur — traçabilité de l'heuristique. */
  basis: string;
}

export interface OvertonInput {
  adve: Partial<Record<"AUTHENTICITE" | "DISTINCTION" | "VALEUR" | "ENGAGEMENT", PillarFields>>;
  devotion: Devotion;
  signalCount: number;
}

function fieldScore(fields: PillarFields | undefined, key: string): number | null {
  const state = fields?.[key];
  if (!state) return null;
  const c = structuralCompleteness(state.value);
  return c > 0 ? Math.round(c * 100) : null;
}

function average(values: (number | null)[]): { value: number | null; missing: number } {
  const present = values.filter((v): v is number => v !== null);
  const missing = values.length - present.length;
  if (present.length === 0) return { value: null, missing };
  return { value: Math.round(present.reduce((a, b) => a + b, 0) / present.length), missing };
}

/**
 * Position culturelle sur 4 axes. Chaque axe n'est calculé que depuis le déclaré
 * et le mesuré ; les axes sans données portent INSUFFICIENT_DATA, les axes
 * partiels DEGRADED. Pas de régression ML, pas d'embeddings (v2.0).
 */
export function overtonRadar(input: OvertonInput): OvertonAxis[] {
  const { adve, devotion, signalCount } = input;

  // Visibilité : présence déclarée (canaux, rituels).
  const visibilite = average([fieldScore(adve.ENGAGEMENT, "canaux"), fieldScore(adve.ENGAGEMENT, "rituels")]);

  // Légitimité : preuves publiées + histoire racontée.
  const legitimite = average([fieldScore(adve.VALEUR, "preuves"), fieldScore(adve.AUTHENTICITE, "histoire")]);

  // Différenciation : positionnement + différenciateurs + territoire.
  const differenciation = average([
    fieldScore(adve.DISTINCTION, "positionnement"),
    fieldScore(adve.DISTINCTION, "differenciation"),
    fieldScore(adve.DISTINCTION, "territoire_creatif"),
  ]);

  // Conversation : communauté réelle recensée (échantillon + profondeur).
  const sample = Object.values(devotion).reduce((a, b) => a + b, 0);
  const cult = cultIndex(devotion);
  const conversation: { value: number | null; missing: number } =
    sample === 0
      ? { value: null, missing: 1 }
      : { value: Math.round(Math.min(100, Math.log10(sample + 1) * 40) * 0.5 + (cult?.value ?? 0) * 0.5), missing: sample < 20 ? 1 : 0 };

  const axes: OvertonAxis[] = [
    {
      key: "visibilite",
      label: "Visibilité",
      value: visibilite.value,
      status: visibilite.value === null ? "INSUFFICIENT_DATA" : visibilite.missing > 0 ? "DEGRADED" : "OK",
      basis: "Canaux et rituels déclarés (pilier E)",
    },
    {
      key: "legitimite",
      label: "Légitimité",
      value: legitimite.value,
      status: legitimite.value === null ? "INSUFFICIENT_DATA" : legitimite.missing > 0 ? "DEGRADED" : "OK",
      basis: "Preuves publiées (V) et récit fondateur (A)",
    },
    {
      key: "differenciation",
      label: "Différenciation",
      value: differenciation.value,
      status: differenciation.value === null ? "INSUFFICIENT_DATA" : differenciation.missing > 0 ? "DEGRADED" : "OK",
      basis: "Positionnement, différenciateurs, territoire (D)",
    },
    {
      key: "conversation",
      label: "Conversation",
      value: conversation.value,
      status: conversation.value === null ? "INSUFFICIENT_DATA" : conversation.missing > 0 ? "DEGRADED" : "OK",
      basis: sample > 0 ? `Communauté recensée (${sample} membres, Cult Index ${cult?.value ?? "—"})` : "Aucun membre recensé",
    },
  ];

  // La veille alimente la lecture globale : signalée mais jamais fabriquée.
  if (signalCount === 0) {
    for (const axis of axes) {
      if (axis.key === "visibilite" && axis.status === "OK") axis.status = "DEGRADED";
    }
  }

  return axes;
}
