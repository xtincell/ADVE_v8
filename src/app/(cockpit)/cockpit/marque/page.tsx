import Link from "next/link";
import { Badge, CertaintyBadge } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { getBrandWithPillars } from "@/server/brands/queries";
import { asPillarFields, CASCADE_ORDER, pillarDef } from "@/server/brands/pillar-config";
import { PILLAR_MAX, TIER_LABELS } from "@/server/scoring/score";
import { refreshChainAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MarquePage() {
  const user = await requireUser("/cockpit/marque");
  const data = await getBrandWithPillars(user);
  if (!data) {
    return (
      <EmptyState
        title="Aucune marque à piloter"
        description="Créez votre marque en passant par le diagnostic gratuit."
        action={<Link href="/diagnostic" className={buttonClass({})}>Faire mon diagnostic</Link>}
      />
    );
  }
  const { brand, pillars } = data;
  const byKind = new Map(pillars.map((p) => [p.kind, p]));
  const staleCount = pillars.filter((p) => p.stale).length;
  const neverRefreshed = CASCADE_ORDER.filter((k) => pillarDef(k).derived && !byKind.get(k)?.version).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Ma marque</p>
          <h1 className="mt-1 text-3xl font-semibold">{brand.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Score {brand.score}/200 · palier {TIER_LABELS[brand.tier]}
          </p>
        </div>
        <form action={refreshChainAction}>
          <input type="hidden" name="brandId" value={brand.id} />
          <Button type="submit" variant={staleCount > 0 || neverRefreshed > 0 ? "primary" : "outline"}>
            Recalculer la stratégie (R→T→I→S)
          </Button>
        </form>
      </div>

      {staleCount > 0 && (
        <div className="rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
          <strong>Stratégie périmée.</strong> Votre socle a été amendé depuis le dernier recalcul —
          les piliers dérivés comptent à demi jusqu&apos;au prochain rafraîchissement.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {CASCADE_ORDER.map((kind) => {
          const def = pillarDef(kind);
          const pillar = byKind.get(kind);
          const fields = asPillarFields(pillar?.fields);
          const fieldStates = def.fields.map((f) => ({ def: f, state: fields[f.key] }));
          const filled = fieldStates.filter((f) => f.state).length;
          const toValidate = fieldStates.filter((f) => f.state?.certainty === "INFERRED").length;
          return (
            <Card key={kind} className={pillar?.stale ? "border-gold" : undefined}>
              <CardContent className="flex h-full flex-col pt-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">
                    <span className={def.derived ? "text-gold-strong" : "text-accent"}>{def.letter}</span> · {def.name}
                  </h2>
                  <span className="font-mono text-sm font-bold">
                    {pillar?.score ?? 0}<span className="text-ink-faint">/{PILLAR_MAX}</span>
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-muted">{def.question}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {def.derived ? (
                    <>
                      {pillar?.stale && <Badge variant="gold">Périmé</Badge>}
                      {!pillar?.version && <Badge variant="outline">Jamais calculé</Badge>}
                      {pillar?.refreshedAt && !pillar.stale && (
                        <Badge variant="success">
                          À jour ({new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(pillar.refreshedAt)})
                        </Badge>
                      )}
                    </>
                  ) : (
                    <>
                      <Badge variant="neutral">{filled}/{def.fields.length} champs</Badge>
                      {toValidate > 0 && <Badge variant="gold">{toValidate} à valider</Badge>}
                    </>
                  )}
                  {pillar && pillar.version > 0 && <Badge variant="outline">v{pillar.version}</Badge>}
                </div>
                <div className="mt-4 flex-1">
                  {fieldStates.filter((f) => f.state).slice(0, 2).map(({ def: f, state }) => (
                    <div key={f.key} className="mt-2 first:mt-0">
                      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                        {f.label} <CertaintyBadge certainty={state!.certainty} />
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm">
                        {Array.isArray(state!.value) ? state!.value.join(" · ") : state!.value}
                      </p>
                    </div>
                  ))}
                  {filled === 0 && !def.derived && (
                    <p className="text-sm italic text-ink-faint">Aucun champ renseigné — commencez ici.</p>
                  )}
                  {def.derived && !pillar?.version && (
                    <p className="text-sm italic text-ink-faint">
                      Se calcule depuis votre socle ADVE — lancez le recalcul.
                    </p>
                  )}
                </div>
                <Link
                  href={`/cockpit/marque/${def.kind.toLowerCase()}`}
                  className={buttonClass({ variant: "outline", size: "sm", className: "mt-4 self-start" })}
                >
                  {def.derived ? "Consulter" : "Éditer"} →
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-sm text-ink-muted">
        Les données externes de votre marque (liens, documents, notes) se gèrent dans{" "}
        <Link href="/cockpit/marque/sources" className="underline">Sources</Link>.
      </p>
    </div>
  );
}
