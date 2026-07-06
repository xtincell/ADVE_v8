import type { Certainty, PillarKind } from "@prisma/client";

// ═══════════════════════════════════════════════════════════════════
// Définition canonique des 8 piliers ADVE/RTIS (cahier §3).
// ADVE : saisis/amendés par l'humain. RTIS : dérivés, jamais édités.
// ═══════════════════════════════════════════════════════════════════

export type FieldValue = string | string[];

export interface FieldState {
  value: FieldValue;
  certainty: Certainty;
  updatedAt: string; // ISO
  updatedBy?: string;
}

export type PillarFields = Record<string, FieldState>;

/** Lecture typée de la colonne JSON `Pillar.fields` (Prisma JsonValue). */
export function asPillarFields(json: unknown): PillarFields {
  return (json ?? {}) as PillarFields;
}

export interface FieldDef {
  key: string;
  label: string;
  question: string;
  type: "text" | "textarea" | "list";
  /** false = non-inférable par nature : exige une saisie/validation humaine, jamais pré-rempli par l'IA. */
  inferable: boolean;
  weight: number;
  placeholder?: string;
}

export interface PillarDef {
  kind: PillarKind;
  letter: string;
  name: string;
  question: string;
  derived: boolean; // RTIS = true
  order: number;
  fields: FieldDef[];
}

