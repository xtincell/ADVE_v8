import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/guards";

// Enregistrement d'un abonnement push web (opt-in par utilisateur — cahier §7).
const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  await db.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: { userId: user.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
    create: {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) {
    await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  }
  return NextResponse.json({ ok: true });
}
