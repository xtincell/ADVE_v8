import "server-only";
import { db } from "@/server/db";
import { decryptJson, encryptJson } from "./crypto";

// Credentials Vault (cahier §4.3) : connecteurs externes PAR OPÉRATEUR, chiffrés
// en base (AES-256-GCM). Les secrets système (Stripe, DB) restent en env.

export async function getProviderCredentials<T>(operatorId: string, provider: string): Promise<T | null> {
  const row = await db.credential.findUnique({
    where: { operatorId_provider: { operatorId, provider } },
  });
  if (!row || !row.active) return null;
  try {
    return decryptJson<T>(row.encrypted);
  } catch {
    return null; // clé de vault changée : équivaut à « non configuré », jamais de crash silencieux ailleurs
  }
}

export async function setProviderCredentials(
  operatorId: string,
  provider: string,
  values: Record<string, string>,
  label?: string,
): Promise<void> {
  await db.credential.upsert({
    where: { operatorId_provider: { operatorId, provider } },
    update: { encrypted: encryptJson(values), label, active: true },
    create: { operatorId, provider, encrypted: encryptJson(values), label },
  });
}

export async function deleteProviderCredentials(operatorId: string, provider: string): Promise<void> {
  await db.credential.deleteMany({ where: { operatorId, provider } });
}

export async function listCredentialStatus(operatorId: string): Promise<{ provider: string; label: string | null; active: boolean; updatedAt: Date }[]> {
  const rows = await db.credential.findMany({ where: { operatorId }, orderBy: { provider: "asc" } });
  return rows.map((r) => ({ provider: r.provider, label: r.label, active: r.active, updatedAt: r.updatedAt }));
}
