"use server";

import { AuthError } from "next-auth";
import { getDefaultOperator } from "@/server/tenancy";
import { signIn } from "@/server/auth";
import {
  agencySignupSchema,
  depositMission,
  missionDepositSchema,
  registerAgency,
  registerTalent,
  talentSignupSchema,
} from "@/server/guild";

export interface DepositFormState {
  ok?: boolean;
  error?: string;
}

/**
 * Brouillon de brief IA (cahier §9) — OPTIONNEL : structure une description
 * brute vers les champs du formulaire ; le déposant relit, complète (contact,
 * budget) et soumet lui-même. La mission porte alors llmAssisted.
 */
export async function draftMissionAction(input: { raw: string }): Promise<
  | { ok: true; draft: { title: string; summary: string; contexte: string; objectifs: string; livrables: string; contraintes: string; skills: string } }
  | { ok: false; error: string }
> {
  const { llmAvailable } = await import("@/server/llm/gateway");
  if (!llmAvailable()) return { ok: false, error: "Assistance IA non configurée." };
  if (input.raw.trim().length < 40) {
    return { ok: false, error: "Décrivez votre besoin en quelques phrases (40 caractères min.)." };
  }
  try {
    const { draftMission } = await import("@/server/llm/usages");
    const d = await draftMission(input.raw);
    return {
      ok: true,
      draft: {
        title: d.title,
        summary: d.summary,
        contexte: d.contexte,
        objectifs: d.objectifs.join("\n"),
        livrables: d.livrables.join("\n"),
        contraintes: d.contraintes ?? "",
        skills: (d.skills ?? []).join(", "),
      },
    };
  } catch {
    return { ok: false, error: "L'assistance IA n'a pas répondu — remplissez le brief à la main." };
  }
}

export async function depositMissionAction(_prev: DepositFormState, formData: FormData): Promise<DepositFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = missionDepositSchema.safeParse({
    ...raw,
    budgetMin: raw.budgetMin ? raw.budgetMin : undefined,
    budgetMax: raw.budgetMax ? raw.budgetMax : undefined,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Formulaire incomplet : ${issue?.path.join(".")} — ${issue?.message}` };
  }
  if (
    parsed.data.budgetMin != null &&
    parsed.data.budgetMax != null &&
    parsed.data.budgetMax < parsed.data.budgetMin
  ) {
    return { error: "Le budget max doit être supérieur au budget min." };
  }
  const operator = await getDefaultOperator();
  await depositMission(operator.id, parsed.data);
  return { ok: true };
}

export interface SignupFormState {
  error?: string;
}

export async function talentSignupAction(_prev: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const parsed = talentSignupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Formulaire invalide : ${issue?.path.join(".")} — ${issue?.message}` };
  }
  const operator = await getDefaultOperator();
  try {
    await registerTalent(operator.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Inscription impossible." };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/creator",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Compte créé — connectez-vous manuellement." };
    throw e; // NEXT_REDIRECT
  }
}

export async function agencySignupAction(_prev: SignupFormState, formData: FormData): Promise<SignupFormState> {
  const parsed = agencySignupSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `Formulaire invalide : ${issue?.path.join(".")} — ${issue?.message}` };
  }
  const operator = await getDefaultOperator();
  try {
    await registerAgency(operator.id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Inscription impossible." };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/agency",
    });
    return {};
  } catch (e) {
    if (e instanceof AuthError) return { error: "Compte créé — connectez-vous manuellement." };
    throw e; // NEXT_REDIRECT
  }
}
