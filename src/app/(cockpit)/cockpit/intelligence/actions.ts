"use server";

import { revalidatePath } from "next/cache";
import type { DevotionLevel, Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { checkSubscriptionGate } from "@/server/billing/gates";
import { cultIndex, devotionFromMembers } from "@/server/intelligence/measures";

export interface IntelFormState {
  ok?: boolean;
  error?: string;
}

const memberSchema = z.object({
  brandId: z.string().min(1),
  name: z.string().min(2).max(120),
  handle: z.string().max(80).optional().or(z.literal("")),
  channel: z.string().max(40).optional().or(z.literal("")),
  level: z.enum(["SPECTATEUR", "INTERESSE", "PARTICIPANT", "ENGAGE", "AMBASSADEUR", "EVANGELISTE"]),
  note: z.string().max(300).optional().or(z.literal("")),
});

/** Historise l'état communautaire dans un snapshot (Cult Index, ladder). */
async function snapshotCommunity(brandId: string): Promise<void> {
  const [brand, members] = await Promise.all([
    db.brand.findUniqueOrThrow({ where: { id: brandId } }),
    db.communityMember.findMany({ where: { brandId }, select: { level: true } }),
  ]);
  const devotion = devotionFromMembers(members.map((m) => m.level as DevotionLevel));
  const cult = cultIndex(devotion);
  const pillars = await db.pillar.findMany({ where: { brandId }, select: { kind: true, score: true } });
  const pillarScores = Object.fromEntries(pillars.map((p) => [p.kind, p.score]));
  await db.brandSnapshot.create({
    data: {
      brandId,
      score: brand.score,
      tier: brand.tier,
      pillarScores: pillarScores as Prisma.InputJsonValue,
      cultIndex: cult?.value ?? null,
      devotion: devotion as unknown as Prisma.InputJsonValue,
      followers: members.length,
    },
  });
}

async function guard(brandId: string) {
  const user = await requireUser("/cockpit/intelligence");
  const gate = await checkSubscriptionGate(user);
  if (!gate.allowed) throw new Error("TIER_GATE_DENIED");
  const brand = await getOwnedBrand(user, brandId);
  if (!brand) throw new Error("Marque introuvable ou accès refusé.");
  return { user, brand };
}

export async function addMemberAction(_prev: IntelFormState, formData: FormData): Promise<IntelFormState> {
  const parsed = memberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Nom (2 caractères min.) et échelon requis." };
  let brand;
  try {
    ({ brand } = await guard(parsed.data.brandId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Accès refusé." };
  }
  await db.communityMember.create({
    data: {
      brandId: brand.id,
      name: parsed.data.name,
      handle: parsed.data.handle || null,
      channel: parsed.data.channel || null,
      level: parsed.data.level,
      note: parsed.data.note || null,
    },
  });
  await snapshotCommunity(brand.id);
  revalidatePath("/cockpit/intelligence");
  return { ok: true };
}

export async function updateMemberLevelAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const level = String(formData.get("level") ?? "") as DevotionLevel;
  const member = await db.communityMember.findUnique({ where: { id } });
  if (!member) return;
  try {
    await guard(member.brandId);
  } catch {
    return;
  }
  await db.communityMember.update({ where: { id }, data: { level } });
  await snapshotCommunity(member.brandId);
  revalidatePath("/cockpit/intelligence");
}

export async function deleteMemberAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const member = await db.communityMember.findUnique({ where: { id } });
  if (!member) return;
  try {
    await guard(member.brandId);
  } catch {
    return;
  }
  await db.communityMember.delete({ where: { id } });
  await snapshotCommunity(member.brandId);
  revalidatePath("/cockpit/intelligence");
}

const signalSchema = z.object({
  brandId: z.string().min(1),
  title: z.string().min(5).max(300),
  url: z.string().url().optional().or(z.literal("")),
  summary: z.string().max(500).optional().or(z.literal("")),
});

/** Saisie manuelle d'un signal marché (manual-first — la veille auto vient du cron `signals`). */
export async function addSignalAction(_prev: IntelFormState, formData: FormData): Promise<IntelFormState> {
  const parsed = signalSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Titre requis (5 caractères min.), URL valide si fournie." };
  let brand;
  try {
    ({ brand } = await guard(parsed.data.brandId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Accès refusé." };
  }
  await db.marketSignal.create({
    data: {
      operatorId: brand.operatorId,
      brandId: brand.id,
      sector: brand.sector,
      source: "MANUAL",
      title: parsed.data.title,
      url: parsed.data.url || null,
      summary: parsed.data.summary || null,
    },
  });
  revalidatePath("/cockpit/intelligence");
  return { ok: true };
}
