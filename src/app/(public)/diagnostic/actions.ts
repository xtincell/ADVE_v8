"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import {
  createIntakeSession,
  intakeAnswersSchema,
  saveIntakeAnswers,
  submitIntake,
  type IntakeAnswers,
} from "@/server/intake";
import { llmAvailable } from "@/server/llm/gateway";
import { prefillIntake, type IntakePrefill } from "@/server/llm/usages";

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

/**
 * Pré-remplissage IA du questionnaire (cahier §4.1) — OPTIONNEL. Le LLM propose,
 * l'humain relit : les champs soumis tels quels resteront « À valider » (INFERRED).
 * Les champs non-inférables ne sont jamais proposés.
 */
export async function prefillDiagnosticAction(
  token: string,
  freeText: string,
  sectors: string[],
): Promise<{ ok: true; prefill: IntakePrefill } | { ok: false; error: string }> {
  if (!llmAvailable()) return { ok: false, error: "Assistance IA non configurée." };
  if (freeText.trim().length < 40) {
    return { ok: false, error: "Collez un texte d'au moins 40 caractères (votre bio, votre site, un pitch…)." };
  }
  const session = await db.intakeSession.findUnique({ where: { token } });
  if (!session || session.status === "ACTIVATED") return { ok: false, error: "Lien de diagnostic invalide." };
  try {
    const prefill = await prefillIntake(freeText, sectors);
    await db.intakeSession.update({
      where: { token },
      data: { llmAssisted: true, llmPrefill: prefill as Prisma.InputJsonValue },
    });
    return { ok: true, prefill };
  } catch {
    return { ok: false, error: "L'assistance IA n'a pas répondu — remplissez à la main, tout fonctionne sans elle." };
  }
}
