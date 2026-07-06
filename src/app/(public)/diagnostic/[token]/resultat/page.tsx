import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreDial } from "@/components/public/score-dial";
import { getIntakeSession, type DraftPillars, type IntakeAnswers } from "@/server/intake";
import { deriveRtis } from "@/server/brands/rtis-derive";
import { pillarDef, ADVE_KINDS } from "@/server/brands/pillar-config";
import { scorePillar, PILLAR_MAX, TIER_LABELS, TIER_BOUNDS } from "@/server/scoring/score";
import { getDefaultOperator } from "@/server/tenancy";
import { priceFor } from "@/server/billing/pricing";
import { checkOneShotGate } from "@/server/billing/gates";
import { getSessionUser } from "@/server/auth/guards";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function ResultatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = await getIntakeSession(token);
  if (!session) notFound();
  if (session.status === "DRAFT" || session.status === "SUBMITTED") redirect(`/diagnostic/${token}`);

  const operator = await getDefaultOperator();
  const answers = session.answers as Partial<IntakeAnswers>;
  const draft = (session.draftFields ?? {}) as unknown as DraftPillars;
  const score = session.score ?? 0;
  const tier = session.tier ?? "LATENT";

  // Teaser RTIS (cahier §4.1) : le pilier Risque dérivé en mémoire des seules
  // données déclarées — déterministe, rien n'est persisté ni inventé.
  const risque = deriveRtis(
    "RISQUE",
    draft,
    { sector: answers.sector ?? null, country: answers.country ?? null, signals: [] },
    {},
  );
  const faiblesses = (risque.faiblesses as string[]) ?? [];

  const [pdfPrice, oraclePrice] = await Promise.all([
    priceFor(operator.id, "INTAKE_PDF", answers.country),
    priceFor(operator.id, "ORACLE_FULL", answers.country),
  ]);

  // Droits déjà acquis sur ce diagnostic (achats one-shot, éventuellement avant compte).
  const user = await getSessionUser();
  const [pdfGate, oracleGate] = await Promise.all([
    checkOneShotGate(user, "INTAKE_PDF", { intakeSessionId: session.id }),
    checkOneShotGate(user, "ORACLE_FULL", { intakeSessionId: session.id }),
  ]);

  const activationHref = `/activation?token=${token}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 print:max-w-none">
      {/* En-tête résultat */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">Diagnostic de marque</p>
          <h1 className="mt-2 text-3xl font-semibold md:text-4xl">{answers.brandName}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {answers.sector} · {answers.city ? `${answers.city}, ` : ""}
            {answers.country} ·{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(session.submittedAt ?? session.updatedAt)}
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Score + palier */}
      <div className="mt-8 grid items-center gap-8 md:grid-cols-[auto_1fr]">
        <ScoreDial target={score} tierLabel={TIER_LABELS[tier]} size={200} />
        <div>
          <h2 className="text-xl font-semibold">
            Votre marque est au palier <span className="text-accent">{TIER_LABELS[tier]}</span>
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Le score mesure la complétude structurelle de votre socle de marque sur les 4 piliers
            fondateurs. Il est déterministe : mêmes réponses, même score. Les piliers stratégiques
            dérivés (Risque, Track, Innovation, Stratégie) s&apos;activent dans le Cockpit et
            peuvent porter votre score jusqu&apos;à 200.
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(Object.keys(TIER_BOUNDS) as (keyof typeof TIER_BOUNDS)[]).map((t) => (
              <span
                key={t}
                className={`rounded-(--radius-xs) px-2 py-1 font-mono text-[11px] uppercase tracking-wide ${
                  t === tier ? "bg-accent text-accent-ink" : "bg-surface-sunken text-ink-faint"
                }`}
              >
                {TIER_LABELS[t]} {TIER_BOUNDS[t][0]}–{TIER_BOUNDS[t][1]}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Les 4 piliers — aperçu partiel (2 valeurs max par pilier) */}
      <h2 className="mt-12 text-2xl font-semibold">Vos 4 piliers fondateurs</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ADVE_KINDS.map((kind) => {
          const def = pillarDef(kind);
          const fields = draft[kind] ?? {};
          const pScore = scorePillar(kind, fields);
          const filled = def.fields.filter((f) => {
            const v = fields[f.key]?.value;
            return v && (Array.isArray(v) ? v.length > 0 : v.trim().length > 0);
          });
          const missing = def.fields.filter((f) => !filled.includes(f));
          return (
            <Card key={kind}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold">
                    <span className="text-accent">{def.letter}</span> · {def.name}
                  </h3>
                  <span className="font-mono text-sm font-bold">
                    {pScore}<span className="text-ink-faint">/{PILLAR_MAX}</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(pScore / PILLAR_MAX) * 100}%` }} />
                </div>
                <dl className="mt-4 space-y-3">
                  {filled.slice(0, 2).map((f) => {
                    const v = fields[f.key]!.value;
                    const text = Array.isArray(v) ? v.join(" · ") : v;
                    return (
                      <div key={f.key}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{f.label}</dt>
                        <dd className="mt-0.5 line-clamp-2 text-sm">{text}</dd>
                      </div>
                    );
                  })}
                  {filled.length === 0 && (
                    <p className="text-sm italic text-ink-faint">Aucune donnée déclarée sur ce pilier — c&apos;est votre premier chantier.</p>
                  )}
                </dl>
                {missing.length > 0 && (
                  <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
                    À travailler : {missing.map((f) => f.label).join(", ")}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Teaser pilier dérivé */}
      <h2 className="mt-12 text-2xl font-semibold">Aperçu de l&apos;analyse stratégique</h2>
      <Card className="mt-6 border-gold">
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">
              <span className="text-gold-strong">R</span> · Risque <Badge variant="gold">Pilier dérivé</Badge>
            </h3>
          </div>
          <ul className="mt-4 space-y-2">
            {faiblesses.slice(0, 2).map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <span aria-hidden className="text-gold-strong">▲</span>
                {f}
              </li>
            ))}
            {faiblesses.length === 0 && (
              <li className="text-sm italic text-ink-faint">
                Aucune faiblesse structurelle dérivable de vos réponses — socle solide.
              </li>
            )}
          </ul>
          {faiblesses.length > 2 && (
            <p className="mt-4 rounded-(--radius-sm) bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
              + {faiblesses.length - 2} autres signaux détectés, avec les menaces et les priorités —
              dans le rapport complet et le Cockpit.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Paywall */}
      <section className="mt-12 print:hidden">
        <h2 className="text-2xl font-semibold">Aller plus loin</h2>
        {((!pdfGate.allowed && pdfGate.pending) || (!oracleGate.allowed && oracleGate.pending)) && (
          <div className="mt-4 rounded-(--radius-md) border border-gold bg-gold-soft px-4 py-3 text-sm">
            <strong>Paiement en attente de validation.</strong> Un opérateur confirme la réception
            des fonds en journée — cette page se débloquera automatiquement.
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="flex h-full flex-col pt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">One-shot</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Rapport PDF du diagnostic</h3>
              <p className="mt-2 flex-1 text-sm text-ink-muted">
                Votre diagnostic complet mis en page : score, piliers, analyse des manques,
                premières recommandations. À partager avec vos associés.
              </p>
              {pdfGate.allowed ? (
                <a href={`/api/intake/${token}/pdf`} className={buttonClass({ variant: "gold", className: "mt-4" })}>
                  Télécharger mon rapport PDF
                </a>
              ) : (
                <>
                  <p className="mt-4 font-mono text-2xl font-bold">{pdfPrice?.formatted ?? "—"}</p>
                  <Link href={`/paiement?offre=INTAKE_PDF&token=${token}`} className={buttonClass({ variant: "outline", className: "mt-3" })}>
                    Obtenir le rapport PDF
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
          <Card className="border-accent">
            <CardContent className="flex h-full flex-col pt-5">
              <p className="font-mono text-xs uppercase tracking-widest text-accent">Recommandé</p>
              <h3 className="mt-1 font-display text-xl font-semibold">L&apos;Oracle — stratégie complète</h3>
              <p className="mt-2 flex-1 text-sm text-ink-muted">
                35 sections : SWOT, plan d&apos;activation 90 jours, budget, KPIs, frameworks
                Big-4, profil superfan. Le document qui aligne toute votre équipe.
              </p>
              {oracleGate.allowed ? (
                <Link href={activationHref} className={buttonClass({ variant: "gold", className: "mt-4" })}>
                  Oracle acquis — activer mon Cockpit pour le générer
                </Link>
              ) : (
                <>
                  <p className="mt-4 font-mono text-2xl font-bold">{oraclePrice?.formatted ?? "—"}</p>
                  <Link href={`/paiement?offre=ORACLE_FULL&token=${token}`} className={buttonClass({ className: "mt-3" })}>
                    Commander l&apos;Oracle
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 rounded-(--radius-md) border border-line bg-surface-raised p-6 text-center">
          <h3 className="font-display text-lg font-semibold">Ou continuez gratuitement</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
            Créez votre compte pour retrouver ce diagnostic, compléter vos piliers champ par champ
            et suivre votre score dans le temps.
          </p>
          <Link href={activationHref} className={buttonClass({ variant: "secondary", size: "lg", className: "mt-4" })}>
            Activer mon espace gratuit
          </Link>
        </div>
      </section>
    </div>
  );
}
