import type { PillarKind, SignalSource } from "@prisma/client";
import { pillarDef, type FieldValue, type PillarFields } from "./pillar-config";
import { structuralCompleteness } from "@/server/scoring/score";

// ═══════════════════════════════════════════════════════════════════
// Dérivation RTIS — PURE et DÉTERMINISTE (cahier §3.2).
// « Le rapport ne dit que ce que la marque a déclaré » : chaque item dérivé
// remonte à un champ ADVE réel ou à un signal marché réel. Aucune invention.
// ═══════════════════════════════════════════════════════════════════

export type AdveSnapshot = Partial<Record<"AUTHENTICITE" | "DISTINCTION" | "VALEUR" | "ENGAGEMENT", PillarFields>>;

export interface RtisExtras {
  sector: string | null;
  country: string | null;
  signals: { title: string; source: SignalSource; summary: string | null }[];
}

type Derived = Record<string, FieldValue>;

function val(adve: AdveSnapshot, kind: keyof AdveSnapshot, key: string): string {
  const state = adve[kind]?.[key];
  if (!state) return "";
  return Array.isArray(state.value) ? state.value.join(", ") : state.value;
}

function completeness(adve: AdveSnapshot, kind: keyof AdveSnapshot, key: string): number {
  const state = adve[kind]?.[key];
  return state ? structuralCompleteness(state.value) : 0;
}

function isInferred(adve: AdveSnapshot, kind: keyof AdveSnapshot, key: string): boolean {
  return adve[kind]?.[key]?.certainty === "INFERRED";
}

/** Manques par pilier, triés par poids d'impact (poids du champ × ampleur du manque). */
function gaps(adve: AdveSnapshot): { kind: keyof AdveSnapshot; key: string; label: string; impact: number }[] {
  const out: { kind: keyof AdveSnapshot; key: string; label: string; impact: number }[] = [];
  for (const kind of ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] as const) {
    for (const f of pillarDef(kind as PillarKind).fields) {
      const c = completeness(adve, kind, f.key);
      if (c < 0.7) out.push({ kind, key: f.key, label: f.label, impact: f.weight * (1 - c) });
    }
  }
  return out.sort((a, b) => b.impact - a.impact);
}

// Formulation métier des faiblesses, par champ (le générique reste honnête).
const WEAKNESS_WORDING: Record<string, string> = {
  histoire: "L'histoire de la marque n'est pas racontée : sans récit fondateur, pas d'attachement possible.",
  archetype: "Aucun archétype défini : la personnalité de la marque reste floue pour ses publics.",
  noyau_identitaire: "Le noyau identitaire n'est pas formulé : la marque n'a pas d'ancrage non négociable.",
  valeurs: "Les valeurs cardinales ne sont pas posées : les décisions ne peuvent pas s'y référer.",
  mission: "La mission n'est pas exprimée : l'utilité sociale de la marque reste implicite.",
  positionnement: "Le positionnement n'est pas défini : la marque occupe une place par défaut, pas par choix.",
  promesse_maitre: "Aucune promesse maître : la marque est substituable dans l'esprit du client.",
  personas: "Les personas ne sont pas décrits : la marque parle à tout le monde, donc à personne.",
  territoire_creatif: "Le territoire créatif n'est pas revendiqué : l'expression visuelle et narrative flotte.",
  differenciation: "Les différenciateurs ne sont pas explicités : rien ne justifie de choisir cette marque plutôt qu'une autre.",
  catalogue: "L'offre n'est pas structurée en catalogue : difficile de vendre ce qui n'est pas nommé.",
  business_model: "Le business model n'est pas formalisé : la création de valeur repose sur l'improvisation.",
  preuves: "Aucune preuve documentée : la promesse repose sur la parole seule.",
  politique_prix: "La politique de prix n'est pas posée : le prix subit le marché au lieu de porter le positionnement.",
  canaux: "Les canaux ne sont pas cartographiés : la présence de la marque est subie, pas orchestrée.",
  rituels: "Aucun rituel de marque : rien ne crée d'habitude ni de rendez-vous avec l'audience.",
  communaute: "L'état de la communauté n'est pas connu : impossible de cultiver des superfans invisibles.",
  parcours_engagement: "Le parcours d'engagement n'est pas tracé : le passage de spectateur à ambassadeur est laissé au hasard.",
};