export const PILLARS: PillarDef[] = [
  {
    kind: "AUTHENTICITE",
    letter: "A",
    name: "Authenticité",
    question: "Qui est vraiment cette marque ?",
    derived: false,
    order: 1,
    fields: [
      { key: "histoire", label: "Histoire", question: "D'où vient la marque, qui l'a fondée, pourquoi ?", type: "textarea", inferable: true, weight: 2, placeholder: "Racontez la genèse de la marque…" },
      { key: "archetype", label: "Archétype", question: "Quelle figure universelle la marque incarne-t-elle ?", type: "text", inferable: false, weight: 2, placeholder: "Ex. : le Créateur, l'Explorateur, le Sage…" },
      { key: "noyau_identitaire", label: "Noyau identitaire", question: "Le noyau irréductible : ce qui ne changera jamais.", type: "textarea", inferable: false, weight: 3 },
      { key: "valeurs", label: "Valeurs", question: "Les 3 à 5 valeurs cardinales qui guident chaque décision.", type: "list", inferable: true, weight: 2, placeholder: "Une valeur par ligne" },
      { key: "mission", label: "Mission", question: "Ce que la marque change dans la vie de ses publics.", type: "textarea", inferable: true, weight: 1 },
    ],
  },
  {
    kind: "DISTINCTION",
    letter: "D",
    name: "Distinction",
    question: "Pourquoi est-elle irremplaçable ?",
    derived: false,
    order: 2,
    fields: [
      { key: "positionnement", label: "Positionnement", question: "La place unique que la marque occupe dans son marché et dans les têtes.", type: "textarea", inferable: false, weight: 3 },
      { key: "promesse_maitre", label: "Promesse maître", question: "La promesse centrale faite à chaque client, en une phrase.", type: "text", inferable: false, weight: 3 },
      { key: "personas", label: "Personas", question: "Les publics prioritaires : qui sont-ils, que veulent-ils ?", type: "textarea", inferable: false, weight: 2 },
      { key: "territoire_creatif", label: "Territoire créatif", question: "L'univers esthétique et narratif que la marque revendique.", type: "textarea", inferable: true, weight: 1 },
      { key: "differenciation", label: "Différenciateurs", question: "Ce que la marque fait que personne d'autre ne fait.", type: "list", inferable: true, weight: 1, placeholder: "Un différenciateur par ligne" },
    ],
  },
  {
    kind: "VALEUR",
    letter: "V",
    name: "Valeur",
    question: "Quelle valeur cardinale délivre-t-elle ?",
    derived: false,
    order: 3,
    fields: [
      { key: "catalogue", label: "Offre & catalogue", question: "Ce que la marque vend, concrètement : produits, services, gammes.", type: "textarea", inferable: false, weight: 3 },
      { key: "business_model", label: "Business model", question: "Comment la marque gagne de l'argent : sources de revenus, marges, canaux de vente.", type: "textarea", inferable: false, weight: 3 },
      { key: "preuves", label: "Preuves", question: "Résultats, chiffres, témoignages, distinctions : ce qui prouve la valeur.", type: "textarea", inferable: true, weight: 2 },
      { key: "politique_prix", label: "Politique de prix", question: "Le positionnement prix et sa logique.", type: "textarea", inferable: true, weight: 1 },
    ],
  },
  {
    kind: "ENGAGEMENT",
    letter: "E",
    name: "Engagement",
    question: "Comment l'audience franchit-elle le seuil ?",
    derived: false,
    order: 4,
    fields: [
      { key: "canaux", label: "Canaux", question: "Où la marque parle et vend : réseaux, points de vente, événements.", type: "list", inferable: true, weight: 2, placeholder: "Un canal par ligne" },
      { key: "rituels", label: "Rituels", question: "Les rendez-vous réguliers qui fidélisent : formats, événements, habitudes.", type: "textarea", inferable: true, weight: 2 },
      { key: "communaute", label: "Communauté", question: "L'état réel de la communauté : taille, lieux, animation.", type: "textarea", inferable: true, weight: 2 },
      { key: "parcours_engagement", label: "Parcours d'engagement", question: "Comment un inconnu devient client, puis ambassadeur.", type: "textarea", inferable: true, weight: 2 },
    ],
  },
  {
    kind: "RISQUE",
    letter: "R",
    name: "Risque",
    question: "Qu'est-ce qui menace la marque ? (dérivé de l'ADVE)",
    derived: true,
    order: 5,
    fields: [
      { key: "faiblesses", label: "Faiblesses", question: "Faiblesses internes détectées dans le socle ADVE.", type: "list", inferable: true, weight: 2 },
      { key: "menaces", label: "Menaces", question: "Menaces externes pesant sur la position de la marque.", type: "list", inferable: true, weight: 2 },
      { key: "risques_prioritaires", label: "Risques prioritaires", question: "Les risques à traiter en premier, hiérarchisés.", type: "list", inferable: true, weight: 3 },
    ],
  },
  {
    kind: "TRACK",
    letter: "T",
    name: "Track",
    question: "Que dit le marché ? (dérivé de l'ADVE + signaux externes)",
    derived: true,
    order: 6,
    fields: [
      { key: "tendances", label: "Tendances", question: "Tendances sectorielles pertinentes pour la marque.", type: "list", inferable: true, weight: 2 },
      { key: "opportunites", label: "Opportunités", question: "Opportunités externes exploitables.", type: "list", inferable: true, weight: 2 },
      { key: "signaux", label: "Signaux marché", question: "Signaux concrets captés (presse, macro, terrain).", type: "list", inferable: true, weight: 2 },
    ],
  },
  {
    kind: "INNOVATION",
    letter: "I",
    name: "Innovation",
    question: "Quelles actions candidates ? (dérivé)",
    derived: true,
    order: 7,
    fields: [
      { key: "actions_candidates", label: "Actions candidates", question: "Catalogue d'actions possibles, reliées aux piliers.", type: "list", inferable: true, weight: 3 },
      { key: "paris", label: "Paris audacieux", question: "Les 2-3 paris à fort levier culturel.", type: "list", inferable: true, weight: 2 },
    ],
  },
  {
    kind: "STRATEGIE",
    letter: "S",
    name: "Stratégie",
    question: "Quel plan exécutable ? (dérivé)",
    derived: true,
    order: 8,
    fields: [
      { key: "plan_activation", label: "Plan d'activation", question: "Le plan séquencé : phases, actions, échéances.", type: "textarea", inferable: true, weight: 3 },
      { key: "priorites", label: "Priorités", question: "Les 3 priorités du trimestre.", type: "list", inferable: true, weight: 2 },
      { key: "kpis", label: "KPIs", question: "Les indicateurs qui mesurent la progression.", type: "list", inferable: true, weight: 2 },
    ],
  },
];

export const ADVE_KINDS = ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] as const satisfies readonly PillarKind[];
export const RTIS_KINDS = ["RISQUE", "TRACK", "INNOVATION", "STRATEGIE"] as const satisfies readonly PillarKind[];
/** Cascade unidirectionnelle A→D→V→E→R→T→I→S (cahier §3.2). */
export const CASCADE_ORDER: readonly PillarKind[] = [...ADVE_KINDS, ...RTIS_KINDS];

const byKind = new Map(PILLARS.map((p) => [p.kind, p]));

export function pillarDef(kind: PillarKind): PillarDef {
  const def = byKind.get(kind);
  if (!def) throw new Error(`Pilier inconnu : ${kind}`);
  return def;
}

export function fieldDef(kind: PillarKind, key: string): FieldDef | undefined {
  return pillarDef(kind).fields.find((f) => f.key === key);
}

export function isDerived(kind: PillarKind): boolean {
  return pillarDef(kind).derived;
}

/** Les 7 champs non-inférables par nature (cahier §3.1) — validation humaine exigée. */
export function nonInferableFields(): { kind: PillarKind; key: string }[] {
  return PILLARS.flatMap((p) => p.fields.filter((f) => !f.inferable).map((f) => ({ kind: p.kind, key: f.key })));
}
