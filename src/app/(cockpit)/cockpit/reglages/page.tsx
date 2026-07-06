import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/server/auth/guards";
import { checkSubscriptionGate } from "@/server/billing/gates";
import { formatMoney } from "@/server/billing/pricing";
import { db } from "@/server/db";
import { getVapidPublicKey } from "@/server/notifications/push";
import { ProfileForm } from "./profile-form";
import { NotificationPrefs } from "./notification-prefs";
import { PrivacyActions } from "./privacy-actions";
import { McpKeys } from "./mcp-keys";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function ReglagesPage() {
  const sessionUser = await requireUser("/cockpit/reglages");
  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id } });
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });
  const vapidKey = user.operatorId ? await getVapidPublicKey(user.operatorId) : null;
  const pushCount = await db.pushSubscription.count({ where: { userId: user.id } });

  // API MCP : clés du compte + usage du mois courant + relevés gelés.
  const gate = await checkSubscriptionGate(sessionUser);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const mcpKeys = await db.mcpApiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { calls: { where: { createdAt: { gte: monthStart }, ok: true } } } } },
  });
  const mcpStatements = await db.mcpStatement.findMany({
    where: { key: { userId: user.id } },
    orderBy: { periodStart: "desc" },
    take: 12,
    include: { key: { select: { prefix: true, label: true } } },
  });

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Réglages</p>
        <h1 className="mt-1 text-3xl font-semibold">Profil & préférences</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            name={user.name ?? ""}
            email={user.email}
            country={user.country ?? ""}
            phone={user.phone ?? ""}
            countries={countries}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Le fil in-app (cloche) est toujours actif — ces réglages concernent les canaux
            complémentaires.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NotificationPrefs
            digestOptOut={user.digestOptOut}
            vapidPublicKey={vapidKey}
            hasPushSubscription={pushCount > 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API MCP</CardTitle>
          <CardDescription>
            Branchez vos agents et intégrations sur vos données de marque : un seul endpoint
            (/api/mcp), des clés hashées affichées une seule fois, des appels comptés et facturés
            au relevé mensuel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <McpKeys
            gateNotice={gate.allowed ? null : gate.reason}
            keys={mcpKeys.map((k) => ({
              id: k.id,
              label: k.label,
              prefix: k.prefix,
              active: k.active,
              createdAt: dateFmt.format(k.createdAt),
              lastUsedAt: k.lastUsedAt ? dateFmt.format(k.lastUsedAt) : null,
              callsThisMonth: k._count.calls,
            }))}
          />
          {mcpStatements.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-semibold">Relevés gelés</p>
              <ul className="mt-2 divide-y divide-line">
                {mcpStatements.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="font-mono text-xs text-ink-muted">
                      {s.periodStart.toISOString().slice(0, 7)} · {s.key.label} ({s.key.prefix}…)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{s.callCount} appels</span>
                      <span className="font-medium">{formatMoney(s.amount, s.currency)}</span>
                      <span className={`font-mono text-[10px] uppercase ${s.paymentId ? "text-success" : "text-gold-strong"}`}>
                        {s.paymentId ? "Réglé" : "À encaisser"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos données (RGPD)</CardTitle>
          <CardDescription>Export complet au format JSON, ou suppression définitive du compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyActions />
        </CardContent>
      </Card>
    </div>
  );
}
