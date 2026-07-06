import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { TIER_LABELS } from "@/server/scoring/score";

export const metadata: Metadata = {
  title: "Réalisations",
  description: "Ce que la méthode produit, démontré sur les marques pilotées dans La Fusée.",
};

export const dynamic = "force-dynamic";

export default async function RealisationsPage() {
  const operator = await getDefaultOperator();
  // Honest-empty : on ne montre que des marques réellement pilotées dans l'outil.
  const brands = await db.brand.findMany({
    where: { operatorId: operator.id, isShell: false },
    orderBy: { score: "desc" },
    take: 6,
    include: { snapshots: { orderBy: { createdAt: "asc" }, take: 1 } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Réalisations</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold md:text-5xl">
        La preuve est dans le produit.
      </h1>
      <p className="mt-5 max-w-2xl text-ink-muted">
        Plutôt qu&apos;un mur de logos, voici des marques réellement pilotées dans La Fusée — à
        commencer par les nôtres, soumises aux mêmes règles que celles de nos clients. Pour chaque
        marque : son score actuel et son point de départ, calculés par le même moteur déterministe
        que le vôtre.
      </p>
      <div className="mt-8 overflow-hidden rounded-(--radius-md) border border-line shadow-sm">
        <img
          src="/images/roaster.webp"
          alt="Artisan torréfacteur d'une marque créative africaine, gros plan sur les grains fraîchement torréfiés"
          width={1100}
          height={738}
          className="h-56 w-full object-cover md:h-72"
          loading="lazy"
        />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => {
          const first = b.snapshots[0];
          const progress = first ? b.score - first.score : null;
          return (
            <Card key={b.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-semibold">{b.name}</h2>
                    <p className="text-xs text-ink-muted">
                      {b.sector} · {b.city ?? b.country}
                    </p>
                  </div>
                  {b.isDemo && <Badge variant="outline">Démo</Badge>}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="font-mono text-3xl font-bold tabular-nums">
                      {b.score}
                      <span className="text-sm text-ink-faint">/200</span>
                    </p>
                    <Badge variant="gold" className="mt-1">{TIER_LABELS[b.tier]}</Badge>
                  </div>
                  {progress !== null && progress > 0 && (
                    <p className="font-mono text-sm font-semibold text-success">+{progress} pts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-ink-faint">
        Les études de cas clientes détaillées sont publiées avec l&apos;accord écrit des marques
        concernées — les premières arrivent avec nos clients pilotes.
      </p>
      <div className="mt-8">
        <Link href="/diagnostic" className={buttonClass({ size: "lg" })}>
          Obtenir mon score de départ
        </Link>
      </div>
    </div>
  );
}
