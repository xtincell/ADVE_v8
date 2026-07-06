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
import { EXPOSED_KINDS } from "@/server/assets/composers";
import { activateAssetAction, archiveAssetAction, generateOracleAction } from "./actions";
import { ForgeForm } from "./forge-form";

const KIND_LABELS = Object.fromEntries(EXPOSED_KINDS.map((k) => [k.kind, k.label]));

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
  const assets = await db.brandAsset.findMany({
    where: { brandId: brand.id, kind: { in: EXPOSED_KINDS.map((k) => k.kind) } },
    orderBy: { createdAt: "desc" },
  });
  const vault = assets.filter((a) => a.status !== "ARCHIVED");
  const archivedCount = assets.length - vault.length;

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

      <section className="mt-4 flex flex-col gap-4" aria-labelledby="forge-title">
        <div>
          <h2 id="forge-title" className="text-2xl font-semibold">Forge &amp; vault d&apos;assets</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            Vos livrables de marque (positionnement, manifeste, pitch…) composés depuis le socle
            déclaré. Cycle de vie : brouillon → actif → remplacé ; un asset actif se périme quand
            l&apos;ADVE bouge.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forger un livrable</CardTitle>
            <CardDescription>Chaque forge crée une nouvelle version en brouillon dans le vault.</CardDescription>
          </CardHeader>
          <CardContent>
            <ForgeForm brandId={brand.id} kinds={EXPOSED_KINDS} />
          </CardContent>
        </Card>

        {vault.length === 0 ? (
          <EmptyState
            title="Vault vide"
            description="Forgez votre premier asset : il n'utilisera que ce que votre marque a déclaré."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Vault ({vault.length})</CardTitle>
              {archivedCount > 0 && (
                <CardDescription>{archivedCount} asset{archivedCount > 1 ? "s" : ""} archivé{archivedCount > 1 ? "s" : ""} non affiché{archivedCount > 1 ? "s" : ""}.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-line">
                {vault.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/cockpit/livrables/asset/${a.id}`} className="font-medium hover:text-accent">
                        {a.title}
                      </Link>
                      <p className="font-mono text-xs text-ink-faint">
                        {KIND_LABELS[a.kind] ?? a.kind} · v{a.version} ·{" "}
                        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(a.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.staleAt && <Badge variant="gold">Périmé</Badge>}
                      {a.status === "ACTIVE" && <Badge variant="accent">Actif</Badge>}
                      {a.status === "DRAFT" && <Badge variant="outline">Brouillon</Badge>}
                      {a.status === "SUPERSEDED" && <Badge variant="neutral">Remplacé</Badge>}
                      {a.status === "DRAFT" && (
                        <form action={activateAssetAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" size="sm" variant="outline">Activer</Button>
                        </form>
                      )}
                      <form action={archiveAssetAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button type="submit" size="sm" variant="ghost" aria-label={`Archiver ${a.title}`}>
                          Archiver
                        </Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
