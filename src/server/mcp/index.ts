import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { McpApiKey } from "@prisma/client";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { isGodMode } from "@/env";
import type { SessionUser } from "@/server/auth/guards";

// API MCP facturable (cahier §6.2) : clés hashées SHA-256 (le clair n'est montré
// qu'une seule fois, à la création), comptage d'appels par clé, relevés mensuels
// gelés. UN SEUL endpoint MCP consolidé : /api/mcp.

const KEY_PREFIX = "fusee_mcp_";

function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Crée une clé API — retourne le clair UNE FOIS, seul le hash est stocké. */
export async function createApiKey(
  actor: { id: string; email: string; operatorId: string },
  label: string,
): Promise<{ plaintext: string; key: McpApiKey }> {
  const plaintext = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  const key = await db.mcpApiKey.create({
    data: {
      operatorId: actor.operatorId,
      userId: actor.id,
      label,
      keyHash: hashKey(plaintext),
      prefix: plaintext.slice(0, KEY_PREFIX.length + 6),
    },
  });
  await audit({
    operatorId: actor.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "mcp.key_create",
    entity: "McpApiKey",
    entityId: key.id,
    after: { label, prefix: key.prefix },
  });
  return { plaintext, key };
}

export async function revokeApiKey(keyId: string, actor: { id: string; email: string }): Promise<void> {
  const key = await db.mcpApiKey.update({
    where: { id: keyId },
    data: { active: false, revokedAt: new Date() },
  });
  await audit({
    operatorId: key.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "mcp.key_revoke",
    entity: "McpApiKey",
    entityId: key.id,
    after: { prefix: key.prefix },
  });
}

export type McpAuth =
  | { ok: true; key: McpApiKey; user: SessionUser }
  | { ok: false; status: number; error: string };

/** Authentifie un appel MCP par Bearer — reconstruit le SessionUser du porteur. */
export async function authenticateMcp(authorization: string | null): Promise<McpAuth> {
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Authentification requise : Authorization: Bearer <clé API>." };
  }
  const plaintext = authorization.slice("Bearer ".length).trim();
  if (!plaintext.startsWith(KEY_PREFIX)) {
    return { ok: false, status: 401, error: "Clé API invalide." };
  }
  const key = await db.mcpApiKey.findUnique({ where: { keyHash: hashKey(plaintext) } });
  if (!key || !key.active || !key.userId) {
    return { ok: false, status: 401, error: "Clé API inconnue ou révoquée." };
  }
  const owner = await db.user.findUnique({ where: { id: key.userId } });
  if (!owner) return { ok: false, status: 401, error: "Clé API orpheline." };
  await db.mcpApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  const god = isGodMode(owner.email);
  return {
    ok: true,
    key,
    user: {
      id: owner.id,
      email: owner.email,
      name: owner.name,
      roles: god && !owner.roles.includes("ADMIN") ? [...owner.roles, "ADMIN"] : owner.roles,
      operatorId: owner.operatorId,
      godMode: god,
      mfaEnabled: false,
    },
  };
}

/** Comptage d'appels — la matière première des relevés. Les échecs ne facturent rien. */
export async function recordCall(
  keyId: string,
  tool: string,
  opts: { brandId?: string | null; ok: boolean },
): Promise<void> {
  await db.mcpCall.create({
    data: { keyId, tool, brandId: opts.brandId ?? null, ok: opts.ok, costUnits: opts.ok ? 1 : 0 },
  });
}
