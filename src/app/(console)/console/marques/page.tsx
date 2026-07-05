import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

export default async function ConsoleMarquesPage() {
  await requireAdminWithMfa("/console/marques");
  const operator = await getDefaultOperator();
  const brands = await db.brand.findMany({
    where: { operatorId: operator.id },
    orderBy: { updatedAt: "desc" },
    include: {
      founder: { select: { email: true, name: true } },
      pillars: { select: { stale: true } },
      _count: { select: { oracleReports: true } },
    },
  });
  const intakes = await db.intakeSession.findMany({
    where: { operatorId: operator.id, status: { in: ["DRAFT", "SCORED"] } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Portefeuille</p>
        <h1 className="mt-1 text-3xl font-semibold">Marques ({brands.length})</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portefeuille</CardTitle>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <EmptyState title="Aucune marque" description="Les marques naissent des diagnostics activés ou des dépôts Guilde." />
          ) : (
            <ul className="divide-y divide-line">
              {brands.map((b) => {
                const staleCount = b.pillars.filter((p) => p.stale).length;
                return (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/console/marques/${b.id}`} className="flex items-center gap-2 text-sm font-medium hover:text-accent">
                        {b.name}
                        {b.isShell && <Badge variant="outline">Shell Guilde</Badge>}
                        {b.isDemo && <Badge variant="outline">Démo</Badge>}
                        {staleCount > 0 && <Badge variant="gold">{staleCount} périmé{staleCount > 1 ? "s" : ""}</Badge>}
                      </Link>
                      <p className="truncate font-mono text-xs text-ink-muted">
                        {b.sector ?? "—"} · founder : {b.founder?.email ?? "aucun"} · {b._count.oracleReports} Oracle
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{b.score}/200</span>
                      <Badge variant="gold">{TIER_LABELS[b.tier]}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnostics en cours (non activés)</CardTitle>
        </CardHeader>
        <CardContent>
          {intakes.length === 0 ? (
            <EmptyState title="Aucun diagnostic en cours" description="Les sessions d'intake non activées apparaissent ici." />
          ) : (
            <ul className="divide-y divide-line">
              {intakes.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{s.brandName ?? "Sans nom"}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {s.email ?? "email non fourni"} ·{" "}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(s.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.score != null && <span className="font-mono text-xs font-bold">{s.score}/200</span>}
                    <Badge variant={s.status === "SCORED" ? "info" : "neutral"}>
                      {s.status === "SCORED" ? "Scoré (paywall)" : "Brouillon"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
