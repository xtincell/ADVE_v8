import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { getOwnedBrand } from "@/server/brands/queries";
import { checkOneShotGate } from "@/server/billing/gates";
import { db } from "@/server/db";
import { TIER_LABELS } from "@/server/scoring/score";
import { generateOracleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LivrablesPage() {
  const user = await requireUser("/cockpit/livrables");
  const brand = await getOwnedBrand(user);
  if (!brand) {
    return (
      <EmptyState
        title="Aucune marque"
        description="Les livrables se génèrent depuis votre marque — commencez par le diagnostic."
        action={<Link href="/diagnostic" className={buttonClass({})}>Faire mon diagnostic</Link>}
      />
    );
  }
  const reports = await db.oracleReport.findMany({
    where: { brandId: brand.id },
    orderBy: { version: "desc" },
    include: { _count: { select: { sections: { where: { status: "COMPLETE" } } } } },
  });
  const stalePillars = await db.pillar.count({ where: { brandId: brand.id, stale: true } });
  const oracleGate = await checkOneShotGate(user, "ORACLE_FULL", { brandId: brand.id });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Livrables</p>
          <h1 className="mt-1 text-3xl font-semibold">L&apos;Oracle</h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Le rapport de stratégie en 35 sections, généré depuis vos piliers. Chaque génération
            gèle un snapshot horodaté et scellé — le rapport ne dit que ce que la marque a déclaré.
          </p>
        </div>
        {oracleGate.allowed ? (
          <form action={generateOracleAction}>
            <input type="hidden" name="brandId" value={brand.id} />
            <Button type="submit" size="lg">
              Générer l&apos;Oracle ({brand.score}/200)
            </Button>
          </form>
        ) : (
          <Link href={`/paiement?offre=ORACLE_FULL&marque=${brand.id}`} className={buttonClass({ size: "lg" })}>
            Débloquer l&apos;Oracle
          </Link>
        )}
      </div>

      {!oracleGate.allowed && (
        <div className="rounded-(--radius-md) border border-line bg-surface-raised px-4 py-3 text-sm">
          {oracleGate.pending ? (
            <>
              <strong>Paiement en attente de validation.</strong> Un opérateur confirme la
              réception des fonds — la génération se débloquera automatiquement.
            </>
          ) : (
            <>
              <span className="font-mono text-xs text-ink-faint">TIER_GATE_DENIED · </span>
              L&apos;Oracle est un achat one-shot par marque (inclus dans les retainers). Vos
              rapports déjà générés restent consultables ci-dessous.
            </>
          )}
        </div>
      )}

      {stalePillars > 0 && (
        <div className="rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
          Votre stratégie est périmée ({stalePillars} pilier{stalePillars > 1 ? "s" : ""}) —{" "}
          <Link href="/cockpit/marque" className="font-medium underline">
            recalculez-la
          </Link>{" "}
          avant de générer pour un rapport à jour.
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState
          title="Aucun rapport généré"
          description="Générez votre premier Oracle : 21 sections déterministes composées depuis votre socle, enrichissables ensuite."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Rapports générés</CardTitle>
            <CardDescription>Chaque version est immuable et reste consultable.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">v{r.version}</Badge>
                    <div>
                      <Link href={`/cockpit/livrables/oracle/${r.id}`} className="font-medium hover:text-accent">
                        Oracle — {r.scoreAtGen}/200 · {TIER_LABELS[r.tierAtGen]}
                      </Link>
                      <p className="font-mono text-xs text-ink-faint">
                        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(r.createdAt)}{" "}
                        · {r._count.sections}/35 sections · hash {r.pillarsHash.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.stale && <Badge variant="gold">Socle modifié depuis</Badge>}
                    <a
                      href={`/api/oracle/${r.id}/pdf`}
                      className={buttonClass({ variant: "outline", size: "sm" })}
                    >
                      Exporter PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
