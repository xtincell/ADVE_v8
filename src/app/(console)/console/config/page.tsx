import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminWithMfa } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getDefaultOperator } from "@/server/tenancy";
import { getCommissionRates, getSetting } from "@/server/settings";
import { PriceGridEditor } from "./price-grid-editor";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function ConsoleConfigPage() {
  await requireAdminWithMfa("/console/config");
  const operator = await getDefaultOperator();
  const [rules, countries, rates, whatsapp, duration] = await Promise.all([
    db.priceRule.findMany({ where: { operatorId: operator.id }, orderBy: [{ tier: "asc" }, { zone: "asc" }] }),
    db.country.findMany({ orderBy: [{ zone: "asc" }, { name: "asc" }] }),
    getCommissionRates(operator.id),
    getSetting<string>(operator.id, "manual_payment.whatsapp_number"),
    getSetting<number>(operator.id, "manual_payment.duration_days"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Console · Config</p>
        <h1 className="mt-1 text-3xl font-semibold">Configuration</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grille tarifaire localisée</CardTitle>
          <CardDescription>
            FCFA entiers (XOF/XAF), centimes pour l&apos;euro. 0 sur un tier payant = « sur devis ».
            La grille est la seule source des prix — rien n&apos;est codé en dur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PriceGridEditor
            rules={rules.map((r) => ({ id: r.id, tier: r.tier, zone: r.zone, amount: r.amount, currency: r.currency, active: r.active }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paramètres opérateur</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            rates={rates}
            whatsapp={whatsapp ?? ""}
            durationDays={duration ?? 30}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pays & zones ({countries.length})</CardTitle>
          <CardDescription>Référentiel de localisation des prix (seedé, indices ajustables en base).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-6 gap-y-1 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((c) => (
              <p key={c.code} className="flex justify-between border-b border-line py-1">
                <span>{c.code} · {c.name}</span>
                <span className="text-ink-muted">{c.zone} · ×{c.priceIndex}</span>
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
