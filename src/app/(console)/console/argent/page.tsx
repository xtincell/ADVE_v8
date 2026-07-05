import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { formatMoney, TIER_NAMES } from "@/server/billing/pricing";
import { rejectManualPaymentAction, validateManualPaymentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConsoleArgentPage() {
  await requireAdminWithMfa("/console/argent");
  const operator = await getDefaultOperator();

  const pendingManual = await db.payment.findMany({
    where: { operatorId: operator.id, provider: "MANUAL_WHATSAPP", status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: true, subscription: true, intakeSession: true },
  });
  const recent = await db.payment.findMany({
    where: { operatorId: operator.id, status: { in: ["SUCCEEDED", "FAILED"] } },
    orderBy: { updatedAt: "desc" },
    take: 15,
    include: { user: true, invoice: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Argent</p>
        <h1 className="mt-1 text-3xl font-semibold">File de validation & paiements</h1>
      </div>

      <Card className={pendingManual.length > 0 ? "border-gold" : undefined}>
        <CardHeader>
          <CardTitle>Paiements manuels en attente ({pendingManual.length})</CardTitle>
          <CardDescription>
            Ne validez qu&apos;après réception EFFECTIVE des fonds (preuve WhatsApp). La validation
            ouvre les droits pour 30 jours et émet la facture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingManual.length === 0 ? (
            <EmptyState title="File vide" description="Aucun paiement manuel n'attend de validation." />
          ) : (
            <ul className="divide-y divide-line">
              {pendingManual.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="text-sm font-medium">
                      {p.user?.name ?? p.user?.email ?? p.intakeSession?.brandName ?? "Prospect (intake)"} —{" "}
                      {p.tier ? TIER_NAMES[p.tier] : "paiement"}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-muted">
                      {formatMoney(p.amount, p.currency)} · réf {p.providerRef ?? "—"} ·{" "}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={validateManualPaymentAction}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <Button type="submit" size="sm">
                        Valider (fonds reçus)
                      </Button>
                    </form>
                    <form action={rejectManualPaymentAction} className="flex items-center gap-2">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <Input name="reason" placeholder="Motif du rejet" className="h-8 w-44 text-xs" required />
                      <Button type="submit" size="sm" variant="danger">
                        Rejeter
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Derniers paiements</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState title="Aucun paiement" description="Les paiements traités apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <p className="text-sm">
                      {p.user?.email ?? "—"} · {p.tier ? TIER_NAMES[p.tier] : "paiement"} ·{" "}
                      <span className="font-mono">{formatMoney(p.amount, p.currency)}</span>
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {p.provider} · {p.invoice ? `facture ${p.invoice.number} · ` : ""}
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(p.updatedAt)}
                    </p>
                  </div>
                  <Badge variant={p.status === "SUCCEEDED" ? "success" : "danger"}>
                    {p.status === "SUCCEEDED" ? "Encaissé" : "Rejeté/échoué"}
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
