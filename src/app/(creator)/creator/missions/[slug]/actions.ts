"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/server/auth/guards";
import { applicationSchema, applyToMission } from "@/server/guild";

export interface ApplyFormState {
  error?: string;
}

export async function applyToMissionAction(_prev: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const user = await requireRole(["TALENT"], "/creator/missions");

  const lignes: { label: string; amount: string }[] = [];
  for (let i = 0; i < 8; i++) {
    const label = String(formData.get(`ligne-label-${i}`) ?? "").trim();
    const amount = String(formData.get(`ligne-amount-${i}`) ?? "").trim();
    if (label && amount) lignes.push({ label, amount });
  }

  const parsed = applicationSchema.safeParse({
    missionId: formData.get("missionId"),
    message: formData.get("message"),
    delaiJours: formData.get("delaiJours"),
    conditions: formData.get("conditions"),
    lignes,
  });
  if (!parsed.success) {
    return { error: "Complétez votre approche, au moins un poste de devis chiffré et le délai." };
  }
  try {
    await applyToMission(user.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Candidature impossible." };
  }
  revalidatePath("/creator", "layout");
  return {};
}
