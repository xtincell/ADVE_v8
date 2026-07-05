"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/server/db";
import { signIn, signOut } from "@/server/auth";
import { getDefaultOperator } from "@/server/tenancy";
import { activateIntake, getIntakeSession } from "@/server/intake";

export interface AuthFormState {
  error?: string;
  mfa?: boolean;
}

function safeNext(next: unknown, fallback: string): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const totp = String(formData.get("totp") ?? "");
  const redirectTo = safeNext(formData.get("next"), "/apres-connexion");

  try {
    await signIn("credentials", { email, password, totp, redirectTo });
    return {};
  } catch (e) {
    if (e instanceof CredentialsSignin || (e instanceof AuthError && e.type === "CredentialsSignin")) {
      const code = (e as CredentialsSignin).code;
      if (code === "mfa_required") return { mfa: true };
      if (code === "mfa_invalid") return { mfa: true, error: "Code de vérification invalide." };
      return { error: "Email ou mot de passe incorrect." };
    }
    if (e instanceof AuthError) {
      return { error: "Connexion impossible pour le moment. Réessayez." };
    }
    throw e; // NEXT_REDIRECT (succès)
  }
}

export async function googleSignInAction(formData: FormData): Promise<void> {
  const redirectTo = safeNext(formData.get("next"), "/apres-connexion");
  await signIn("google", { redirectTo });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

const registerSchema = z.object({
  name: z.string().min(2, "Votre nom est requis.").max(120),
  email: z.string().email("Adresse email invalide."),
  password: z.string().min(8, "8 caractères minimum."),
  token: z.string().optional(),
});

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    token: formData.get("token") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  const { name, email, password, token } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email — connectez-vous." };
  }

  const operator = await getDefaultOperator();
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      name,
      passwordHash: await hash(password, 10),
      roles: ["FOUNDER"],
      operatorId: operator.id,
    },
  });

  if (token) {
    const session = await getIntakeSession(token);
    if (session && session.status === "SCORED") {
      await activateIntake(token, user.id);
    }
  }

  try {
    await signIn("credentials", { email: normalizedEmail, password, redirectTo: "/cockpit" });
    return {};
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: "Compte créé mais connexion impossible — connectez-vous manuellement." };
    }
    throw e; // NEXT_REDIRECT
  }
}
