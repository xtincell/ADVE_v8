import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatMoney } from "@/server/billing/pricing";
import { TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

const MISSION_STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "En modération",
  PUBLISHED: "Publiée",
  REJECTED: "Refusée",
  ASSIGNED: "Attribuée",
  COMPLETED: "Terminée",
  CANCELED: "Annulée",
};

export default async function AgencyHome() {
  const user = await requireRole(["AGENCY"], "/agency");
  const profile = await db.agencyProfile.findUnique({ where: { userId: user.id } });
  // Marques clientes de l'agence : marques dont l'agence est le founder délégué.
  const brands = await db.brand.findMany({
    where: { founderId: user.id, isShell: false },
    orderBy: { score: "desc" },
  });
  const avgScore = brands.length > 0 ? Math.round(brands.reduce((s, b) => s + b.score, 0) / brands.length) : null;
  // Missions du périmètre agence : déposées par elle (email de contact) ou liées à ses marques clientes.
  const missions = await db.mission.findMany({
    where: {
      OR: [{ contactEmail: user.email }, ...(brands.length > 0 ? [{ brandId: { in: brands.map((b) => b.id) } }] : [])],
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  const commissions = await db.earning.findMany({
    where: { talentId: user.id },
    include: { mission: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Espace Agency</p>
        <h1 className="mt-1 text-3xl font-semibold">{profile?.name ?? user.name ?? "Mon agence"}</h1>
        {profile?.description && <p className="mt-1 text-sm text-ink-muted">{profile.description}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Marques clientes pilotées</p>
            <p className="mt-1 font-mono text-3xl font-bold">{brands.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-ink-muted">Score ADVE moyen du portefeuille</p>
            <p className="mt-1 font-mono text-3xl font-bold">
              {avgScore !== null ? `${avgScore}/200` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marques clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {brands.length === 0 ? (
            <EmptyState
              title="Aucune marque cliente rattachée"
              description="Vos marques clientes apparaissent ici quand l'opérateur UPgraders vous les rattache. Commencez par faire diagnostiquer une marque."
              action={
                <Link href="/diagnostic" className={buttonClass({ size: "sm" })}>
                  Lancer un diagnostic
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {brands.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium">{b.name}</p>
                    <p className="text-xs text-ink-muted">{b.sector}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{b.score}/200</span>
                    <Badge variant="gold">{TIER_LABELS[b.tier]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missions</CardTitle>
          <CardDescription>
            Les missions que vous avez déposées sur La Guilde et celles liées à vos marques clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {missions.length === 0 ? (
            <EmptyState
              title="Aucune mission"
              description="Déposez une mission sur le mur public — elle passe en modération avant publication."
              action={
                <Link href="/guilde/deposer" className={buttonClass({ size: "sm" })}>
                  Déposer une mission
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {missions.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link href={`/guilde/${m.slug}`} className="text-sm font-medium hover:text-accent">
                      {m.title}
                    </Link>
                    <p className="font-mono text-xs text-ink-muted">
                      {m.budgetMin != null && m.budgetMax != null
                        ? `${formatMoney(m.budgetMin, m.currency)} – ${formatMoney(m.budgetMax, m.currency)}`
                        : "Budget à discuter"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      m.status === "PUBLISHED"
                        ? "accent"
                        : m.status === "COMPLETED"
                          ? "success"
                          : m.status === "REJECTED" || m.status === "CANCELED"
                            ? "danger"
                            : "neutral"
                    }
                  >
                    {MISSION_STATUS_LABELS[m.status] ?? m.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <EmptyState
              title="Aucune commission"
              description="Les commissions apparaissent quand une mission de La Guilde vous est attribuée par l'opérateur."
            />
          ) : (
            <ul className="divide-y divide-line">
              {commissions.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{e.mission?.title ?? "Mission"}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      Brut {formatMoney(e.grossAmount, e.currency)} · net {formatMoney(e.netAmount, e.currency)}
                    </p>
                  </div>
                  <Badge variant={e.status === "PAID" ? "success" : "neutral"}>
                    {e.status === "PAID" ? "Payé" : e.status === "APPROVED" ? "Approuvé" : "En attente"}
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
