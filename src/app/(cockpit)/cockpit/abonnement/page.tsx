import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { formatMoney, TIER_NAMES } from "@/server/billing/pricing";
import { cancelSubscriptionAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "gold" | "danger" | "neutral" | "info" }> = {
  ACTIVE: { label: "Actif", variant: "success" },
  TRIALING: { label: "Essai", variant: "info" },
  PENDING_MANUAL: { label: "En attente de validation", variant: "gold" },
  PAST_DUE: { label: "Impayé", variant: "danger" },
  CANCELED: { label: "Résilié", variant: "neutral" },
  EXPIRED: { label: "Expiré", variant: "neutral" },
};

export default async function AbonnementPage() {
  const user = await requireUser("/cockpit/abonnement");
  const subscriptions = await db.subscription.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  const payments = await db.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { invoice: true },
  });
  const current = subscriptions.find((s) => s.status === "ACTIVE" || s.status === "TRIALING");
  const pending = subscriptions.find((s) => s.status === "PENDING_MANUAL");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Réglages</p>
        <h1 className="mt-1 text-3xl font-semibold">Abonnement & facturation</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mon abonnement</CardTitle>
        </CardHeader>
        <CardContent>
          {current ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 font-display text-lg font-semibold">
                  {TIER_NAMES[current.tier]}
                  <Badge variant={STATUS_LABELS[current.status]!.variant}>{STATUS_LABELS[current.status]!.label}</Badge>
                </p>
                {current.currentPeriodEnd && (
                  <p className="mt-1 text-sm text-ink-muted">
                    {current.canceledAt ? "Accès jusqu'au" : "Prochaine échéance :"}{" "}
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(current.currentPeriodEnd)}
                  </p>
                )}
              </div>
              {!current.canceledAt && (
                <form action={cancelSubscriptionAction}>
                  <input type="hidden" name="id" value={current.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Résilier (fin de période)
                  </Button>
                </form>
              )}
            </div>
          ) : pending ? (
            <div className="rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
              <strong>{TIER_NAMES[pending.tier]} — en attente de validation.</strong> Votre paiement
              manuel est dans la file de l&apos;opérateur ; l&apos;accès s&apos;ouvre à la
              validation, pour 30 jours. Aucun droit n&apos;est ouvert avant.
            </div>
          ) : (
            <EmptyState
              title="Aucun abonnement actif"
              description="Le Cockpit mensuel débloque l'intelligence communautaire, la forge avancée et l'accès API."
              action={
                <Link href="/paiement?offre=COCKPIT_MONTHLY" className={buttonClass({})}>
                  S&apos;abonner au Cockpit
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paiements & factures</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState title="Aucun paiement" description="Vos paiements et factures apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-line">
              {payments.map((pay) => (
                <li key={pay.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm font-medium">
                      {pay.tier ? TIER_NAMES[pay.tier] : "Paiement"} —{" "}
                      <span className="font-mono">{formatMoney(pay.amount, pay.currency)}</span>
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(pay.createdAt)}
                      {pay.invoice ? ` · facture ${pay.invoice.number}` : ""}
                      {pay.providerRef ? ` · réf ${pay.providerRef}` : ""}
                    </p>
                  </div>
                  <Badge
                    variant={pay.status === "SUCCEEDED" ? "success" : pay.status === "PENDING" ? "gold" : pay.status === "FAILED" ? "danger" : "neutral"}
                  >
                    {pay.status === "SUCCEEDED" ? "Payé" : pay.status === "PENDING" ? "En attente" : pay.status === "FAILED" ? "Échoué" : pay.status}
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
