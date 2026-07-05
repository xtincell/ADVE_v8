import "server-only";
import type { ApplicationStatus, Prisma, TalentTier } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { getCommissionRates } from "@/server/settings";

// La Guilde (cahier §4.4) : dépôt public modéré, inscriptions talents/agences,
// candidatures avec devis structurés, décision opérateur (jamais premier-arrivé),
// commissions dégressives par tier talent.

// ── Dépôt de mission (public, sans compte) ─────────────────────────

export const missionDepositSchema = z.object({
  brandName: z.string().min(2).max(120),
  sector: z.string().min(1).max(80),
  country: z.string().length(2),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  title: z.string().min(8).max(160),
  summary: z.string().min(20).max(400),
  contexte: z.string().min(20).max(2000),
  objectifs: z.string().min(5).max(1500), // une ligne par objectif
  livrables: z.string().min(5).max(1500),
  contraintes: z.string().max(1000).optional().or(z.literal("")),
  skills: z.string().max(300).optional().or(z.literal("")), // séparées par virgules
  budgetMin: z.coerce.number().int().min(0).max(100_000_000).optional(),
  budgetMax: z.coerce.number().int().min(0).max(100_000_000).optional(),
  deadline: z.string().optional().or(z.literal("")),
});

export type MissionDeposit = z.infer<typeof missionDepositSchema>;

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 70) || "mission"
  );
}

/** Crée le client/marque « shell » + la mission en attente de modération. */
export async function depositMission(operatorId: string, input: MissionDeposit) {
  // Marque shell rattachée au dépôt (cahier §4.4) — l'opérateur pourra la fusionner plus tard.
  const baseSlug = slugify(input.brandName);
  let brandSlug = baseSlug;
  for (let i = 2; await db.brand.findUnique({ where: { operatorId_slug: { operatorId, slug: brandSlug } } }); i++) {
    brandSlug = `${baseSlug}-${i}`;
  }
  const brand = await db.brand.create({
    data: {
      operatorId,
      slug: brandSlug,
      name: input.brandName,
      sector: input.sector,
      country: input.country,
      isShell: true,
    },
  });

  const baseMission = slugify(input.title);
  let missionSlug = baseMission;
  for (let i = 2; await db.mission.findUnique({ where: { slug: missionSlug } }); i++) {
    missionSlug = `${baseMission}-${i}`;
  }

  const mission = await db.mission.create({
    data: {
      operatorId,
      brandId: brand.id,
      slug: missionSlug,
      title: input.title,
      summary: input.summary,
      brief: {
        contexte: input.contexte,
        objectifs: input.objectifs.split("\n").map((s) => s.trim()).filter(Boolean),
        livrables: input.livrables.split("\n").map((s) => s.trim()).filter(Boolean),
        contraintes: input.contraintes || undefined,
      } as Prisma.InputJsonValue,
      skills: (input.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      sector: input.sector,
      country: input.country,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      currency: "XOF",
      deadline: input.deadline ? new Date(input.deadline) : null,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone || null,
      status: "PENDING_REVIEW",
    },
  });
  return mission;
}

// ── Inscriptions (voie d'entrée canonique des profils — cahier §4.4) ──

export const talentSignupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  headline: z.string().min(4).max(160),
  bio: z.string().max(2000).optional().or(z.literal("")),
  skills: z.string().min(2).max(300),
  country: z.string().length(2),
  city: z.string().max(80).optional().or(z.literal("")),
  whatsapp: z.string().max(30).optional().or(z.literal("")),
  portfolio: z.string().max(1000).optional().or(z.literal("")), // une URL par ligne
});

export async function registerTalent(operatorId: string, input: z.infer<typeof talentSignupSchema>) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Un compte existe déjà avec cet email — connectez-vous.");
  const user = await db.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await hash(input.password, 10),
      roles: ["TALENT"],
      operatorId,
      country: input.country,
      phone: input.whatsapp || null,
    },
  });
  await db.talentProfile.create({
    data: {
      userId: user.id,
      operatorId,
      headline: input.headline,
      bio: input.bio || null,
      skills: input.skills.split(",").map((s) => s.trim()).filter(Boolean),
      portfolio: (input.portfolio ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ title: url.replace(/^https?:\/\//, "").slice(0, 60), url })) as Prisma.InputJsonValue,
      country: input.country,
      city: input.city || null,
      whatsapp: input.whatsapp || null,
      tier: "APPRENTI",
    },
  });
  return user;
}

export const agencySignupSchema = z.object({
  name: z.string().min(2).max(120), // nom du contact
  agencyName: z.string().min(2).max(160),
  email: z.string().email(),
  password: z.string().min(8),
  description: z.string().max(2000).optional().or(z.literal("")),
  services: z.string().min(2).max(300),
  country: z.string().length(2),
  website: z.string().url().optional().or(z.literal("")),
});

export async function registerAgency(operatorId: string, input: z.infer<typeof agencySignupSchema>) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Un compte existe déjà avec cet email — connectez-vous.");
  const user = await db.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await hash(input.password, 10),
      roles: ["AGENCY"],
      operatorId,
      country: input.country,
    },
  });
  await db.agencyProfile.create({
    data: {
      userId: user.id,
      operatorId,
      name: input.agencyName,
      description: input.description || null,
      services: input.services.split(",").map((s) => s.trim()).filter(Boolean),
      country: input.country,
      website: input.website || null,
    },
  });
  return user;
}

