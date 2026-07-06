"use server";

import { redirect } from "next/navigation";
import { updateSession } from "@/server/auth";
import { requireUser } from "@/server/auth/guards";
import { confirmMfaEnrollment } from "@/server/auth/mfa";

export interface MfaFormState {
  error?: string;
}

export async function confirmMfaAction(_prev: MfaFormState, formData: FormData): Promise<MfaFormState> {
  const user = await requireUser("/mfa");
  const code = String(formData.get("code") ?? "");
  const ok = await confirmMfaEnrollment(user.id, code);
  if (!ok) return { error: "Code invalide — vérifiez l'heure de votre téléphone et réessayez." };
  await updateSession({}); // rafraîchit le JWT (mfaEnabled) depuis la base
  redirect("/apres-connexion");
}
