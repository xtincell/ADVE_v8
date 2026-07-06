import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { asPillarFields, pillarDef } from "@/server/brands/pillar-config";
import type { FrozenPillars } from "@/server/oracle/context";
import { sectionDef } from "@/server/oracle/sections";
import { assetContentSchema } from "@/server/assets";
import { callLlm } from "./gateway";

// Les 5 usages LLM du produit (cahier §9) — TOUS optionnels, chacun doublé d'un
// équivalent manuel qui passe par les mêmes endpoints. Règles :
// - le LLM PROPOSE, l'humain VALIDE : aucune écriture directe de données de marque ;
// - jamais de champ non-inférable pré-rempli ;
// - matière première = le déclaré fourni dans le prompt, rien d'autre.

const SYSTEM_BASE =
  "Tu es le copilote stratégique de La Fusée (méthode ADVE, marques d'Afrique francophone). " +
  "Tu réponds UNIQUEMENT en JSON valide conforme au schéma demandé, en français. " +
  "Règle absolue : tu n'inventes JAMAIS un fait (chiffre, nom, preuve, canal). " +
  "Tu ne travailles qu'avec la matière fournie ; ce qui manque reste absent.";

// ─────────────────────────────── 1. Pré-remplissage intake (texte libre → questionnaire)

const prefillSchema = z.object({
  brandName: z.string().optional(),
  city: z.string().optional(),
  online: z.string().optional(),
  sector: z.string().optional(),
  histoire: z.string().optional(),
  valeurs: z.string().optional(),
  preuves: z.string().optional(),
  canaux: z.array(z.string()).optional(),
  rituels: z.string().optional(),
  communaute: z.string().optional(),
});

export type IntakePrefill = z.infer<typeof prefillSchema>;

/**
 * Remplit le QUESTIONNAIRE (jamais la marque) depuis un texte libre. Les champs
 * non-inférables (positionnement, promesse, personas, catalogue, business model…)
 * sont exclus par construction : l'humain les saisit lui-même.
 */
export async function prefillIntake(freeText: string, sectors: string[]): Promise<IntakePrefill> {
  return callLlm({
    purpose: "intake_prefill",
    system: SYSTEM_BASE,
    prompt:
      `Texte libre d'un fondateur sur sa marque :\n"""${freeText.slice(0, 6000)}"""\n\n` +
      `Extrais UNIQUEMENT ce qui est réellement présent dans le texte vers ce JSON (omets toute clé sans matière) :\n` +
      `{"brandName"?: string, "city"?: string, "online"?: string, "sector"?: string (parmi : ${sectors.join(", ")}), ` +
      `"histoire"?: string (2-4 phrases reprenant les faits du texte), "valeurs"?: string (une valeur par ligne, \\n), ` +
      `"preuves"?: string, "canaux"?: string[], "rituels"?: string, "communaute"?: string}\n` +
      `Interdit d'extrapoler un positionnement, une promesse, des personas, un catalogue ou un business model.`,
    schema: prefillSchema,
    maxTokens: 1200,
  });
}

// ─────────────────────────────── 2. Reformulation ADVE assistée (preview, jamais d'écriture)

const reformulateSchema = z.object({ suggestion: z.string().min(1).max(4000) });

export type ReformulateMode = "LLM_REFORMULATE" | "LLM_STRATEGIC";

/** Propose une réécriture d'un champ ADVE — la sauvegarde reste le geste de l'humain (amendPillar). */
export async function reformulateField(input: {
  brandId: string;
  operatorId: string;
  kind: string;
  fieldKey: string;
  currentValue: string;
  mode: ReformulateMode;
}): Promise<string> {
  const def = pillarDef(input.kind as never);
  const field = def.fields.find((f) => f.key === input.fieldKey);
  const label = field?.label ?? input.fieldKey;
  const instruction =
    input.mode === "LLM_REFORMULATE"
      ? "Reformule pour la clarté et la force : même substance, mêmes faits, zéro ajout, coupe le flou."
      : "Restructure en lecture stratégique : hiérarchise ce qui différencie, garde chaque fait tel quel, n'ajoute rien.";
  const { suggestion } = await callLlm({
    purpose: "adve_reformulate",
    system: SYSTEM_BASE,
    prompt:
      `Champ « ${label} » (pilier ${def.name}) d'une marque. Texte actuel :\n"""${input.currentValue.slice(0, 3000)}"""\n\n` +
      `${instruction}\n` +
      (field?.type === "list" ? "Conserve le format liste : un élément par ligne (\\n).\n" : "") +
      `Réponds : {"suggestion": string}`,
    schema: reformulateSchema,
    operatorId: input.operatorId,
    brandId: input.brandId,
    maxTokens: 800,
  });
  return suggestion;
}

// ─────────────────────────────── 3. Enrichissement Oracle (sections 22–35)

const llmBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("p"), text: z.string().min(1).max(2000) }),
  z.object({ type: z.literal("list"), items: z.array(z.string().min(1)).min(1).max(12), ordered: z.boolean().optional() }),
  z.object({ type: z.literal("kv"), rows: z.array(z.tuple([z.string(), z.string()])).min(1).max(12) }),
  z.object({ type: z.literal("callout"), text: z.string().min(1).max(600), tone: z.enum(["info", "warning", "success"]).optional() }),
]);

const enrichSchema = z.object({ blocks: z.array(llmBlockSchema).min(1).max(10) });

/**
 * Enrichit UNE section éligible (n° ≥ 22) depuis le snapshot GELÉ du rapport.
 * Le contenu déterministe reste la base ; en échec LLM, il demeure intact.
 */
