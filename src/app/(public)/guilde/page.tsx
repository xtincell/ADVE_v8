import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { formatMoney } from "@/server/billing/pricing";

export const metadata: Metadata = {
  title: "La Guilde — missions créatives",
  description:
    "Le mur public des missions créatives opérées par UPgraders : briefs cadrés, budgets annoncés, candidatures modérées.",
};

export const dynamic = "force-dynamic";

export default async function GuildePage() {
  const operator = await getDefaultOperator();
  const missions = await db.mission.findMany({
    where: { operatorId: operator.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });
  const stats = {
    open: missions.length,
    talents: await db.talentProfile.count({ where: { operatorId: operator.id } }),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">La Guilde</p>
      <h1 className="mt-3 max-w-2xl text-3xl font-semibold md:text-5xl">
        Des missions cadrées, des talents sérieux.
      </h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        Chaque mission publiée ici est passée par la modération UPgraders : brief structuré, budget
        annoncé, contact protégé. Les candidatures se font depuis l&apos;espace talent — pas de
        premier-arrivé-premier-servi, l&apos;opérateur arbitre.
      </p>
      <div className="mt-6 flex gap-6 font-mono text-sm">
        <p>
          <span className="text-2xl font-bold text-accent">{stats.open}</span>{" "}
          <span className="text-ink-muted">mission{stats.open > 1 ? "s" : ""} ouverte{stats.open > 1 ? "s" : ""}</span>
        </p>
        <p>
          <span className="text-2xl font-bold text-accent">{stats.talents}</span>{" "}
          <span className="text-ink-muted">talent{stats.talents > 1 ? "s" : ""} au réseau</span>
        </p>
      </div>

      {missions.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Aucune mission ouverte pour le moment"
          description="Les missions publiées apparaissent ici après modération. Revenez bientôt."
        />
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {missions.map((m) => (
            <Link key={m.id} href={`/guilde/${m.slug}`} className="group">
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardContent className="flex h-full flex-col pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {m.sector && <Badge variant="neutral">{m.sector}</Badge>}
                    {m.country && <Badge variant="outline">{m.country}</Badge>}
                    {m.isDemo && <Badge variant="outline">Démo</Badge>}
                  </div>
                  <h2 className="mt-3 font-display text-lg font-semibold group-hover:text-accent">
                    {m.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm text-ink-muted">{m.summary}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                    <p className="font-mono text-sm font-semibold">
                      {m.budgetMin != null && m.budgetMax != null
                        ? `${formatMoney(m.budgetMin, m.currency)} – ${formatMoney(m.budgetMax, m.currency)}`
                        : "Budget à discuter"}
                    </p>
                    {m.skills.length > 0 && (
                      <p className="truncate pl-3 text-xs text-ink-faint">{m.skills.slice(0, 2).join(" · ")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