function deriveRisque(adve: AdveSnapshot): Derived {
  const allGaps = gaps(adve);

  const faiblesses = allGaps.slice(0, 6).map((g) => WEAKNESS_WORDING[g.key] ?? `Champ « ${g.label} » incomplet dans le pilier ${g.kind}.`);

  // Données inférées non validées = fragilité du socle.
  for (const kind of ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] as const) {
    const inferredKeys = Object.keys(adve[kind] ?? {}).filter((k) => isInferred(adve, kind, k));
    if (inferredKeys.length > 0) {
      faiblesses.push(
        `${inferredKeys.length} champ(s) du pilier ${pillarDef(kind as PillarKind).name} pré-remplis par l'IA et jamais validés : le socle repose sur de l'hypothèse.`,
      );
      break; // un seul avertissement global suffit
    }
  }

  const menaces: string[] = [];
  if (completeness(adve, "ENGAGEMENT", "communaute") < 0.7) {
    menaces.push("Audience louée aux plateformes, pas possédée : un changement d'algorithme peut couper la marque de ses publics.");
  }
  if (completeness(adve, "VALEUR", "preuves") < 0.7) {
    menaces.push("Un concurrent mieux documenté peut préempter la crédibilité du secteur.");
  }
  if (completeness(adve, "DISTINCTION", "positionnement") < 0.7 || completeness(adve, "DISTINCTION", "promesse_maitre") < 0.7) {
    menaces.push("Sans position défendue, la marque est exposée à la guerre des prix.");
  }
  if (completeness(adve, "VALEUR", "business_model") < 0.7) {
    menaces.push("Modèle économique non formalisé : toute variation de coûts ou de demande se traduit directement en fragilité de trésorerie.");
  }

  const risques_prioritaires = allGaps.slice(0, 3).map(
    (g, i) => `P${i + 1} — ${WEAKNESS_WORDING[g.key] ?? g.label}`,
  );

  return { faiblesses, menaces, risques_prioritaires };
}

function deriveTrack(adve: AdveSnapshot, extras: RtisExtras): Derived {
  // Signaux réels uniquement (presse RSS, macro World Bank, saisie manuelle) — jamais fabriqués.
  const signaux = extras.signals.slice(0, 8).map((s) => {
    const origin = s.source === "WORLD_BANK" ? "Macro" : s.source === "RSS_NEWS" ? "Presse" : "Terrain";
    return `[${origin}] ${s.title}${s.summary ? ` — ${s.summary}` : ""}`;
  });

  const tendances = extras.signals
    .filter((s) => s.source === "RSS_NEWS")
    .slice(0, 5)
    .map((s) => s.title);

  // Opportunités dérivées du déclaré : forces sous-exploitées visibles dans l'ADVE.
  const opportunites: string[] = [];
  if (completeness(adve, "ENGAGEMENT", "communaute") >= 0.7 && completeness(adve, "ENGAGEMENT", "rituels") < 0.7) {
    opportunites.push("Une communauté existe mais sans rituels : la ritualiser transformerait l'audience en rendez-vous.");
  }
  if (completeness(adve, "AUTHENTICITE", "histoire") >= 0.7 && completeness(adve, "DISTINCTION", "territoire_creatif") < 0.7) {
    opportunites.push("Une histoire forte n'est pas encore traduite en territoire créatif : gisement narratif inexploité.");
  }
  if (completeness(adve, "VALEUR", "preuves") >= 0.7 && completeness(adve, "ENGAGEMENT", "canaux") >= 0.7) {
    opportunites.push("Des preuves existent et des canaux sont actifs : industrialiser la publication des preuves sur les canaux déclarés.");
  }
  if (completeness(adve, "VALEUR", "catalogue") >= 0.7 && completeness(adve, "VALEUR", "politique_prix") < 0.7) {
    opportunites.push("Le catalogue est structuré mais le prix ne porte pas le positionnement : marge de repricing.");
  }

  return { tendances, opportunites, signaux };
}

