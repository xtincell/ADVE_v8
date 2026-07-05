import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/server/auth/guards";
import { db } from "@/server/db";
import { TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

export default async function AgencyHome() {
  const user = await requireRole(["AGENCY"], "/agency");
  const profile = await db.agencyProfile.findUnique({ where: { userId: user.id } });
  // Marques clientes de l'agence : marques dont l'agence est le founder délégué.
  const brands = await db.brand.findMany({
    where: { founderId: user.id, isShell: false },
    orderBy: { score: "desc" },
  });
  const avgScore = brands.length > 0 ? Math.round(brands.reduce((s, b) => s + b.score, 0) / brands.length) : null;

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
    </div>
  );
}
