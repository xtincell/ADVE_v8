import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatMoney } from "@/server/billing/pricing";

export const dynamic = "force-dynamic";

export default async function CreatorMissionsPage() {
  const user = await requireRole(["TALENT"], "/creator/missions");
  const missions = await db.mission.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { applications: { where: { talentId: user.id }, select: { status: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Creator · Missions</p>
        <h1 className="mt-1 text-3xl font-semibold">Missions ouvertes</h1>
      </div>
      {missions.length === 0 ? (
        <EmptyState title="Aucune mission ouverte" description="Les missions publiées après modération apparaissent ici." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {missions.map((m) => {
            const mine = m.applications[0];
            return (
              <Card key={m.id}>
                <CardContent className="flex h-full flex-col pt-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {m.sector && <Badge variant="neutral">{m.sector}</Badge>}
                    {m.country && <Badge variant="outline">{m.country}</Badge>}
                    {mine && (
                      <Badge variant={mine.status === "ACCEPTED" ? "success" : mine.status === "REJECTED" ? "danger" : "info"}>
                        {mine.status === "SUBMITTED" ? "Candidature envoyée" : mine.status === "SHORTLISTED" ? "Présélection" : mine.status === "ACCEPTED" ? "Retenue" : "Non retenue"}
                      </Badge>
                    )}
                  </div>
                  <h2 className="mt-2 font-display text-lg font-semibold">{m.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-ink-muted">{m.summary}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <p className="font-mono text-sm font-semibold">
                      {m.budgetMin != null && m.budgetMax != null
                        ? `${formatMoney(m.budgetMin, m.currency)} – ${formatMoney(m.budgetMax, m.currency)}`
                        : "Budget à discuter"}
                    </p>
                    <Link href={`/creator/missions/${m.slug}`} className="text-sm font-medium text-accent hover:underline">
                      {mine ? "Voir ma candidature →" : "Candidater →"}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