// ── Modération (opérateur décide — cahier §4.4) ────────────────────

export async function moderateMission(
  missionId: string,
  decision: "publish" | "reject",
  actor: { id: string; email: string; operatorId: string | null },
  reason?: string,
) {
  const mission = await db.mission.findUniqueOrThrow({ where: { id: missionId } });
  if (mission.operatorId !== actor.operatorId) throw new Error("Mission hors de votre tenant.");
  if (mission.status !== "PENDING_REVIEW") throw new Error("Cette mission n'est pas en attente de modération.");
  const updated = await db.mission.update({
    where: { id: missionId },
    data:
      decision === "publish"
        ? { status: "PUBLISHED", publishedAt: new Date(), moderatedById: actor.id, rejectedReason: null }
        : { status: "REJECTED", moderatedById: actor.id, rejectedReason: reason ?? "Non conforme aux critères de publication" },
  });
  await audit({
    operatorId: actor.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "mission.moderate",
    entity: "Mission",
    entityId: missionId,
    before: { status: mission.status },
    after: { status: updated.status, reason: reason ?? null },
  });
  return updated;
}

// ── Candidatures & devis structurés ────────────────────────────────

export const applicationSchema = z.object({
  missionId: z.string().min(1),
  message: z.string().min(20).max(3000),
  delaiJours: z.coerce.number().int().min(1).max(365),
  conditions: z.string().max(500).optional().or(z.literal("")),
  lignes: z
    .array(z.object({ label: z.string().min(1).max(160), amount: z.coerce.number().int().min(0) }))
    .min(1)
    .max(8),
});

export async function applyToMission(talentId: string, input: z.infer<typeof applicationSchema>) {
  const mission = await db.mission.findUniqueOrThrow({ where: { id: input.missionId } });
  if (mission.status !== "PUBLISHED") throw new Error("Cette mission n'est plus ouverte aux candidatures.");
  const profile = await db.talentProfile.findUnique({ where: { userId: talentId } });
  if (!profile) throw new Error("Complétez votre profil talent avant de candidater.");
  const total = input.lignes.reduce((s, l) => s + l.amount, 0);
  return db.missionApplication.create({
    data: {
      missionId: mission.id,
      talentId,
      status: "SUBMITTED",
      message: input.message,
      quote: {
        lignes: input.lignes,
        delaiJours: input.delaiJours,
        conditions: input.conditions || undefined,
      } as Prisma.InputJsonValue,
      quoteAmount: total,
    },
  });
}

/** Décision opérateur sur une candidature ; l'acceptation assigne la mission et crée le relevé de commission. */
export async function decideApplication(
  applicationId: string,
  decision: Extract<ApplicationStatus, "SHORTLISTED" | "ACCEPTED" | "REJECTED">,
  actor: { id: string; email: string; operatorId: string | null },
) {
  const application = await db.missionApplication.findUniqueOrThrow({
    where: { id: applicationId },
    include: { mission: true, talent: { include: { talentProfile: true } } },
  });
  if (application.mission.operatorId !== actor.operatorId) throw new Error("Candidature hors de votre tenant.");

  await db.$transaction(async (tx) => {
    await tx.missionApplication.update({
      where: { id: applicationId },
      data: { status: decision, decidedById: actor.id, decidedAt: new Date() },
    });

    if (decision === "ACCEPTED") {
      await tx.mission.update({
        where: { id: application.missionId },
        data: { status: "ASSIGNED", assignedTalentId: application.talentId },
      });
      // Les autres candidatures encore ouvertes sont refusées proprement.
      await tx.missionApplication.updateMany({
        where: { missionId: application.missionId, id: { not: applicationId }, status: { in: ["SUBMITTED", "SHORTLISTED"] } },
        data: { status: "REJECTED", decidedById: actor.id, decidedAt: new Date() },
      });
      // Relevé de commission par tier talent (taux en config — cahier §6.2).
      const gross = application.quoteAmount ?? 0;
      if (gross > 0 && actor.operatorId) {
        const rates = await getCommissionRates(actor.operatorId);
        const tier: TalentTier = application.talent.talentProfile?.tier ?? "APPRENTI";
        const rate = rates[tier] ?? 0.25;
        const commission = Math.round(gross * rate);
        await tx.earning.create({
          data: {
            operatorId: actor.operatorId,
            talentId: application.talentId,
            missionId: application.missionId,
            applicationId,
            grossAmount: gross,
            commissionRate: rate,
            commissionAmount: commission,
            netAmount: gross - commission,
            currency: application.mission.currency,
            status: "PENDING",
          },
        });
      }
    }

    await tx.notification.create({
      data: {
        userId: application.talentId,
        type: "APPLICATION_DECIDED",
        title:
          decision === "ACCEPTED"
            ? "Candidature retenue 🎉"
            : decision === "SHORTLISTED"
              ? "Vous êtes en présélection"
              : "Candidature non retenue",
        body: `Mission « ${application.mission.title} »`,
        href: "/creator",
      },
    });

    await audit(
      {
        operatorId: actor.operatorId,
        actorId: actor.id,
        actorEmail: actor.email,
        action: "application.decide",
        entity: "MissionApplication",
        entityId: applicationId,
        before: { status: application.status },
        after: { status: decision },
      },
      tx,
    );
  });
}
