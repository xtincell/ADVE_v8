import "server-only";
import { authenticator } from "otplib";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { decrypt, encrypt } from "@/server/vault/crypto";

// Enrôlement MFA TOTP (cahier §11.2 : obligatoire pour ADMIN dès l'enrôlement).
// Le secret est stocké chiffré (AES-256-GCM) ; l'otpauth:// se saisit manuellement
// dans toute app d'authentification (Google Authenticator, Aegis, 1Password…).

export interface MfaEnrollment {
  secret: string;
  otpauthUrl: string;
}

export async function startMfaEnrollment(userId: string): Promise<MfaEnrollment> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.mfaEnabled) throw new Error("La double authentification est déjà active.");
  const secret = authenticator.generateSecret();
  await db.user.update({ where: { id: userId }, data: { mfaSecret: encrypt(secret) } });
  return {
    secret,
    otpauthUrl: authenticator.keyuri(user.email, "La Fusée (UPgraders)", secret),
  };
}

export async function confirmMfaEnrollment(userId: string, code: string): Promise<boolean> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.mfaSecret) throw new Error("Aucun enrôlement en cours.");
  const ok = authenticator.verify({ token: code.trim(), secret: decrypt(user.mfaSecret) });
  if (!ok) return false;
  await db.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  await audit({
    operatorId: user.operatorId,
    actorId: userId,
    actorEmail: user.email,
    action: "user.mfa_enable",
    entity: "User",
    entityId: userId,
  });
  return true;
}
