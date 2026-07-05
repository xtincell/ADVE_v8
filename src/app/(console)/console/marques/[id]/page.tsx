import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { asPillarFields, CASCADE_ORDER, pillarDef } from "@/server/brands/pillar-config";
import { PILLAR_MAX, TIER_LABELS } from "@/server/scoring/score";
import { formatMoney, TIER_NAMES } from "@/server/billing/pricing";
import { refreshChainAction } from "@/app/(cockpit)/cockpit/marque/actions";
import { generateOracleAction } from "@/app/(cockpit)/cockpit/livrables/actions";

export const dynamic = "force-dynamic";

export default async function ConsoleBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdminWithMfa("/console/marques");
  const { id } = await params;
  const brand = await db.brand.findUnique({
    where: { id },
    include: {
      founder: { select: { email: true, name: true } },
      pillars: true,
      oracleReports: { orderBy: { version: "desc" }, take: 5 },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { email: true } } } },
      payments: { orderBy: { createdAt: "desc" }, take: 8 },
      snapshots: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!brand || brand.operatorId !== me.operatorId) notFound();
  const byKind = new Map(brand.pillars.map((p) => [p.kind, p]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/console/marques" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
          ← Portefeuille
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold">
              {brand.name}
              {brand.isShell && <Badge variant="outline">Shell</Badge>}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {brand.sector ?? "—"} · {brand.city ?? brand.country ?? "—"} · founder :{" "}
              {brand.founder ? `${brand.founder.name ?? ""} <${brand.founder.email}>` : "aucun"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-3xl font-bold">{brand.score}<span className="text-base text-ink-faint">/200</span></p>
            <Badge variant="gold">{TIER_LABELS[brand.tier]}</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <form action={refreshChainAction}>
          <input type="hidden" name="brandId" value={brand.id} />
          <Button type="submit" variant="outline" size="sm">Recalculer R→T→I→S</Button>
        </form>
        <form action={generateOracleAction}>
          <input type="hidden" name="brandId" value={brand.id} />
          <Button type="submit" variant="outline" size="sm">Générer un Oracle</Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Piliers (édition opérateur via le point d&apos;écriture unique)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {CASCADE_ORDER.map((kind) => {
              const def = pillarDef(kind);
              const pillar = byKind.get(kind);
              const fieldCount = pillar ? Object.keys(asPillarFields(pillar.fields)).length : 0;
              return (
                <div key={kind} className="flex items-center justify-between border-b border-line py-2 last:border-0">
                  <Link
                    href={`/cockpit/marque/${kind.toLowerCase()}?marque=${brand.id}`}
                    className="flex items-center gap-2 text-sm hover:text-accent"
                  >
                    <span className={`font-display font-bold ${def.derived ? "text-gold-strong" : "text-accent"}`}>{def.letter}</span>
                    {def.name}
                    {pillar?.stale && <Badge variant="gold">Périmé</Badge>}
                  </Link>
                  <span className="font-mono text-xs">
                    {pillar?.score ?? 0}/{PILLAR_MAX} · {fieldCount} champs
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Abonnements & paiements</CardTitle>
          </CardHeader>
          <CardContent>
            {brand.subscriptions.length === 0 && brand.payments.length === 0 ? (
              <p className="text-sm italic text-ink-faint">Aucune activité financière sur cette marque.</p>
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {brand.subscriptions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                      <span>{TIER_NAMES[s.tier]} · {s.user.email}</span>
                      <Badge variant={s.status === "ACTIVE" ? "success" : s.status === "PENDING_MANUAL" ? "gold" : "neutral"}>
                        {s.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <ul className="mt-2 divide-y divide-line border-t border-line">
                  {brand.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2 font-mono text-xs">
                      <span>{p.tier} · {formatMoney(p.amount, p.currency)}</span>
                      <span className={p.status === "SUCCEEDED" ? "text-success" : "text-ink-muted"}>{p.status}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rapports Oracle</CardTitle>
          </CardHeader>
          <CardContent>
            {brand.oracleReports.length === 0 ? (
              <p className="text-sm italic text-ink-faint">Aucun rapport généré.</p>
            ) : (
              <ul className="divide-y divide-line">
                {brand.oracleReports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/cockpit/livrables/oracle/${r.id}`} className="hover:text-accent">
                      v{r.version} — {r.scoreAtGen}/200 ·{" "}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(r.createdAt)}
                    </Link>
                    <a href={`/api/oracle/${r.id}/pdf`} className={buttonClass({ variant: "ghost", size: "sm" })}>
                      PDF
                    </a>
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
