import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatMoney } from "@/server/billing/pricing";

export const dynamic = "force-dynamic";

const TALENT_TIER_LABELS: Record<string, string> = {
  APPRENTI: "Apprenti",
  COMPAGNON: "Compagnon",
  MAITRE: "Maître",
  ASSOCIE: "Associé",
};

export default async function CreatorHome() {
  const user = await requireRole(["TALENT"], "/creator");
  const profile = await db.talentProfile.findUnique({ where: { userId: user.id } });
  const applications = await db.missionApplication.findMany({
    where: { talentId: user.id },
    include: { mission: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const openMissions = await db.mission.count({ where: { status: "PUBLISHED" } });
  const earnings = await db.earning.aggregate({
    where: { talentId: user.id, status: "PAID" },
    _sum: { netAmount: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Espace Creator</p>
        <h1 className="mt-1 text-3xl font-semibold">{user.name ?? "Mon espace"}</h1>
        {profile ? (
          <p className="mt-1 text-sm text-ink-muted">
            {profile.headline} · <Badge variant="gold">{TALENT_TIER_LABELS[profile.tier]}</Badge>
          </p>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">Profil talent à compléter.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Missions ouvertes</p>
            <p className="mt-1 font-mono text-3xl font-bold">{openMissions}</p>
            <Link href="/guilde" className={buttonClass({ variant: "outline", size: "sm", className: "mt-3" })}>
              Voir le mur
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Mes candidatures</p>
            <p className="mt-1 font-mono text-3xl font-bold">{applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Gains perçus</p>
            <p className="mt-1 font-mono text-3xl font-bold">
              {formatMoney(earnings._sum.netAmount ?? 0, "XOF")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Candidatures récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <EmptyState
              title="Aucune candidature"
              description="Parcourez le mur des missions et candidatez avec un devis structuré."
              action={
                <Link href="/guilde" className={buttonClass({ size: "sm" })}>
                  Missions ouvertes
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {applications.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/guilde/${a.mission.slug}`} className="text-sm font-medium hover:text-accent">
                      {a.mission.title}
                    </Link>
                    {a.quoteAmount != null && (
                      <p className="font-mono text-xs text-ink-muted">
                        Devis : {formatMoney(a.quoteAmount, a.mission.currency)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      a.status === "ACCEPTED" ? "success" : a.status === "REJECTED" ? "danger" : "info"
                    }
                  >
                    {a.status === "SUBMITTED" ? "Envoyée" : a.status === "SHORTLISTED" ? "Présélection" : a.status === "ACCEPTED" ? "Retenue" : a.status === "REJECTED" ? "Non retenue" : "Retirée"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