export async function enrichOracleSection(reportId: string, number: number): Promise<void> {
  const def = sectionDef(number);
  if (!def.llmEligible) throw new Error(`La section ${number} est déterministe — pas d'enrichissement LLM.`);
  const row = await db.oracleSection.findUniqueOrThrow({
    where: { reportId_number: { reportId, number } },
    include: { report: { include: { brand: true } } },
  });
  const frozen = row.report.pillarsFrozen as unknown as FrozenPillars;
  const declared: Record<string, unknown> = {};
  for (const [kind, fields] of Object.entries(frozen)) {
    declared[kind] = Object.fromEntries(
      Object.entries(fields ?? {}).map(([k, f]) => [k, f.value]),
    );
  }
  const { blocks } = await callLlm({
    purpose: "oracle_enrich",
    system: SYSTEM_BASE,
    prompt:
      `Rapport Oracle de « ${row.report.brand.name} » (${row.report.brand.sector ?? "secteur non déclaré"}), ` +
      `section ${number} « ${def.title} ».\n` +
      `Socle DÉCLARÉ gelé (seule matière autorisée) :\n${JSON.stringify(declared).slice(0, 8000)}\n\n` +
      `Rédige cette section en t'appuyant exclusivement sur ce socle. Si la matière manque pour un point, dis-le plutôt que de l'inventer.\n` +
      `Réponds : {"blocks": [{"type":"p","text":string} | {"type":"list","items":string[]} | {"type":"kv","rows":[string,string][]} | {"type":"callout","text":string,"tone"?:"info"|"warning"|"success"}]}`,
    schema: enrichSchema,
    operatorId: row.report.brand.operatorId,
    brandId: row.report.brandId,
    maxTokens: 2000,
  });
  const content = {
    blocks,
    sources: ["Piliers gelés du rapport (enrichissement IA — relecture humaine recommandée)"],
  };
  await db.oracleSection.update({
    where: { id: row.id },
    data: {
      status: "COMPLETE",
      content: content as unknown as Prisma.InputJsonValue,
      llmUsed: true,
      generatedAt: new Date(),
    },
  });
}

// ─────────────────────────────── 4. Amélioration d'asset (nouvelle version DRAFT)

/** Améliore un asset de la forge → NOUVELLE version DRAFT llmUsed (l'active reste intact). */
export async function improveAsset(assetId: string, actorId: string): Promise<string> {
  const asset = await db.brandAsset.findUniqueOrThrow({
    where: { id: assetId },
    include: { brand: true },
  });
  const parsed = assetContentSchema.parse(asset.content);
  const pillars = await db.pillar.findMany({
    where: { brandId: asset.brandId, kind: { in: ["AUTHENTICITE", "DISTINCTION", "VALEUR", "ENGAGEMENT"] } },
  });
  const declared = Object.fromEntries(
    pillars.map((p) => [
      p.kind,
      Object.fromEntries(Object.entries(asPillarFields(p.fields)).map(([k, f]) => [k, f.value])),
    ]),
  );
  const improved = await callLlm({
    purpose: "asset_improve",
    system: SYSTEM_BASE,
    prompt:
      `Livrable « ${asset.title} » de la marque ${asset.brand.name}. Sections actuelles :\n` +
      `${JSON.stringify(parsed.sections).slice(0, 6000)}\n\n` +
      `Socle déclaré (seule matière autorisée) :\n${JSON.stringify(declared).slice(0, 6000)}\n\n` +
      `Améliore l'écriture de chaque section (plus incarnée, plus précise) SANS changer les titres, ` +
      `sans inventer de fait, et en conservant tel quel tout marqueur « [À compléter : …] » dont la matière manque toujours.\n` +
      `Réponds : {"sections": [{"title": string, "text": string}]} — mêmes titres, même ordre.`,
    schema: assetContentSchema,
    operatorId: asset.brand.operatorId,
    brandId: asset.brandId,
    maxTokens: 2500,
  });
  const last = await db.brandAsset.findFirst({
    where: { brandId: asset.brandId, kind: asset.kind },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const draft = await db.brandAsset.create({
    data: {
      brandId: asset.brandId,
      kind: asset.kind,
      title: asset.title,
      content: improved as unknown as Prisma.InputJsonValue,
      status: "DRAFT",
      version: (last?.version ?? 0) + 1,
      llmUsed: true,
      createdById: actorId,
    },
  });
  return draft.id;
}

// ─────────────────────────────── 5. Brouillon de mission Guilde

const missionDraftSchema = z.object({
  title: z.string().min(8).max(140),
  summary: z.string().min(20).max(400),
  contexte: z.string().min(20).max(1200),
  objectifs: z.array(z.string().min(3)).min(1).max(6),
  livrables: z.array(z.string().min(3)).min(1).max(8),
  contraintes: z.string().max(600).optional(),
  skills: z.array(z.string().min(2)).max(6).optional(),
});

export type MissionDraft = z.infer<typeof missionDraftSchema>;

/** Structure un brief de mission depuis une description brute — le déposant relit et soumet. */
export async function draftMission(rawDescription: string): Promise<MissionDraft> {
  return callLlm({
    purpose: "mission_draft",
    system: SYSTEM_BASE,
    prompt:
      `Description brute d'un besoin déposé sur La Guilde (marketplace de missions créatives) :\n` +
      `"""${rawDescription.slice(0, 4000)}"""\n\n` +
      `Structure un brief clair SANS coordonnées personnelles et sans inventer de budget ni de délai.\n` +
      `Réponds : {"title": string, "summary": string (2-3 phrases publiques), "contexte": string, ` +
      `"objectifs": string[], "livrables": string[], "contraintes"?: string, "skills"?: string[]}`,
    schema: missionDraftSchema,
    maxTokens: 1200,
  });
}

