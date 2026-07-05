import Link from "next/link";
import { notFound } from "next/navigation";
import type { PillarKind } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/server/auth/guards";
import { getPillarWithHistory } from "@/server/brands/queries";
import { asPillarFields, pillarDef, type FieldState } from "@/server/brands/pillar-config";
import { PILLAR_MAX } from "@/server/scoring/score";
import { refreshPillarAction } from "../actions";
import { FieldEditor } from "./field-editor";

export const dynamic = "force-dynamic";

const KIND_BY_SLUG: Record<string, PillarKind> = {
  authenticite: "AUTHENTICITE",
  distinction: "DISTINCTION",
  valeur: "VALEUR",
  engagement: "ENGAGEMENT",
  risque: "RISQUE",
  track: "TRACK",
  innovation: "INNOVATION",
  strategie: "STRATEGIE",
};

const MODE_LABELS: Record<string, string> = {
  DIRECT: "Édition directe",
  LLM_REFORMULATE: "Reformulation assistée",
  LLM_STRATEGIC: "Réécriture stratégique",
  RTIS_REFRESH: "Recalcul",
  INTAKE: "Diagnostic",
  SEED: "Initialisation",
};

function displayValue(state: FieldState | undefined): string {
  if (!state) return "";
  return Array.isArray(state.value) ? state.value.join("\n") : state.value;
}

export default async function PillarPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ marque?: string }>;
}) {
  const { kind: slug } = await params;
  const { marque } = await searchParams;
  const kind = KIND_BY_SLUG[slug];
  if (!kind) notFound();
  const user = await requireUser(`/cockpit/marque/${slug}`);
  // `marque` permet au staff (Console) d'éditer n'importe quelle marque du tenant —
  // le contrôle d'accès reste dans getOwnedBrand.
  const data = await getPillarWithHistory(user, kind, marque);
  if (!data) notFound();
  const { brand, pillar, versions } = data;
  const def = pillarDef(kind);
  const fields = asPillarFields(pillar?.fields);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/cockpit/marque" className="font-mono text-xs uppercase tracking-widest text-accent hover:underline">
          ← Ma marque
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">
            <span className={def.derived ? "text-gold-strong" : "text-accent"}>{def.letter}</span> · {def.name}
          </h1>
          <div className="flex items-center gap-2">
            {pillar?.stale && <Badge variant="gold">Périmé</Badge>}
            <span className="font-mono text-lg font-bold">
              {pillar?.score ?? 0}<span className="text-ink-faint">/{PILLAR_MAX}</span>
            </span>
          </div>
        </div>
        <p className="mt-1 text-ink-muted">{def.question}</p>
      </div>

      {def.derived ? (
        <>
          {pillar?.stale && pillar.staleReason && (
            <div className="rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
              <strong>Contenu périmé :</strong> {pillar.staleReason}. Relancez le calcul pour
              retrouver une stratégie à jour (et son score plein).
            </div>
          )}
          <form action={refreshPillarAction}>
            <input type="hidden" name="brandId" value={brand.id} />
            <input type="hidden" name="kind" value={kind} />
            <Button type="submit">
              {pillar?.version ? "Rafraîchir ce pilier" : "Calculer ce pilier"}
            </Button>
          </form>
          {pillar && pillar.version > 0 ? (
            <div className="grid gap-4">
              {def.fields.map((f) => {
                const state = fields[f.key];
                const items = state && Array.isArray(state.value) ? state.value : null;
                const text = state && !Array.isArray(state.value) ? state.value : null;
                return (
                  <Card key={f.key}>
                    <CardHeader>
                      <CardTitle className="text-base">{f.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {items && items.length > 0 ? (
                        <ul className="space-y-1.5">
                          {items.map((item) => (
                            <li key={item} className="flex gap-2 text-sm">
                              <span aria-hidden className="text-gold-strong">▸</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : text ? (
                        <p className="whitespace-pre-line text-sm">{text}</p>
                      ) : (
                        <EmptyState
                          status="INSUFFISANT"
                          title="Rien à dériver pour ce champ"
                          description="Le socle déclaré ne fournit pas encore la matière nécessaire — complétez l'ADVE puis rafraîchissez."
                        />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="Ce pilier n'a jamais été calculé"
              description="Il se dérive de votre socle ADVE — lancez le calcul ci-dessus. Rien n'est inventé : plus votre socle est complet, plus la dérivation est riche."
            />
          )}
        </>
      ) : (
        <div className="grid gap-4">
          {def.fields.map((f) => {
            const state = fields[f.key];
            return (
              <FieldEditor
                key={f.key}
                brandId={brand.id}
                kind={kind}
                fieldKey={f.key}
                label={f.label}
                question={f.question}
                type={f.type}
                placeholder={f.placeholder}
                inferable={f.inferable}
                value={displayValue(state)}
                certainty={state?.certainty ?? null}
              />
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Historique des versions</CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <EmptyState title="Aucune version" description="Chaque amendement crée une version horodatée." />
          ) : (
            <ul className="divide-y divide-line">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{v.version}</Badge>
                    <span className="text-sm">{MODE_LABELS[v.mode] ?? v.mode}</span>
                    {v.note && <span className="text-xs text-ink-faint">— {v.note}</span>}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs text-ink-muted">
                    <span>{v.score}/{PILLAR_MAX}</span>
                    <span>{v.authorEmail ?? "—"}</span>
                    <span>
                      {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(v.createdAt)}
                    </span>
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
