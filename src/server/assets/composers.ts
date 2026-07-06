import type { AssetKind } from "@prisma/client";
import type { PillarFields } from "@/server/brands/pillar-config";

// Forge d'assets (cahier §5.2) : composition DÉTERMINISTE d'abord — templates
// alimentés par les seules données des piliers. Un kind n'existe ici que s'il
// est réellement exposé dans l'UI. L'amélioration LLM est optionnelle et
// vient par-dessus (tranche LLM), jamais à la place.

export interface AssetContent {
  sections: { title: string; text: string }[];
}

export interface ComposeContext {
  brandName: string;
  sector: string | null;
  adve: Partial<Record<"AUTHENTICITE" | "DISTINCTION" | "VALEUR" | "ENGAGEMENT", PillarFields>>;
}

export interface ComposeParams {
  objectif?: string;
}

function val(ctx: ComposeContext, kind: keyof ComposeContext["adve"], key: string): string {
  const state = ctx.adve[kind]?.[key];
  if (!state) return "";
  return Array.isArray(state.value) ? state.value.join(" · ") : state.value.trim();
}

function lines(ctx: ComposeContext, kind: keyof ComposeContext["adve"], key: string): string[] {
  const state = ctx.adve[kind]?.[key];
  if (!state) return [];
  if (Array.isArray(state.value)) return state.value.filter(Boolean);
  return state.value ? [state.value] : [];
}

const GAP = (champ: string, pilier: string) =>
  `[À compléter : le champ « ${champ} » du pilier ${pilier} est vide — renseignez-le puis régénérez.]`;

function composePositioning(ctx: ComposeContext): { title: string; content: AssetContent } {
  const positionnement = val(ctx, "DISTINCTION", "positionnement");
  const promesse = val(ctx, "DISTINCTION", "promesse_maitre");
  const personas = val(ctx, "DISTINCTION", "personas");
  const diff = lines(ctx, "DISTINCTION", "differenciation");
  return {
    title: `Plateforme de positionnement — ${ctx.brandName}`,
    content: {
      sections: [
        { title: "Positionnement", text: positionnement || GAP("Positionnement", "Distinction") },
        { title: "Promesse maître", text: promesse ? `« ${promesse} »` : GAP("Promesse maître", "Distinction") },
        { title: "Pour qui", text: personas || GAP("Personas", "Distinction") },
        {
          title: "Pourquoi nous croire",
          text: diff.length > 0 ? diff.map((d) => `— ${d}`).join("\n") : val(ctx, "VALEUR", "preuves") || GAP("Différenciateurs", "Distinction"),
        },
      ],
    },
  };
}

function composeManifesto(ctx: ComposeContext): { title: string; content: AssetContent } {
  const histoire = val(ctx, "AUTHENTICITE", "histoire");
  const noyau = val(ctx, "AUTHENTICITE", "noyau_identitaire");
  const valeurs = lines(ctx, "AUTHENTICITE", "valeurs");
  const mission = val(ctx, "AUTHENTICITE", "mission");
  return {
    title: `Manifeste — ${ctx.brandName}`,
    content: {
      sections: [
        { title: "D'où nous venons", text: histoire || GAP("Histoire", "Authenticité") },
        { title: "Ce qui ne changera jamais", text: noyau || GAP("Noyau identitaire", "Authenticité") },
        {
          title: "Ce que nous défendons",
          text: valeurs.length > 0 ? valeurs.map((v) => `— ${v}`).join("\n") : GAP("Valeurs", "Authenticité"),
        },
        { title: "Ce que nous changeons", text: mission || GAP("Mission", "Authenticité") },
      ],
    },
  };
}

function composeClaim(ctx: ComposeContext): { title: string; content: AssetContent } {
  const promesse = val(ctx, "DISTINCTION", "promesse_maitre");
  const valeurs = lines(ctx, "AUTHENTICITE", "valeurs");
  const territoire = val(ctx, "DISTINCTION", "territoire_creatif");
  return {
    title: `Pistes de claim — ${ctx.brandName}`,
    content: {
      sections: [
        { title: "Claim principal (la promesse déclarée)", text: promesse ? `« ${promesse} »` : GAP("Promesse maître", "Distinction") },
        {
          title: "Déclinaisons par valeur",
          text:
            valeurs.length > 0
              ? valeurs.map((v) => `— ${ctx.brandName}. ${v}.`).join("\n")
              : GAP("Valeurs", "Authenticité"),
        },
        {
          title: "Règles d'usage",
          text: territoire
            ? `Ton et univers : ${territoire}\nLe claim s'écrit tel quel, sans point d'exclamation ajouté, jamais traduit mot à mot.`
            : "Ton et univers à définir (champ Territoire créatif).",
        },
      ],
    },
  };
}

