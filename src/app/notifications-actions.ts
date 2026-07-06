"use server";

import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/guards";

export async function markAllReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
