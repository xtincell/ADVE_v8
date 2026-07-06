"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/server/audit";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { deleteProviderCredentials, setProviderCredentials } from "@/server/vault";

export interface CredentialFormState {
  ok?: boolean;
  error?: string;
}

const KNOWN_PROVIDERS = ["wave", "mtn_momo", "orange_money", "cinetpay", "paypal", "resend", "mailgun", "sendgrid", "vapid"];

export async function saveCredentialAction(_prev: CredentialFormState, formData: FormData): Promise<CredentialFormState> {
  const actor = await requireAdminWithMfa("/console/vault");
  if (!actor.operatorId) return { error: "Compte sans tenant." };
  const provider = String(formData.get("provider") ?? "");
  if (!KNOWN_PROVIDERS.includes(provider)) return { error: "Connecteur inconnu." };

  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "provider" || typeof value !== "string") continue;
    const v = value.trim();
    if (v) values[key] = v;
  }
  if (Object.keys(values).length === 0) return { error: "Aucune clé fournie." };

  // Fusion avec l'existant : un champ laissé vide conserve sa valeur actuelle.
  const { getProviderCredentials } = await import("@/server/vault");
  const existing = (await getProviderCredentials<Record<string, string>>(actor.operatorId, provider)) ?? {};
  await setProviderCredentials(actor.operatorId, provider, { ...existing, ...values });

  await audit({
    operatorId: actor.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "credential.set",
    entity: "Credential",
    entityId: provider,
    after: { keys: Object.keys(values) }, // jamais les valeurs
  });
  revalidatePath("/console/vault");
  return { ok: true };
}

export async function deleteCredentialAction(formData: FormData): Promise<void> {
  const actor = await requireAdminWithMfa("/console/vault");
  if (!actor.operatorId) return;
  const provider = String(formData.get("provider") ?? "");
  if (!KNOWN_PROVIDERS.includes(provider)) return;
  await deleteProviderCredentials(actor.operatorId, provider);
  await audit({
    operatorId: actor.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "credential.delete",
    entity: "Credential",
    entityId: provider,
  });
  revalidatePath("/console/vault");
}
