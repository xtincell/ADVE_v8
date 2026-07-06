import "server-only";
import type { NotificationType, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { publish } from "./broker";
import { sendWebPush } from "./push";

// Point d'entrée unique des notifications : ligne en base (source de vérité),
// diffusion SSE temps réel, push web si opt-in — jamais bloquant pour l'appelant.

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  data?: Prisma.InputJsonValue;
}

export async function notify(input: NotifyInput): Promise<void> {
  const row = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      data: input.data,
    },
  });
  publish(input.userId, {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    createdAt: row.createdAt.toISOString(),
  });
  // Push web : silencieux si l'utilisateur n'a pas opté ou si VAPID absent.
  void sendWebPush(input.userId, { title: input.title, body: input.body, href: input.href }).catch(() => {});
}

