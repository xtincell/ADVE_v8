import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/server/db";
import { sendEmail } from "@/server/notifications/email";
import { notify } from "@/server/notifications";
import { refreshMarketSignals } from "@/server/intelligence/feeds";
import { freezeMonthlyStatements } from "@/server/mcp/statements";

// Crons = simples endpoints HTTP (cahier §7) déclenchés par n'importe quel
// scheduler externe (GitHub Actions, cron système, Coolify…). AUCUN scheduler
// in-process. Protégés par CRON_SECRET — fail-closed en production.

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) {
    // Sans secret configuré : autorisé en dev uniquement (fail-closed en prod).
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  // Comparaison à temps constant (pas de fuite temporelle sur CRON_SECRET).
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Récap hebdo des notifications non lues (founders, opt-out respecté). */
async function runDigest(): Promise<{ sent: number }> {
  const operator = await db.operator.findFirst();
  if (!operator) return { sent: 0 };
  const users = await db.user.findMany({
    where: {
      operatorId: operator.id,
      roles: { has: "FOUNDER" },
      digestOptOut: false,
      notifications: { some: { readAt: null } },
    },
    include: {
      notifications: { where: { readAt: null }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  let sent = 0;
  for (const user of users) {
    const items = user.notifications.map((n) => `• ${n.title}${n.body ? ` — ${n.body}` : ""}`).join("\n");
    await sendEmail(operator.id, "digest_hebdo", user.email, {
      name: user.name ?? "",
      count: String(user.notifications.length),
      items,
      url: env().NEXT_PUBLIC_BASE_URL,
    });
    sent++;
  }
  return { sent };
}

/** Expire les abonnements dont la période est dépassée (résiliés ou impayés manuels). */
async function runSubscriptions(): Promise<{ expired: number }> {
  const stale = await db.subscription.findMany({
    where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, currentPeriodEnd: { lt: new Date() } },
  });
  for (const sub of stale) {
    await db.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
    await notify({
      userId: sub.userId,
      type: "SYSTEM",
      title: "Votre abonnement a expiré",
      body: "Renouvelez pour retrouver les fonctions premium.",
      href: "/cockpit/abonnement",
    });
  }
  return { expired: stale.length };
}

/** Rafraîchit les signaux marché réels (RSS presse + macro World Bank). */
async function runSignals(): Promise<{ fetched: number }> {
  return refreshMarketSignals();
}

export async function GET(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "CRON_UNAUTHORIZED" }, { status: env().CRON_SECRET ? 401 : 503 });
  }
  const { job } = await params;
  const startedAt = Date.now();
  try {
    let result: unknown;
    switch (job) {
      case "digest":
        result = await runDigest();
        break;
      case "subscriptions":
        result = await runSubscriptions();
        break;
      case "signals":
        result = await runSignals();
        break;
      case "statements": {
        // Gèle le mois précédant `ref` (défaut : maintenant). `ref` permet le
        // rattrapage de mois passés — toujours des périodes calendaires closes.
        const ref = new URL(req.url).searchParams.get("ref");
        result = await freezeMonthlyStatements(ref ? new Date(ref) : undefined);
        break;
      }
      default:
        return NextResponse.json(
          { error: "JOB_INCONNU", jobs: ["digest", "subscriptions", "signals", "statements"] },
          { status: 404 },
        );
    }
    return NextResponse.json({ job, ok: true, durationMs: Date.now() - startedAt, result });
  } catch (e) {
    return NextResponse.json(
      { job, ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
