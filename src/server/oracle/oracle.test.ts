import { describe, expect, it } from "vitest";
import { ORACLE_SECTIONS } from "./sections";
import type { OracleContext } from "./context";
import type { Block } from "./blocks";

// Tests des mappers Oracle (cahier §11.3) : composition déterministe, robuste
// sur socle vide (honest-empty) comme sur socle complet — zéro invention.

const now = new Date("2026-07-05T12:00:00Z");
const state = (value: string | string[]) => ({ value, certainty: "OFFICIAL" as const, updatedAt: now.toISOString() });

const emptyCtx: OracleContext = {
  brand: { id: "b1", name: "Marque Vide", sector: null, country: null, city: null, score: 0, tier: "LATENT" },
  pillars: {},
  pillarScores: {
    AUTHENTICITE: 0, DISTINCTION: 0, VALEUR: 0, ENGAGEMENT: 0,
    RISQUE: 0, TRACK: 0, INNOVATION: 0, STRATEGIE: 0,
  },
  community: [],
  signals: [],
  assets: [],
  generatedAt: now,
};

const fullCtx: OracleContext = {
  brand: { id: "b2", name: "Nyama Café", sector: "Food & boissons", country: "SN", city: "Dakar", score: 150, tier: "FORTE" },
  pillars: {
    AUTHENTICITE: {
      histoire: state("Une histoire fondatrice suffisamment longue pour être considérée comme complète du point de vue structurel, racontée avec sincérité et détail."),
      archetype: state("Le Créateur"),
      noyau_identitaire: state("Rendre la fierté du café africain aux villes africaines, de la cerise à la tasse, sans compromis sur la qualité artisanale."),
      valeurs: state(["Fierté locale", "Qualité artisanale", "Commerce direct"]),
      mission: state("Rendre aux villes africaines la fierté de leur café."),
    },
    DISTINCTION: {
      positionnement: state("Le café de spécialité 100 % africain torréfié sur place pour les urbains exigeants de Dakar qui veulent boire local."),
      promesse_maitre: state("Le meilleur café que tu aies bu, et il vient d'ici."),
      personas: state("Urbains 25-40 ans, cadres et créatifs, sensibles au consommer local et à la qualité."),
      territoire_creatif: state("Artisanat urbain : kraft, vert profond, photographie brute de torréfaction."),
      differenciation: state(["Torréfaction locale", "Origines 100 % africaines", "Circuit direct producteur"]),
    },
    VALEUR: {
      catalogue: state("Cafés en grains et moulus trois origines, abonnement mensuel, offre B2B bureaux et restaurants, corner dégustation."),
      business_model: state("Vente directe et abonnements récurrents, B2B à volume, marges maîtrisées par l'import direct des coopératives."),
      preuves: state("200 avis clients à 4,8/5, deux torréfacteurs primés, partenariats directs avec trois coopératives."),
      politique_prix: state("Premium accessible : 15 % au-dessus du café importé de grande surface, moitié moins cher que l'importé de spécialité."),
    },
    ENGAGEMENT: {
      canaux: state(["Instagram", "WhatsApp", "Corner Kermel"]),
      rituels: state("Cupping du samedi au corner, message WhatsApp hebdomadaire aux abonnés."),
      communaute: state("400 clients réguliers dont 50 abonnés mensuels, groupe WhatsApp animé chaque semaine."),
      parcours_engagement: state("Dégustation au corner → premier achat → abonnement → groupe WhatsApp → ambassadeur."),
    },
    RISQUE: {
      faiblesses: state(["Dépendance au corner physique unique"]),
      menaces: state(["Arrivée possible d'une chaîne internationale"]),
      risques_prioritaires: state(["P1 — Dépendance au corner physique unique"]),
    },
    TRACK: {
      tendances: state(["Le café de spécialité progresse dans les capitales ouest-africaines"]),
      opportunites: state(["Ritualiser la communauté existante"]),
      signaux: state(["[Presse] Multiplication des coffee shops indépendants à Dakar"]),
    },
    INNOVATION: {
      actions_candidates: state(["Publier 5 preuves clients en vidéo", "Lancer l'origine Éthiopie en événement"]),
      paris: state(["Créer un événement signature annuel du café africain"]),
    },
    STRATEGIE: {
      plan_activation: state("Jours 1-30 — Sécuriser : diversifier les points de contact\nJours 31-60 — Construire : publier les preuves\nJours 61-90 — Amplifier : événement de lancement"),
      priorites: state(["Diversifier les points de contact", "Publier les preuves", "Préparer l'événement"]),
      kpis: state(["Score de marque /200", "Abonnés actifs", "CA par origine"]),
    },
  },
  pillarScores: {
    AUTHENTICITE: 25, DISTINCTION: 25, VALEUR: 25, ENGAGEMENT: 25,
    RISQUE: 25, TRACK: 25, INNOVATION: 25, STRATEGIE: 25,
  },
  community: [
    { name: "Fatou Sarr", level: "EVANGELISTE", channel: "whatsapp", note: "Organise des dégustations" },
    { name: "Omar Ba", level: "AMBASSADEUR", channel: "whatsapp", note: "A fait entrer Nyama dans son coworking" },
    { name: "Seydou Traoré", level: "PARTICIPANT", channel: "instagram", note: null },
  ],
  signals: [{ title: "Le café de spécialité progresse", source: "MANUAL", summary: null, publishedAt: now }],
  assets: [{ kind: "MANIFESTO", title: "Manifeste Nyama", status: "ACTIVE" }],
  generatedAt: now,
};

