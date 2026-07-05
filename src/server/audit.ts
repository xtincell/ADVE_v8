import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";

// Journal d'audit simple (cahier §11.2) : mutations sensibles uniquement —
// paiements/validations manuelles, modération Guilde, amendements de piliers,
// changements de rôles. Qui / quoi / quand / avant-après. Une table, pas une religion.

export interface AuditEntry {
  operatorId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string; // ex. "payment.validate", "pillar.amend", "mission.moderate", "role.change"
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export async function audit(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
  const client = tx ?? db;
  await client.auditLog.create({
    data: {
      operatorId: entry.operatorId ?? null,
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
      after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
    },
  });
}