function deriveInnovation(adve: AdveSnapshot, upstream: Partial<Record<PillarKind, PillarFields>>): Derived {
  const actions: string[] = [];

  // Actions de comblement — reliées aux manques réels, les plus impactants d'abord.
  const ACTION_WORDING: Record<string, string> = {
    promesse_maitre: "Formuler la promesse maître en une phrase et la tester auprès de 10 clients réels.",
    positionnement: "Poser le positionnement : pour qui, contre quoi, à la place de quoi.",
    noyau_identitaire: "Ateliers fondateurs : écrire le noyau identitaire (ce qui ne changera jamais).",
    archetype: "Choisir l'archétype de marque et aligner le ton de toutes les prises de parole.",
    personas: "Décrire les 2-3 personas prioritaires à partir de vrais clients.",
    catalogue: "Structurer l'offre en catalogue nommé (gammes, prix, formats).",
    business_model: "Formaliser le business model : sources de revenus, marges, canaux de vente.",
    preuves: "Collecter et publier 5 preuves : chiffres, témoignages, avant/après.",
    histoire: "Écrire et publier le récit fondateur de la marque.",
    valeurs: "Poser les 3-5 valeurs cardinales et les afficher.",
    canaux: "Cartographier les canaux et concentrer l'effort sur les 2 plus performants.",
    rituels: "Créer un rituel récurrent (rendez-vous hebdomadaire ou mensuel) avec l'audience.",
    communaute: "Recenser la communauté réelle : où elle vit, qui l'anime, combien de membres actifs.",
    parcours_engagement: "Tracer le parcours spectateur → client → ambassadeur et instrumenter chaque étape.",
    mission: "Exprimer la mission de la marque en une phrase d'utilité.",
    territoire_creatif: "Définir le territoire créatif : univers visuel, ton, références.",
    differenciation: "Lister les différenciateurs factuels et les hiérarchiser.",
    politique_prix: "Aligner la grille de prix sur le positionnement revendiqué.",
  };

  for (const g of gaps(adve).slice(0, 7)) {
    const wording = ACTION_WORDING[g.key];
    if (wording) actions.push(wording);
  }

  // Actions de levier — amplifient les forces déclarées.
  if (completeness(adve, "AUTHENTICITE", "histoire") >= 0.7) {
    actions.push("Décliner le récit fondateur en formats courts (vidéo, carrousel, interview).");
  }
  if (completeness(adve, "ENGAGEMENT", "communaute") >= 0.7) {
    actions.push("Identifier les 10 membres les plus engagés et leur donner un rôle d'ambassadeur.");
  }
  if (completeness(adve, "VALEUR", "preuves") >= 0.7) {
    actions.push("Transformer les preuves en études de cas publiables.");
  }

  // Paris audacieux : combinaisons de forces A×D.
  const paris: string[] = [];
  if (completeness(adve, "AUTHENTICITE", "noyau_identitaire") >= 0.7 && completeness(adve, "DISTINCTION", "positionnement") >= 0.7) {
    paris.push("Prendre publiquement position sur un sujet de société aligné avec le noyau identitaire — assumer de cliver.");
  }
  if (completeness(adve, "DISTINCTION", "territoire_creatif") >= 0.7) {
    paris.push("Créer un événement signature annuel qui matérialise le territoire créatif dans le réel.");
  }
  if (paris.length === 0 && actions.length > 0) {
    paris.push("Compléter le socle ADVE avant tout pari : la fusée ne décolle pas sans fondations.");
  }

  // Le pilier R amont éclaire la priorisation (cascade R→I).
  const risques = upstream.RISQUE?.risques_prioritaires;
  if (risques && Array.isArray(risques.value) && risques.value.length > 0) {
    actions.unshift(`Traiter le risque prioritaire identifié : ${String(risques.value[0]).replace(/^P1 — /, "")}`);
  }

  return { actions_candidates: actions.slice(0, 8), paris: paris.slice(0, 3) };
}

function deriveStrategie(adve: AdveSnapshot, extras: RtisExtras, upstream: Partial<Record<PillarKind, PillarFields>>): Derived {
  const actionsUpstream = upstream.INNOVATION?.actions_candidates;
  const actions = actionsUpstream && Array.isArray(actionsUpstream.value) ? actionsUpstream.value : [];
  const risques = upstream.RISQUE?.risques_prioritaires;
  const topRisques = risques && Array.isArray(risques.value) ? risques.value : [];

  const priorites = actions.slice(0, 3);

  const phases: string[] = [];
  if (topRisques.length > 0) {
    phases.push(`Jours 1-30 — Sécuriser le socle : ${topRisques.slice(0, 2).map((r) => r.replace(/^P\d — /, "")).join(" · ")}`);
  }
  if (actions.length > 0) {
    phases.push(`Jours 31-60 — Construire : ${actions.slice(0, 2).join(" · ")}`);
  }
  if (actions.length > 2) {
    phases.push(`Jours 61-90 — Amplifier : ${actions.slice(2, 4).join(" · ")}`);
  }
  const plan_activation = phases.join("\n");

  // KPIs : uniquement sur ce qui est déclaré/mesurable.
  const kpis: string[] = ["Score de marque /200 (recalculé à chaque amendement)"];
  const canaux = adve.ENGAGEMENT?.canaux;
  if (canaux && Array.isArray(canaux.value)) {
    for (const c of canaux.value.slice(0, 3)) kpis.push(`Progression d'audience sur ${c}`);
  }
  if (completeness(adve, "ENGAGEMENT", "communaute") >= 0.45) {
    kpis.push("Nombre de superfans identifiés (échelons Ambassadeur + Évangéliste)");
  }
  if (completeness(adve, "VALEUR", "catalogue") >= 0.45) {
    kpis.push("Chiffre d'affaires par ligne du catalogue");
  }

  return { plan_activation, priorites, kpis };
}

export function deriveRtis(
  kind: PillarKind,
  adve: AdveSnapshot,
  extras: RtisExtras,
  upstream: Partial<Record<PillarKind, PillarFields>> = {},
): Derived {
  switch (kind) {
    case "RISQUE":
      return deriveRisque(adve);
    case "TRACK":
      return deriveTrack(adve, extras);
    case "INNOVATION":
      return deriveInnovation(adve, upstream);
    case "STRATEGIE":
      return deriveStrategie(adve, extras, upstream);
    default:
      throw new Error(`${kind} n'est pas un pilier dérivé.`);
  }
}