function flatText(blocks: Block[]): string {
  return JSON.stringify(blocks);
}

describe("registre Oracle", () => {
  it("exactement 35 sections, numérotées 1..35, titres du cahier §5.1", () => {
    expect(ORACLE_SECTIONS).toHaveLength(35);
    expect(ORACLE_SECTIONS.map((s) => s.number)).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
    expect(ORACLE_SECTIONS[0]!.title).toBe("Executive Summary");
    expect(ORACLE_SECTIONS[23]!.title).toBe("McKinsey 7S");
    expect(ORACLE_SECTIONS[34]!.title).toBe("Signaux faibles sectoriels");
  });
  it("sections 1–21 non éligibles LLM ; 22–35 éligibles avec fallback déterministe", () => {
    for (const s of ORACLE_SECTIONS) {
      expect(s.llmEligible).toBe(s.number >= 22);
    }
  });
});

describe("composition — socle complet", () => {
  it("les 35 sections composent sans erreur et produisent du contenu", () => {
    for (const s of ORACLE_SECTIONS) {
      const content = s.compose(fullCtx);
      expect(content.blocks.length, `section ${s.number}`).toBeGreaterThan(0);
      expect(content.sources.length, `section ${s.number} doit tracer ses sources`).toBeGreaterThan(0);
    }
  });
  it("le rapport ne dit que le déclaré : la promesse citée est celle du pilier", () => {
    const s04 = ORACLE_SECTIONS[3]!.compose(fullCtx);
    expect(flatText(s04.blocks)).toContain("Le meilleur café que tu aies bu");
  });
  it("les superfans listés sont les vrais membres recensés", () => {
    const s15 = ORACLE_SECTIONS[14]!.compose(fullCtx);
    const txt = flatText(s15.blocks);
    expect(txt).toContain("Fatou Sarr");
    expect(txt).toContain("Omar Ba");
    expect(txt).not.toContain("Seydou"); // PARTICIPANT ≠ superfan
  });
  it("est déterministe : deux compositions identiques", () => {
    for (const s of ORACLE_SECTIONS) {
      expect(JSON.stringify(s.compose(fullCtx))).toBe(JSON.stringify(s.compose(fullCtx)));
    }
  });
});

describe("composition — socle vide (honest-empty)", () => {
  it("les 35 sections tiennent sur un socle vide, sans lancer d'erreur", () => {
    for (const s of ORACLE_SECTIONS) {
      expect(() => s.compose(emptyCtx), `section ${s.number}`).not.toThrow();
    }
  });
  it("les manques s'affichent en blocs `empty` explicites, jamais comblés", () => {
    const mustBeEmpty = [9, 15, 31, 33, 35]; // signaux, superfans, cult index, devotion, signaux faibles
    for (const n of mustBeEmpty) {
      const content = ORACLE_SECTIONS[n - 1]!.compose(emptyCtx);
      const hasEmptyBlock = content.blocks.some((b) => b.type === "empty");
      expect(hasEmptyBlock, `section ${n} doit exposer un état vide honnête`).toBe(true);
    }
  });
  it("le Cult Index n'est jamais fabriqué sans données", () => {
    const s31 = ORACLE_SECTIONS[30]!.compose(emptyCtx);
    expect(s31.blocks.some((b) => b.type === "score")).toBe(false);
    expect(s31.blocks.some((b) => b.type === "empty")).toBe(true);
  });
});
