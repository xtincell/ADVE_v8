import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";

export const dynamic = "force-dynamic";

// Journal d'audit (cahier §11.2) : qui a fait quoi, quand, avant/après.
// Une table, un écran — pas une religion.

const ACTION_LABELS: Record<string, string> = {
  "pillar.amend": "Amendement de pilier",
  "payment.settle": "Paiement réglé",
  "payment.reject": "Paiement rejeté",
  "subscription.cancel": "Résiliation",
  "oracle.generate": "Génération Oracle",
  "role.change": "Changement de rôles",
  "credential.set": "Credentials enregistrés",
  "credential.delete": "Credentials supprimés",
  "price.update": "Prix modifié",
  "settings.update": "Paramètres modifiés",
  "user.mfa_enable": "MFA activé",
  "mission.moderate": "Modération mission",
};

export default async function ConsoleAuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requireAdminWithMfa("/console/audit");
  const operator = await getDefaultOperator();
  const { action } = await searchParams;
  const entries = await db.auditLog.findMany({
    where: { operatorId: operator.id, ...(action ? { action } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const actions = await db.auditLog.groupBy({
    by: ["action"],
    where: { operatorId: operator.id },
    _count: true,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Audit</p>
        <h1 className="mt-1 text-3xl font-semibold">Journal des actions sensibles</h1>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <a href="/console/audit" className={`rounded-(--radius-xs) px-2 py-1 font-mono text-xs ${!action ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink-muted hover:text-ink"}`}>
          Tout
        </a>
        {actions.map((a) => (
          <a
            key={a.action}
            href={`/console/audit?action=${encodeURIComponent(a.action)}`}
            className={`rounded-(--radius-xs) px-2 py-1 font-mono text-xs ${action === a.action ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink-muted hover:text-ink"}`}
          >
            {a.action} ({a._count})
          </a>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dernières entrées {action ? `— ${action}` : ""}</CardTitle>
          <CardDescription>100 entrées maximum par vue, de la plus récente à la plus ancienne.</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState title="Aucune entrée" description="Les mutations sensibles s'enregistrent ici automatiquement." />
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-sm">
                      <Badge variant="neutral">{ACTION_LABELS[e.action] ?? e.action}</Badge>
                      <span className="font-mono text-xs text-ink-muted">
                        {e.entity}#{e.entityId.slice(-8)}
                      </span>
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {e.actorEmail ?? "système"} ·{" "}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "medium" }).format(e.createdAt)}
                    </p>
                  </div>
                  {(e.before != null || e.after != null) && (
                    <details className="mt-1">
                      <summary className="cursor-pointer font-mono text-[11px] text-ink-faint hover:text-ink">
                        avant / après
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded-(--radius-sm) bg-surface-sunken p-2 font-mono text-[11px] text-ink-muted">
{JSON.stringify({ avant: e.before, apres: e.after }, null, 1)}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