function composePitch(ctx: ComposeContext): { title: string; content: AssetContent } {
  const mission = val(ctx, "AUTHENTICITE", "mission");
  const positionnement = val(ctx, "DISTINCTION", "positionnement");
  const catalogue = val(ctx, "VALEUR", "catalogue");
  const preuves = val(ctx, "VALEUR", "preuves");
  const promesse = val(ctx, "DISTINCTION", "promesse_maitre");
  return {
    title: `Pitch 30 secondes — ${ctx.brandName}`,
    content: {
      sections: [
        { title: "Accroche", text: promesse ? `« ${promesse} »` : GAP("Promesse maître", "Distinction") },
        { title: "Qui nous sommes", text: [mission, positionnement].filter(Boolean).join("\n") || GAP("Mission / Positionnement", "A & D") },
        { title: "Ce que nous vendons", text: catalogue || GAP("Catalogue", "Valeur") },
        { title: "La preuve", text: preuves || GAP("Preuves", "Valeur") },
        { title: "L'appel", text: `Venez voir par vous-même — ${ctx.brandName}.` },
      ],
    },
  };
}

function composePersona(ctx: ComposeContext): { title: string; content: AssetContent } {
  const personas = val(ctx, "DISTINCTION", "personas");
  const canaux = lines(ctx, "ENGAGEMENT", "canaux");
  const parcours = val(ctx, "ENGAGEMENT", "parcours_engagement");
  return {
    title: `Fiche personas — ${ctx.brandName}`,
    content: {
      sections: [
        { title: "Publics prioritaires (déclarés)", text: personas || GAP("Personas", "Distinction") },
        {
          title: "Où les trouver",
          text: canaux.length > 0 ? canaux.map((c) => `— ${c}`).join("\n") : GAP("Canaux", "Engagement"),
        },
        { title: "Leur parcours vers la marque", text: parcours || GAP("Parcours d'engagement", "Engagement") },
      ],
    },
  };
}

function composeBrief(ctx: ComposeContext, params: ComposeParams): { title: string; content: AssetContent } {
  const objectif = params.objectif?.trim() || "[Objectif à préciser]";
  const positionnement = val(ctx, "DISTINCTION", "positionnement");
  const promesse = val(ctx, "DISTINCTION", "promesse_maitre");
  const territoire = val(ctx, "DISTINCTION", "territoire_creatif");
  const personas = val(ctx, "DISTINCTION", "personas");
  const valeurs = lines(ctx, "AUTHENTICITE", "valeurs");
  return {
    title: `Brief créatif — ${objectif === "[Objectif à préciser]" ? ctx.brandName : objectif}`,
    content: {
      sections: [
        { title: "Objectif", text: objectif },
        { title: "La marque en une phrase", text: promesse ? `« ${promesse} »` : positionnement || GAP("Promesse / Positionnement", "Distinction") },
        { title: "À qui on parle", text: personas || GAP("Personas", "Distinction") },
        {
          title: "Territoire & ton",
          text: [territoire, valeurs.length > 0 ? `Valeurs à incarner : ${valeurs.join(", ")}` : ""].filter(Boolean).join("\n") || GAP("Territoire créatif", "Distinction"),
        },
        { title: "Interdits", text: "Ne jamais employer de vocabulaire technique interne ; ne rien promettre qui ne soit pas dans le socle déclaré." },
        { title: "Livrables & délais", text: "[À préciser avec l'exécutant — voir La Guilde pour confier la mission.]" },
      ],
    },
  };
}

export const EXPOSED_KINDS: { kind: AssetKind; label: string; needsObjectif?: boolean }[] = [
  { kind: "POSITIONING", label: "Plateforme de positionnement" },
  { kind: "MANIFESTO", label: "Manifeste" },
  { kind: "CLAIM", label: "Pistes de claim" },
  { kind: "PITCH", label: "Pitch 30 secondes" },
  { kind: "PERSONA", label: "Fiche personas" },
  { kind: "CREATIVE_BRIEF", label: "Brief créatif", needsObjectif: true },
];

export function composeAsset(
  kind: AssetKind,
  ctx: ComposeContext,
  params: ComposeParams = {},
): { title: string; content: AssetContent } {
  switch (kind) {
    case "POSITIONING":
      return composePositioning(ctx);
    case "MANIFESTO":
      return composeManifesto(ctx);
    case "CLAIM":
      return composeClaim(ctx);
    case "PITCH":
      return composePitch(ctx);
    case "PERSONA":
      return composePersona(ctx);
    case "CREATIVE_BRIEF":
      return composeBrief(ctx, params);
    default:
      throw new Error(`Kind d'asset non exposé dans la forge : ${kind}`);
  }
}
