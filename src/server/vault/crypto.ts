import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/env";

// Chiffrement du vault credentials (cahier §4.3) : AES-256-GCM.
// Clé dérivée par HKDF de VAULT_SECRET (ou NEXTAUTH_SECRET à défaut) — zéro dépendance.

let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (!cachedKey) {
    const secret = env().VAULT_SECRET ?? env().NEXTAUTH_SECRET;
    cachedKey = Buffer.from(hkdfSync("sha256", secret, "lafusee-vault-v1", "aes-256-gcm", 32));
  }
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encryptJson(value: unknown): string {
  return encrypt(JSON.stringify(value));
}

export function decryptJson<T>(payload: string): T {
  return JSON.parse(decrypt(payload)) as T;
}
