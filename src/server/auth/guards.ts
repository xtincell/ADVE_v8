import "server-only";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/server/auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
  operatorId: string | null;
  godMode: boolean;
  mfaEnabled: boolean;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    roles: session.user.roles,
    operatorId: session.user.operatorId,
    godMode: session.user.godMode,
    mfaEnabled: session.user.mfaEnabled,
  };
}

export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return user;
}

export function hasRole(user: SessionUser, roles: Role[]): boolean {
  if (user.roles.includes("ADMIN")) return true; // ADMIN passe partout
  return roles.some((r) => user.roles.includes(r));
}

/** Garde de surface : redirige vers la connexion (anonyme) ou l'accueil (rôle insuffisant). */
export async function requireRole(roles: Role[], next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasRole(user, roles)) redirect("/");
  return user;
}

/** MFA TOTP obligatoire pour ADMIN (cahier §11.2) : force l'enrôlement avant la Console. */
export async function requireAdminWithMfa(next?: string): Promise<SessionUser> {
  const user = await requireRole(["ADMIN", "OPERATOR"], next);
  if (user.roles.includes("ADMIN") && !user.mfaEnabled) redirect("/console/mfa");
  return user;
}
