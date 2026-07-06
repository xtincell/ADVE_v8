"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireUser } from "@/server/auth/guards";
import { signOut } from "@/server/auth";
import { checkSubscriptionGate } from "@/server/billing/gates";
import { createApiKey, revokeApiKey } from "@/server/mcp";

export interface ReglagesFormState {
  ok?: boolean;
  error?: string;
}

// ─────────────────────────────── Clés API MCP

export interface McpKeyFormState {
  error?: string;
  /** Clair de la clé — présent UNE SEULE FOIS, jamais rejoué. */
  plaintext?: string;
}

export async function createMcpKeyAction(_prev: McpKeyFormState, formData: FormData): Promise<McpKeyFormState> {
  const user = await requireUser("/cockpit/reglages");
  const gate = await checkSubscriptionGate(user);
  if (!gate.allowed) {
    return { error: gate.pending ? "Votre paiement attend la validation d'un opérateur." : "L'API MCP fait partie de l'abonnement Cockpit (TIER_GATE_DENIED)." };
  }
  const label = String(formData.get("label") ?? "").trim();
  if (label.length < 3 || label.length > 60) return { error: "Nom de clé requis (3 à 60 caractères)." };
  if (!user.operatorId) return { error: "Compte sans opérateur." };
  const { plaintext } = await createApiKey({ id: user.id, email: user.email, operatorId: user.operatorId }, label);
  revalidatePath("/cockpit/reglages");
  return { plaintext };
}

export async function revokeMcpKeyAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/reglages");
  const id = String(formData.get("id") ?? "");
  const key = await db.mcpApiKey.findUnique({ where: { id } });
  if (!key || key.userId !== user.id) return;
  await revokeApiKey(id, { id: user.id, email: user.email });
  revalidatePath("/cockpit/reglages");
}

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  country: z.string().length(2).or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
});

export async function updateProfileAction(_prev: ReglagesFormState, formData: FormData): Promise<ReglagesFormState> {
  const user = await requireUser("/cockpit/reglages");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { error: "Profil invalide (nom : 2 caractères minimum)." };
  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      country: parsed.data.country || null,
      phone: parsed.data.phone || null,
    },
  });
  revalidatePath("/cockpit/reglages");
  return { ok: true };
}

export async function toggleDigestAction(optOut: boolean): Promise<void> {
  const user = await requireUser("/cockpit/reglages");
  await db.user.update({ where: { id: user.id }, data: { digestOptOut: optOut } });
}

/** Suppression de compte (RGPD, cahier §11.2) : PII effacées, écritures comptables anonymisées. */
export async function deleteAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser("/cockpit/reglages");
  if (String(formData.get("confirm")) !== "SUPPRIMER") return;

  const anonymousEmail = `supprime-${user.id.slice(-10)}@anonyme.invalid`;
  await db.$transaction(async (tx) => {
    // Données personnelles : purge directe.
    await tx.notification.deleteMany({ where: { userId: user.id } });
    await tx.pushSubscription.deleteMany({ where: { userId: user.id } });
    await tx.account.deleteMany({ where: { userId: user.id } });
    await tx.talentProfile.deleteMany({ where: { userId: user.id } });
    await tx.agencyProfile.deleteMany({ where: { userId: user.id } });
    await tx.brandRequest.deleteMany({ where: { authorId: user.id } });
    // Les marques restent (elles appartiennent au tenant) — détachées de la personne.
    await tx.brand.updateMany({ where: { founderId: user.id }, data: { founderId: null } });
    // Les écritures financières restent (obligation légale) — anonymisées via le compte.
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: anonymousEmail,
        name: null,
        passwordHash: null,
        image: null,
        phone: null,
        mfaSecret: null,
        mfaEnabled: false,
        roles: ["USER"],
        digestOptOut: true,
      },
    });
    await audit(
      {
        operatorId: user.operatorId,
        actorId: user.id,
        actorEmail: anonymousEmail,
        action: "user.delete_account",
        entity: "User",
        entityId: user.id,
      },
      tx,
    );
  });

  await signOut({ redirect: false });
  redirect("/");
}
