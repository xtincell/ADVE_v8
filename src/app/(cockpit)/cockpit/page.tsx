import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { asPillarFields, CASCADE_ORDER, pillarDef } from "@/server/brands/pillar-config";
import { PILLAR_MAX, TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

export default async function CockpitDashboard() {
  const user = await requireUser("/cockpit");
  const brand = await db.brand.findFirst({
    where: { founderId: user.id, isShell: false },
    orderBy: { createdAt: "asc" },
    include: {
      pillars: true,
      actions: { where: { status: { in: ["TODO", "DOING"] } }, orderBy: { dueAt: "asc" }, take: 5 },
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!brand) {
    return (
      <EmptyState
        title="Aucune marque dans votre Cockpit"
        description="Votre marque naît d'un diagnostic : 10 minutes de questionnaire, un score /200, et votre socle est posé."
        action={
          <Link href="/diagnostic" className={buttonClass({})}>
            Faire mon diagnostic gratuit
          </Link>
        }
      />
    );
  }

  const pillarsByKind = new Map(brand.pillars.map((p) => [p.kind, p]));
  const ordered = CASCADE_ORDER.map((kind) => ({
    def: pillarDef(kind),
    pillar: pillarsByKind.get(kind) ?? null,
  }));
  const staleCount = brand.pillars.filter((p) => p.stale).length;
  const lastSnapshot = brand.snapshots[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Tableau de bord</p>
          <h1 className="mt-1 text-3xl font-semibold">{brand.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {brand.sector} · {brand.city ?? brand.country}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-4xl font-bold tabular-nums">
            {brand.score}
            <span className="text-lg text-ink-faint">/200</span>
          </p>
          <Badge variant="gold" className="mt-1">{TIER_LABELS[brand.tier]}</Badge>
        </div>
      </div>

      {staleCount > 0 && (
        <div className="rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
          <strong>{staleCount} pilier{staleCount > 1 ? "s" : ""} stratégique{staleCount > 1 ? "s" : ""} périmé{staleCount > 1 ? "s" : ""}</strong>{" "}
          — votre socle a été amendé depuis le dernier recalcul. Le refresh arrive dans « Ma marque ».
        </div>
      )}

      {/* État des 8 piliers */}
      <Card>
        <CardHeader>
          <CardTitle>Les 8 piliers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {ordered.map(({ def, pillar }) => {
              const score = pillar?.score ?? 0;
              const fieldCount = pillar ? Object.keys(asPillarFields(pillar.fields)).length : 0;
              return (
                <div key={def.kind}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className={`font-display font-bold ${def.derived ? "text-gold-strong" : "text-accent"}`}>
                        {def.letter}
                      </span>
                      {def.name}
                      {pillar?.stale && <Badge variant="gold">Périmé</Badge>}
                      {!pillar?.version && def.derived && <Badge variant="outline">Jamais calculé</Badge>}
                    </span>
                    <span className="font-mono text-xs font-semibold">
                      {score}/{PILLAR_MAX}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className={`h-full rounded-full ${def.derived ? "bg-gold" : "bg-accent"} ${pillar?.stale ? "opacity-50" : ""}`}
                      style={{ width: `${(score / PILLAR_MAX) * 100}%` }}
                    />
                  </div>
                  {!def.derived && fieldCount === 0 && (
                    <p className="mt-1 text-xs italic text-ink-faint">Aucune donnée — à renseigner</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Prochaines actions */}
      <Card>
        <CardHeader>
          <CardTitle>Prochaines actions</CardTitle>
        </CardHeader>
        <CardContent>
          {brand.actions.length === 0 ? (
            <EmptyState
              title="Aucune action planifiée"
              description="Les actions naissent de votre stratégie (pilier S) ou se créent à la main dans Opérations."
            />
          ) : (
            <ul className="divide-y divide-line">
              {brand.actions.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={a.status === "DOING" ? "accent" : "neutral"}>
                      {a.status === "DOING" ? "En cours" : "À faire"}
                    </Badge>
                    <span className="text-sm">{a.title}</span>
                  </div>
                  {a.dueAt && (
                    <span className="shrink-0 font-mono text-xs text-ink-faint">
                      {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(a.dueAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {lastSnapshot && (
        <p className="text-xs text-ink-faint">
          Dernier recalcul du score :{" "}
          {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(lastSnapshot.createdAt)}
        </p>
      )}
    </div>
  );
}
