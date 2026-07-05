"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/server/db";
import { audit } from "@/server/audit";
import { requireAdminWithMfa } from "@/server/auth/guards";

export interface RolesFormState {
  ok?: boolean;
  error?: string;
}

const schema = z.object({
  userId: z.string().min(1),
  roles: z.array(z.enum(["ADMIN", "OPERATOR", "FOUNDER", "TALENT", "AGENCY", "USER"])).min(1, "Au moins un rôle."),
});

export async function updateRolesAction(_prev: RolesFormState, formData: FormData): Promise<RolesFormState> {
  const actor = await requireAdminWithMfa("/console/comptes");
  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Sélection invalide." };
  const { userId, roles } = parsed.data;
  if (userId === actor.id) return { error: "Impossible de modifier ses propres rôles." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.operatorId !== actor.operatorId) return { error: "Utilisateur hors de votre tenant." };

  await db.user.update({ where: { id: userId }, data: { roles: roles as Role[] } });
  await audit({
    operatorId: actor.operatorId,
    actorId: actor.id,
    actorEmail: actor.email,
    action: "role.change",
    entity: "User",
    entityId: userId,
    before: { roles: target.roles },
    after: { roles },
  });
  revalidatePath("/console/comptes");
  return { ok: true };
}
