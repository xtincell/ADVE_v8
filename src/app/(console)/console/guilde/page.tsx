import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { formatMoney } from "@/server/billing/pricing";
import { decideApplicationAction, moderateMissionAction } from "./actions";

export const dynamic = "force-dynamic";

const TALENT_TIER_LABELS: Record<string, string> = {
  APPRENTI: "Apprenti",
  COMPAGNON: "Compagnon",
  MAITRE: "Maître",
  ASSOCIE: "Associé",
};

export default async function ConsoleGuildePage() {
  await requireAdminWithMfa("/console/guilde");
  const operator = await getDefaultOperator();

  const pending = await db.mission.findMany({
    where: { operatorId: operator.id, status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
  });
  const open = await db.mission.findMany({
    where: { operatorId: operator.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      applications: {
        where: { status: { in: ["SUBMITTED", "SHORTLISTED"] } },
        include: { talent: { include: { talentProfile: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  const talents = await db.talentProfile.findMany({
    where: { operatorId: operator.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const earnings = await db.earning.findMany({
    where: { operatorId: operator.id },
    include: { talent: { select: { email: true } }, mission: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Guilde</p>
        <h1 className="mt-1 text-3xl font-semibold">Missions, talents & commissions</h1>
      </div>

      <Card className={pending.length > 0 ? "border-gold" : undefined}>
        <CardHeader>
          <CardTitle>À modérer ({pending.length})</CardTitle>
          <CardDescription>Publier rend la mission visible sur le mur public — sans les coordonnées.</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState title="Rien à modérer" description="Les dépôts publics arrivent ici." />
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((m) => (
                <li key={m.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{m.title}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">{m.summary}</p>
                      <p className="mt-1 font-mono text-xs text-ink-faint">
                        {m.sector ?? "—"} · {m.country ?? "—"} ·{" "}
                        {m.budgetMin != null && m.budgetMax != null
                          ? `${formatMoney(m.budgetMin, m.currency)} – ${formatMoney(m.budgetMax, m.currency)}`
                          : "budget à discuter"}{" "}
                        · contact : {m.contactName} &lt;{m.contactEmail}&gt;
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <form action={moderateMissionAction}>
                        <input type="hidden" name="missionId" value={m.id} />
                        <input type="hidden" name="decision" value="publish" />
                        <Button type="submit" size="sm">Publier</Button>
                      </form>
                      <form action={moderateMissionAction} className="flex items-center gap-2">
                        <input type="hidden" name="missionId" value={m.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Input name="reason" placeholder="Motif" className="h-8 w-36 text-xs" />
                        <Button type="submit" size="sm" variant="danger">Rejeter</Button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidatures à arbitrer</CardTitle>
          <CardDescription>L&apos;opérateur décide — jamais de premier-arrivé-premier-servi.</CardDescription>
        </CardHeader>
        <CardContent>
          {open.every((m) => m.applications.length === 0) ? (
            <EmptyState title="Aucune candidature ouverte" description="Les devis des talents sur les missions publiées arrivent ici." />
          ) : (
            <div className="space-y-5">
              {open
                .filter((m) => m.applications.length > 0)
                .map((m) => (
                  <div key={m.id}>
                    <Link href={`/guilde/${m.slug}`} className="text-sm font-semibold hover:text-accent">
                      {m.title}
                    </Link>
                    <ul className="mt-2 divide-y divide-line rounded-(--radius-md) border border-line">
                      {m.applications.map((a) => {
                        const quote = a.quote as { delaiJours?: number; lignes?: { label: string; amount: number }[] } | null;
                        return (
                          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">
                                {a.talent.name ?? a.talent.email}{" "}
                                <Badge variant="gold">{TALENT_TIER_LABELS[a.talent.talentProfile?.tier ?? "APPRENTI"]}</Badge>
                                {a.status === "SHORTLISTED" && <Badge variant="info">Présélection</Badge>}
                              </p>
                              <p className="font-mono text-xs text-ink-muted">
                                Devis {a.quoteAmount != null ? formatMoney(a.quoteAmount, m.currency) : "—"}
                                {quote?.delaiJours ? ` · ${quote.delaiJours} j` : ""}
                              </p>
                              {a.message && <p className="mt-1 line-clamp-2 max-w-xl text-xs text-ink-muted">{a.message}</p>}
                            </div>
                            <div className="flex shrink-0 gap-2">
                              {a.status === "SUBMITTED" && (
                                <form action={decideApplicationAction}>
                                  <input type="hidden" name="applicationId" value={a.id} />
                                  <input type="hidden" name="decision" value="SHORTLISTED" />
                                  <Button type="submit" size="sm" variant="outline">Présélectionner</Button>
                                </form>
                              )}
                              <form action={decideApplicationAction}>
                                <input type="hidden" name="applicationId" value={a.id} />
                                <input type="hidden" name="decision" value="ACCEPTED" />
                                <Button type="submit" size="sm">Retenir</Button>
                              </form>
                              <form action={decideApplicationAction}>
                                <input type="hidden" name="applicationId" value={a.id} />
                                <input type="hidden" name="decision" value="REJECTED" />
                                <Button type="submit" size="sm" variant="ghost">Refuser</Button>
                              </form>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Annuaire talents ({talents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {talents.length === 0 ? (
              <EmptyState title="Aucun talent" description="Les inscriptions via /guilde/talents apparaissent ici." />
            ) : (
              <ul className="divide-y divide-line">
                {talents.slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{t.user.name ?? t.user.email}</p>
                      <p className="truncate text-xs text-ink-muted">{t.headline ?? "—"} · {t.skills.slice(0, 3).join(", ")}</p>
                    </div>
                    <Badge variant="gold">{TALENT_TIER_LABELS[t.tier]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relevés de commissions</CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <EmptyState title="Aucun relevé" description="Créés automatiquement quand une candidature est retenue." />
            ) : (
              <ul className="divide-y divide-line">
                {earnings.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <p className="text-sm">{e.mission?.title ?? "Mission"} — {e.talent.email}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      Brut {formatMoney(e.grossAmount, e.currency)} · commission {(e.commissionRate * 100).toFixed(0)} % ={" "}
                      {formatMoney(e.commissionAmount, e.currency)} · net talent {formatMoney(e.netAmount, e.currency)} ·{" "}
                      {e.status === "PENDING" ? "en attente" : e.status === "APPROVED" ? "approuvé" : "payé"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
