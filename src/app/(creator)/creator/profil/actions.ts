"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireRole } from "@/server/auth/guards";

export interface ProfilFormState {
  ok?: boolean;
  error?: string;
}

const profilSchema = z.object({
  headline: z.string().min(3).max(120),
  bio: z.string().max(1000).optional().or(z.literal("")),
  skills: z.string().max(400),
  city: z.string().max(80).optional().or(z.literal("")),
  country: z.string().length(2).or(z.literal("")),
  whatsapp: z.string().max(30).optional().or(z.literal("")),
});

/** Édition du profil talent (manual-first) — le profil pilote la visibilité annuaire et le tier de commission. */
export async function updateTalentProfileAction(_prev: ProfilFormState, formData: FormData): Promise<ProfilFormState> {
  const user = await requireRole(["TALENT"], "/creator/profil");
  const parsed = profilSchema.safeParse({
    headline: formData.get("headline"),
    bio: formData.get("bio"),
    skills: formData.get("skills"),
    city: formData.get("city"),
    country: formData.get("country"),
    whatsapp: formData.get("whatsapp"),
  });
  if (!parsed.success) return { error: "Accroche requise (3 caractères min.)." };
  if (!user.operatorId) return { error: "Compte sans opérateur." };
  const skills = parsed.data.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const available = formData.get("available") === "on";
  await db.talentProfile.upsert({
    where: { userId: user.id },
    update: {
      headline: parsed.data.headline,
      bio: parsed.data.bio || null,
      skills,
      city: parsed.data.city || null,
      country: parsed.data.country || null,
      whatsapp: parsed.data.whatsapp || null,
      available,
    },
    create: {
      userId: user.id,
      operatorId: user.operatorId,
      headline: parsed.data.headline,
      bio: parsed.data.bio || null,
      skills,
      city: parsed.data.city || null,
      country: parsed.data.country || null,
      whatsapp: parsed.data.whatsapp || null,
      available,
    },
  });
  revalidatePath("/creator");
  revalidatePath("/creator/profil");
  revalidatePath("/guilde/talents");
  return { ok: true };
}
