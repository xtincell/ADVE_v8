import { describe, expect, it } from "vitest";
import {
  compositeScore,
  scorePillar,
  structuralCompleteness,
  tierForScore,
} from "./score";
import { PILLARS, nonInferableFields, type PillarFields } from "@/server/brands/pillar-config";

const now = new Date().toISOString();
const field = (value: string | string[], certainty: "DECLARED" | "INFERRED" | "OFFICIAL" = "OFFICIAL") => ({
  value,
  certainty,
  updatedAt: now,
});

describe("structuralCompleteness", () => {
  it("vide = 0 (honest-empty : un trou ne rapporte rien)", () => {
    expect(structuralCompleteness(undefined)).toBe(0);
    expect(structuralCompleteness("")).toBe(0);
    expect(structuralCompleteness("   ")).toBe(0);
    expect(structuralCompleteness([])).toBe(0);
    expect(structuralCompleteness(["", " "])).toBe(0);
  });
  it("progresse avec la longueur du texte", () => {
    expect(structuralCompleteness("court")).toBe(0.35);
    expect(structuralCompleteness("a".repeat(50))).toBe(0.7);
    expect(structuralCompleteness("a".repeat(200))).toBe(1);
  });
  it("progresse avec le nombre d'items d'une liste", () => {
    expect(structuralCompleteness(["un"])).toBe(0.45);
    expect(structuralCompleteness(["un", "deux"])).toBe(0.7);
    expect(structuralCompleteness(["un", "deux", "trois"])).toBe(1);
  });
});

describe("scorePillar", () => {
  it("pilier vide = 0", () => {
    expect(scorePillar("AUTHENTICITE", {})).toBe(0);
  });
  it("pilier complet OFFICIAL = 25", () => {
    const fields: PillarFields = {};
    for (const f of PILLARS[0]!.fields) {
      fields[f.key] = field(f.type === "list" ? ["a", "b", "c"] : "x".repeat(150));
    }
    expect(scorePillar("AUTHENTICITE", fields)).toBe(25);
  });
  it("INFERRED vaut moins que DECLARED qui vaut moins qu'OFFICIAL (pilier complet)", () => {
    const mk = (c: "DECLARED" | "INFERRED" | "OFFICIAL") => {
      const fields: PillarFields = {};
      for (const f of PILLARS[0]!.fields) {
        fields[f.key] = field(f.type === "list" ? ["a", "b", "c"] : "x".repeat(150), c);
      }
      return scorePillar("AUTHENTICITE", fields);
    };
    expect(mk("INFERRED")).toBeLessThan(mk("DECLARED")); // 15 < 23
    expect(mk("DECLARED")).toBeLessThan(mk("OFFICIAL")); // 23 < 25
  });
  it("est un pur calcul : même entrée, même sortie (zéro LLM, zéro aléa)", () => {
    const fields = { histoire: field("Une histoire de marque assez détaillée pour compter vraiment.") };
    const a = scorePillar("AUTHENTICITE", fields);
    const b = scorePillar("AUTHENTICITE", fields);
    expect(a).toBe(b);
  });
});

describe("compositeScore & paliers (bornes cahier §3.3)", () => {
  it("composite = somme des 8 piliers, max 200", () => {
    const all = Object.fromEntries(PILLARS.map((p) => [p.kind, 25]));
    expect(compositeScore(all)).toBe(200);
    expect(compositeScore({})).toBe(0);
  });
  it("paliers aux bornes exactes", () => {
    expect(tierForScore(0)).toBe("LATENT");
    expect(tierForScore(40)).toBe("LATENT");
    expect(tierForScore(41)).toBe("FRAGILE");
    expect(tierForScore(80)).toBe("FRAGILE");
    expect(tierForScore(81)).toBe("ORDINAIRE");
    expect(tierForScore(120)).toBe("ORDINAIRE");
    expect(tierForScore(121)).toBe("FORTE");
    expect(tierForScore(160)).toBe("FORTE");
    expect(tierForScore(161)).toBe("CULTE");
    expect(tierForScore(180)).toBe("CULTE");
    expect(tierForScore(181)).toBe("ICONE");
    expect(tierForScore(200)).toBe("ICONE");
  });
});

describe("scoring des piliers dérivés (socle × fraîcheur)", () => {
  it("jamais recalculé = 0, périmé = moitié, frais = plein", async () => {
    const { adveCompletenessRatio, derivedFreshness, scoreDerivedPillar } = await import("./score");
    const ratio = adveCompletenessRatio({ AUTHENTICITE: 25, DISTINCTION: 25, VALEUR: 25, ENGAGEMENT: 25 });
    expect(ratio).toBe(1);
    expect(scoreDerivedPillar(ratio, derivedFreshness({ version: 0, stale: false }))).toBe(0);
    expect(scoreDerivedPillar(ratio, derivedFreshness({ version: 3, stale: true }))).toBe(13);
    expect(scoreDerivedPillar(ratio, derivedFreshness({ version: 3, stale: false }))).toBe(25);
  });
  it("un socle ADVE faible plafonne les piliers dérivés (pas d'incitation inversée)", async () => {
    const { adveCompletenessRatio, scoreDerivedPillar } = await import("./score");
    const weak = adveCompletenessRatio({ AUTHENTICITE: 10, DISTINCTION: 5, VALEUR: 8, ENGAGEMENT: 7 });
    expect(scoreDerivedPillar(weak, 1)).toBe(8); // 25 × 0.30
  });
});

describe("verrous produit (cahier §3.1)", () => {
  it("exactement 7 champs non-inférables : archétype, noyau, positionnement, promesse, personas, catalogue, business model", () => {
    const keys = nonInferableFields().map((f) => f.key).sort();
    expect(keys).toEqual(
      ["archetype", "business_model", "catalogue", "noyau_identitaire", "personas", "positionnement", "promesse_maitre"].sort(),
    );
  });
  it("aucun LLM ni réseau dans le chemin de scoring (verrou cahier §3.3)", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const dir = path.dirname(new URL(import.meta.url).pathname);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      const src = fs.readFileSync(path.join(dir, file), "utf8");
      expect(src, `${file} ne doit pas importer le module LLM`).not.toMatch(/server\/llm/);
      expect(src, `${file} ne doit faire aucun appel réseau`).not.toMatch(/\bfetch\s*\(/);
      expect(src, `${file} ne doit pas être aléatoire`).not.toMatch(/Math\.random/);
    }
  });
});
