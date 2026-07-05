"use server";

import { redirect } from "next/navigation";
import { getDefaultOperator } from "@/server/tenancy";
import {
  createIntakeSession,
  intakeAnswersSchema,
  saveIntakeAnswers,
  submitIntake,
  type IntakeAnswers,
} from "@/server/intake";

export async function startDiagnostic(): Promise<void> {
  const operator = await getDefaultOperator();
  const token = await createIntakeSession(operator.id);
  redirect(`/diagnostic/${token}`);
}

export async function saveDiagnosticStep(
  token: string,
  data: Partial<IntakeAnswers>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = intakeAnswersSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "Certains champs sont invalides — vérifiez votre saisie." };
  }
  try {
    await saveIntakeAnswers(token, parsed.data);
    return { ok: true };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer — le lien de diagnostic est-il encore valide ?" };
  }
}

export async function submitDiagnostic(
  token: string,
  data: Partial<IntakeAnswers>,
): Promise<{ ok: false; error: string } | never> {
  const save = await saveDiagnosticStep(token, data);
  if (!save.ok) return save;
  try {
    await submitIntake(token);
  } catch (e) {
    const message =
      e instanceof Error && e.message.includes("brandName")
        ? "Le nom de la marque est requis (étape 1)."
        : "Le diagnostic est incomplet — vérifiez les étapes obligatoires.";
    return { ok: false, error: message };
  }
  redirect(`/diagnostic/${token}/resultat`);
}
