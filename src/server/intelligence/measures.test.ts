import { describe, expect, it } from "vitest";
import {
  cultIndex,
  devotionFromMembers,
  EMPTY_DEVOTION,
  overtonRadar,
  superfanCount,
} from "./measures";
import { composeAsset } from "@/server/assets/composers";
import type { PillarFields } from "@/server/brands/pillar-config";

const now = new Date().toISOString();
const field = (value: string | string[]): PillarFields[string] => ({ value, certainty: "OFFICIAL", updatedAt: now });

describe("Cult Index (heuristique honnête)", () => {
  it("null sans aucune donnée — jamais fabriqué", () => {
    expect(cultIndex(EMPTY_DEVOTION)).toBeNull();
  });
  it("moyenne pondérée déterministe des échelons", () => {
    const devotion = devotionFromMembers(["EVANGELISTE", "AMBASSADEUR", "SPECTATEUR", "SPECTATEUR"]);
    // (100 + 80 + 0 + 0) / 4 = 45
    expect(cultIndex(devotion)).toEqual({ value: 45, sample: 4 });
    expect(superfanCount(devotion)).toBe(2);
  });
});

describe("Radar Overton (paramétrique, états par axe)", () => {
  it("sans aucune donnée : tous les axes INSUFFICIENT_DATA, valeurs null", () => {
    const radar = overtonRadar({ adve: {}, devotion: EMPTY_DEVOTION, signalCount: 0 });
    expect(radar).toHaveLength(4);
    for (const axis of radar) {
      expect(axis.value).toBeNull();
      expect(axis.status).toBe("INSUFFICIENT_DATA");
    }
  });
  it("données partielles : DEGRADED, jamais de valeur inventée pour les axes vides", () => {
    const radar = overtonRadar({
      adve: {
        ENGAGEMENT: { canaux: field(["Instagram", "WhatsApp", "Corner"]) }, // rituels absent
      },
      devotion: EMPTY_DEVOTION,
      signalCount: 3,
    });
    const visibilite = radar.find((a) => a.key === "visibilite")!;
    expect(visibilite.status).toBe("DEGRADED");
    expect(visibilite.value).toBeGreaterThan(0);
    const conversation = radar.find((a) => a.key === "conversation")!;
    expect(conversation.status).toBe("INSUFFICIENT_DATA");
    expect(conversation.value).toBeNull();
  });
  it("est déterministe", () => {
    const input = {
      adve: { DISTINCTION: { positionnement: field("Un positionnement complet et suffisamment long pour être structurellement plein, revendiqué et daté.") } },
      devotion: devotionFromMembers(["ENGAGE", "AMBASSADEUR"]),
      signalCount: 1,
    } as const;
    expect(JSON.stringify(overtonRadar(input))).toBe(JSON.stringify(overtonRadar(input)));
  });
});

describe("Forge d'assets (composition déterministe)", () => {
  const fullCtx = {
    brandName: "Nyama Café",
    sector: "Food",
    adve: {
      AUTHENTICITE: {
        histoire: field("Torréfacteur artisanal né à Dakar d'un ras-le-bol : voir le continent exporter son café vert et racheter du soluble importé."),
        noyau_identitaire: field("La fierté du café africain, de la cerise à la tasse."),
        valeurs: field(["Fierté locale", "Qualité artisanale"]),
        mission: field("Rendre aux villes africaines la fierté de leur café."),
      },
      DISTINCTION: {
        positionnement: field("Le café de spécialité 100 % africain torréfié sur place."),
        promesse_maitre: field("Le meilleur café que tu aies bu, et il vient d'ici."),
        personas: field("Urbains 25-40 ans exigeants."),
        territoire_creatif: field("Artisanat urbain, kraft et vert profond."),
        differenciation: field(["Torréfaction locale", "Circuit direct"]),
      },
      VALEUR: { catalogue: field("Trois origines, abonnement, B2B."), preuves: field("200 avis à 4,8/5.") },
      ENGAGEMENT: { canaux: field(["Instagram", "WhatsApp"]), parcours_engagement: field("Corner → achat → abonnement.") },
    },
  };

  it("le manifeste ne contient QUE le déclaré", () => {
    const { title, content } = composeAsset("MANIFESTO", fullCtx);
    expect(title).toContain("Nyama Café");
    const text = JSON.stringify(content);
    expect(text).toContain("ras-le-bol");
    expect(text).toContain("Fierté locale");
    expect(text).not.toContain("À compléter");
  });
  it("un socle vide produit des trous EXPLICITES, pas des inventions", () => {
    const { content } = composeAsset("POSITIONING", { brandName: "Vide SA", sector: null, adve: {} });
    const gaps = content.sections.filter((s) => s.text.includes("[À compléter")).length;
    expect(gaps).toBeGreaterThanOrEqual(3);
  });
  it("le brief créatif porte l'objectif fourni", () => {
    const { title, content } = composeAsset("CREATIVE_BRIEF", fullCtx, { objectif: "Lancement origine Éthiopie" });
    expect(title).toContain("Lancement origine Éthiopie");
    expect(content.sections[0]!.text).toBe("Lancement origine Éthiopie");
  });
  it("est déterministe", () => {
    expect(JSON.stringify(composeAsset("PITCH", fullCtx))).toBe(JSON.stringify(composeAsset("PITCH", fullCtx)));
  });
});
