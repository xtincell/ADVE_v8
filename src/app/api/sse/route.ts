import { getSessionUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { subscribe, type SseEvent } from "@/server/notifications/broker";

// Flux SSE UNIQUE du produit (cahier §7) : notifications in-app temps réel.
// Heartbeat 25 s, reprise `?since=` (ISO) — contrat mono-instance documenté.

export const dynamic = "force-dynamic";

function frame(event: SseEvent): string {
  return `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("AUTH_REQUIRED", { status: 401 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start: async (controller) => {
      const send = (event: SseEvent) => controller.enqueue(encoder.encode(frame(event)));

      // Reprise : rejoue ce qui a été manqué depuis `since` (source de vérité : la base).
      if (since) {
        const sinceDate = new Date(since);
        if (!Number.isNaN(sinceDate.getTime())) {
          const missed = await db.notification.findMany({
            where: { userId: user.id, createdAt: { gt: sinceDate } },
            orderBy: { createdAt: "asc" },
            take: 50,
          });
          for (const n of missed) {
            send({ id: n.id, type: n.type, title: n.title, body: n.body, href: n.href, createdAt: n.createdAt.toISOString() });
          }
        }
      }

      controller.enqueue(encoder.encode(`: connecté ${new Date().toISOString()}\n\n`));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: hb ${Date.now()}\n\n`));
        } catch {
          if (heartbeat) clearInterval(heartbeat);
        }
      }, 25_000);

      cleanup = subscribe(user.id, { send });
    },
    cancel: () => {
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // reverse proxies : ne pas bufferiser le flux
    },
  });
}
