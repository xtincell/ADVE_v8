import { randomBytes } from "node:crypto";
import type { PillarKind, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { amendPillar } from "@/server/brands/amend";
import { ADVE_KINDS, type PillarFields } from "@/server/brands/pillar-config";
import { compositeScore, scorePillar, tierForScore } from "@/server/scoring/score";

// Intake public (cahier §4.1) : questionnaire guidé accessible par token, sans compte.
// Produit une ébauche ADVE (certitude DECLARED — c'est l'humain qui saisit) + un score.

export const intakeAnswersSchema = z.object({
  brandName: z.string().min(1).max(120),
  sector: z.string().min(1).max(80),
  country: z.string().length(2),
  city: z.string().max(80).optional().or(z.literal("")),
  online: z.string().max(200).optional().or(z.literal("")),

  histoire: z.string().max(4000).optional().or(z.literal("")),
  valeurs: z.string().max(1000).optional().or(z.literal("")),

  catalogue: z.string().max(4000).optional().or(z.literal("")),
  business_model: z.string().max(4000).optional().or(z.literal("")),
  preuves: z.string().max(4000).optional().or(z.literal("")),

  positionnement: z.string().max(4000).optional().or(z.literal("")),
  promesse_maitre: z.string().max(500).optional().or(z.literal("")),
  personas: z.string().max(4000).optional().or(z.literal("")),

  canaux: z.array(z.string().max(60)).max(12).optional(),
  rituels: z.string().max(4000).optional().or(z.literal("")),
  communaute: z.string().max(4000).optional().or(z.literal("")),

  email: z.string().email().optional().or(z.literal("")),
});

export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>;

/** Correspondance réponse d'intake → champ de pilier. */
const ANSWER_TO_FIELD: Record<string, { kind: PillarKind; key: string }> = {
  histoire: { kind: "AUTHENTICITE", key: "histoire" },
  valeurs: { kind: "AUTHENTICITE", key: "valeurs" },
  catalogue: { kind: "VALEUR", key: "catalogue" },
  business_model: { kind: "VALEUR", key: "business_model" },
  preuves: { kind: "VALEUR", key: "preuves" },
  positionnement: { kind: "DISTINCTION", key: "positionnement" },
  promesse_maitre: { kind: "DISTINCTION", key: "promesse_maitre" },
  personas: { kind: "DISTINCTION", key: "personas" },
  canaux: { kind: "ENGAGEMENT", key: "canaux" },
  rituels: { kind: "ENGAGEMENT", key: "rituels" },
  communaute: { kind: "ENGAGEMENT", key: "communaute" },
};

export type DraftPillars = Partial<Record<PillarKind, PillarFields>>;

/** Construit l'ébauche ADVE à partir des réponses — pur, déterministe. */
export function draftFromAnswers(answers: Partial<IntakeAnswers>): DraftPillars {
  const now = new Date().toISOString();
  const draft: DraftPillars = {};
  for (const [answerKey, target] of Object.entries(ANSWER_TO_FIELD)) {
    const raw = answers[answerKey as keyof IntakeAnswers];
    if (raw == null) continue;
    let value: string | string[];
    if (Array.isArray(raw)) {
      value = raw.map((s) => s.trim()).filter(Boolean);
      if (value.length === 0) continue;
    } else {
      value = String(raw).trim();
      if (!value) continue;
      // Les champs « liste » saisis en textarea : une entrée par ligne.
      if (target.key === "valeurs") value = value.split("\n").map((s) => s.trim()).filter(Boolean);
    }
    draft[target.kind] = draft[target.kind] ?? {};
    draft[target.kind]![target.key] = { value, certainty: "DECLARED", updatedAt: now };
  }
  return draft;
}

/** Score d'une ébauche (ADVE seul — les RTIS naissent dans le cockpit). */
export function scoreDraft(draft: DraftPillars): { composite: number; perPillar: Record<string, number> } {
  const perPillar: Partial<Record<PillarKind, number>> = {};
  for (const kind of ADVE_KINDS) {
    perPillar[kind] = scorePillar(kind, draft[kind] ?? {});
  }
  // Sans refresh RTIS (réservé au cockpit), les piliers dérivés valent 0 : composite = ADVE seul.
  return { composite: compositeScore(perPillar), perPillar: perPillar as Record<string, number> };
}

export async function createIntakeSession(operatorId: string): Promise<string> {
  const token = randomBytes(18).toString("base64url");
  await db.intakeSession.create({ data: { token, operatorId } });
  return token;
}

export async function getIntakeSession(token: string) {
  return db.intakeSession.findUnique({ where: { token } });
}

export async function saveIntakeAnswers(token: string, answers: Partial<IntakeAnswers>): Promise<void> {
  const session = await db.intakeSession.findUniqueOrThrow({ where: { token } });
  if (session.status === "ACTIVATED") throw new Error("Ce diagnostic a déjà été activé.");
  const current = (session.answers ?? {}) as Record<string, unknown>;
  await db.intakeSession.update({
    where: { token },
    data: {
      answers: { ...current, ...answers } as Prisma.InputJsonValue,
      brandName: (answers.brandName as string) ?? session.brandName,
      email: answers.email || session.email,
    },
  });
}

export async function submitIntake(token: string) {
  const session = await db.intakeSession.findUniqueOrThrow({ where: { token } });
  if (session.status === "ACTIVATED") throw new Error("Ce diagnostic a déjà été activé.");
  const answers = intakeAnswersSchema.parse(session.answers);
  const draft = draftFromAnswers(answers);
  const { composite } = scoreDraft(draft);
  const tier = tierForScore(composite);
  return db.intakeSession.update({
    where: { token },
    data: {
      status: "SCORED",
      draftFields: draft as unknown as Prisma.InputJsonValue,
      score: composite,
      tier,
      submittedAt: session.submittedAt ?? new Date(),
    },
  });
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "marque";
}

/** Activation (cahier §4.1) : crée la marque depuis l'ébauche, via le point d'écriture unique. */
export async function activateIntake(token: string, userId: string) {
  const session = await db.intakeSession.findUniqueOrThrow({ where: { token } });
  if (session.status === "ACTIVATED" && session.brandId) {
    return db.brand.findUniqueOrThrow({ where: { id: session.brandId } });
  }
  if (session.status !== "SCORED") throw new Error("Le diagnostic doit être soumis avant l'activation.");

  const answers = intakeAnswersSchema.parse(session.answers);
  const base = slugify(answers.brandName);
  let slug = base;
  for (let i = 2; await db.brand.findUnique({ where: { operatorId_slug: { operatorId: session.operatorId, slug } } }); i++) {
    slug = `${base}-${i}`;
  }

  const brand = await db.brand.create({
    data: {
      operatorId: session.operatorId,
      slug,
      name: answers.brandName,
      sector: answers.sector,
      country: answers.country,
      city: answers.city || null,
      founderId: userId,
    },
  });

  const draft = (session.draftFields ?? {}) as unknown as DraftPillars;
  for (const kind of ADVE_KINDS) {
    const fields = draft[kind];
    if (!fields || Object.keys(fields).length === 0) continue;
    const changes = Object.fromEntries(
      Object.entries(fields).map(([key, state]) => [key, { value: state.value, certainty: state.certainty }]),
    );
    await amendPillar({
      brandId: brand.id,
      kind,
      changes,
      mode: "INTAKE",
      actor: { id: userId, email: answers.email || undefined },
      note: "Création depuis le diagnostic",
    });
  }

  await db.intakeSession.update({
    where: { token },
    data: { status: "ACTIVATED", brandId: brand.id },
  });

  return db.brand.findUniqueOrThrow({ where: { id: brand.id } });
}
