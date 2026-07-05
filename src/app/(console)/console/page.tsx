import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { formatMoney } from "@/server/billing/pricing";

export const dynamic = "force-dynamic";

export default async function ConsoleHome() {
  await requireAdminWithMfa("/console");
  const operator = await getDefaultOperator();

  const [users, brands, missionsPending, subsPending, paymentsSucceeded, mrr] = await Promise.all([
    db.user.count({ where: { operatorId: operator.id } }),
    db.brand.count({ where: { operatorId: operator.id, isShell: false } }),
    db.mission.count({ where: { operatorId: operator.id, status: "PENDING_REVIEW" } }),
    db.subscription.count({ where: { operatorId: operator.id, status: "PENDING_MANUAL" } }),
    db.payment.count({ where: { operatorId: operator.id, status: "SUCCEEDED" } }),
    db.subscription.findMany({
      where: { operatorId: operator.id, status: "ACTIVE" },
      include: { payments: { where: { status: "SUCCEEDED" }, orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  ]);
  const mrrAmount = mrr.reduce((sum, s) => sum + (s.payments[0]?.amount ?? 0), 0);

  const tiles: { label: string; value: string; href?: string; alert?: boolean }[] = [
    { label: "Utilisateurs", value: String(users) },
    { label: "Marques actives", value: String(brands) },
    { label: "Missions à modérer", value: String(missionsPending), alert: missionsPending > 0 },
    { label: "Paiements manuels en attente", value: String(subsPending), alert: subsPending > 0 },
    { label: "Paiements encaissés", value: String(paymentsSucceeded) },
    { label: "MRR (abonnements actifs)", value: formatMoney(mrrAmount, "XOF") },
  ];

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console — {operator.name}</p>
      <h1 className="mt-1 text-3xl font-semibold">Vue d&apos;ensemble</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className={t.alert ? "border-gold" : undefined}>
            <CardContent className="pt-5">
              <p className="text-sm text-ink-muted">{t.label}</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-sm text-ink-muted">
        Les rubriques Portefeuille, Argent, Guilde, Vault, Config et Audit arrivent tranche par
        tranche — la navigation s&apos;étend à mesure qu&apos;elles sont livrées. Le mur public de
        la Guilde est déjà consultable{" "}
        <Link href="/guilde" className="underline">ici</Link>.
      </p>
    </div>
  );
}
