import "server-only";
import webpush from "web-push";
import { db } from "@/server/db";
import { getProviderCredentials } from "@/server/vault";

// Push web VAPID (cahier §7) : opt-in par utilisateur, clés via le vault
// opérateur (provider "vapid"). Sans clés : silencieusement inactif — le
// canal in-app (SSE + cloche) reste la source de vérité.

interface VapidCreds {
  publicKey: string;
  privateKey: string;
  subject?: string;
}

export async function getVapidPublicKey(operatorId: string): Promise<string | null> {
  const creds = await getProviderCredentials<VapidCreds>(operatorId, "vapid");
  return creds?.publicKey ?? null;
}

export async function sendWebPush(
  userId: string,
  payload: { title: string; body?: string | null; href?: string | null },
): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { operatorId: true } });
  if (!user?.operatorId) return;
  const creds = await getProviderCredentials<VapidCreds>(user.operatorId, "vapid");
  if (!creds?.publicKey || !creds.privateKey) return;

  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return;

  webpush.setVapidDetails(creds.subject ?? "mailto:contact@upgraders.com", creds.publicKey, creds.privateKey);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
      } catch (e) {
        // 404/410 : abonnement expiré → purge silencieuse
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }),
  );
}
