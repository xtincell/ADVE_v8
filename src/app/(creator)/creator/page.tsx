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
  const activeMissions = await db.mission.findMany({
    where: { assignedTalentId: user.id, status: { in: ["ASSIGNED", "COMPLETED"] } },
    orderBy: { updatedAt: "desc" },
  });
  const earnings = await db.earning.findMany({
    where: { talentId: user.id },
    include: { mission: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const paidTotal = earnings
    .filter((e) => e.status === "PAID")
    .reduce((s, e) => s + e.netAmount, 0);

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
            <p className="mt-1 font-mono text-3xl font-bold">{formatMoney(paidTotal, "XOF")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Missions actives</CardTitle>
        </CardHeader>
        <CardContent>
          {activeMissions.length === 0 ? (
            <EmptyState
              title="Aucune mission en cours"
              description="Quand une candidature est retenue, la mission apparaît ici avec son avancement."
            />
          ) : (
            <ul className="divide-y divide-line">
              {activeMissions.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/guilde/${m.slug}`} className="text-sm font-medium hover:text-accent">
                      {m.title}
                    </Link>
                    <p className="font-mono text-xs text-ink-muted">
                      {m.deadline
                        ? `Échéance ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(m.deadline)}`
                        : "Sans échéance"}
                    </p>
                  </div>
                  <Badge variant={m.status === "COMPLETED" ? "success" : "accent"}>
                    {m.status === "COMPLETED" ? "Terminée" : "En cours"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relevé de commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <EmptyState
              title="Aucune commission"
              description="Chaque mission attribuée génère une ligne : brut, commission à votre taux de tier, net."
            />
          ) : (
            <ul className="divide-y divide-line">
              {earnings.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{e.mission?.title ?? "Mission"}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      Brut {formatMoney(e.grossAmount, e.currency)} · commission{" "}
                      {Math.round(e.commissionRate * 100)} % · net {formatMoney(e.netAmount, e.currency)}
                    </p>
                  </div>
                  <Badge variant={e.status === "PAID" ? "success" : e.status === "APPROVED" ? "info" : "neutral"}>
                    {e.status === "PAID" ? "Payé" : e.status === "APPROVED" ? "Approuvé" : "En attente"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
