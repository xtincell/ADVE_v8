import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PILLARS } from "@/server/brands/pillar-config";
import { TIER_BOUNDS, TIER_LABELS } from "@/server/scoring/score";

export const metadata: Metadata = {
  title: "La méthode ADVE",
  description:
    "ADVE : quatre piliers fondateurs déclarés par l'humain, quatre piliers stratégiques dérivés par la machine. Un score /200 déterministe qui mesure la progression.",
};

export default function MethodePage() {
  const adve = PILLARS.filter((p) => !p.derived);
  const rtis = PILLARS.filter((p) => p.derived);
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">La méthode</p>
      <h1 className="mt-3 max-w-3xl text-3xl font-semibold md:text-5xl">
        Une marque devient une icône quand elle accumule des superfans.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-muted">
        Pas des abonnés : des <strong className="text-ink">superfans</strong> — celles et ceux qui
        recrutent pour vous. La méthode ADVE industrialise cette accumulation en travaillant la
        marque comme un système : un socle déclaré, une stratégie dérivée, une mesure continue.
      </p>

      <div className="mt-10 overflow-hidden rounded-(--radius-md) border border-line shadow-sm">
        <img
          src="/images/methode-collab.webp"
          alt="Équipe créative africaine collaborant autour de planches de marque et d'un nuancier"
          width={1100}
          height={738}
          className="h-56 w-full object-cover md:h-80"
          loading="lazy"
        />
      </div>

      <h2 className="mt-14 text-2xl font-semibold">1 · Le socle ADVE — ce que vous déclarez</h2>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Quatre piliers fondateurs, remplis par vous (ou avec votre consultant). L&apos;écriture est
        toujours une action humaine : l&apos;IA peut proposer, jamais décider.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {adve.map((p) => (
          <Card key={p.kind}>
            <CardContent className="pt-5">
              <span className="font-display text-3xl font-bold text-accent">{p.letter}</span>
              <h3 className="mt-1 font-display font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{p.question}</p>
              <ul className="mt-3 space-y-1 text-xs text-ink-faint">
                {p.fields.slice(0, 4).map((f) => (
                  <li key={f.key}>· {f.label}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-semibold">2 · La stratégie RTIS — ce que la machine dérive</h2>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Quatre piliers calculés depuis votre socle, en cascade A→D→V→E→R→T→I→S. Ils ne
        s&apos;éditent pas : ils se <strong className="text-ink">recalculent</strong>, et chaque
        amendement du socle les marque « périmés » jusqu&apos;au prochain refresh.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rtis.map((p) => (
          <Card key={p.kind} className="border-gold/60">
            <CardContent className="pt-5">
              <span className="font-display text-3xl font-bold text-gold-strong">{p.letter}</span>
              <h3 className="mt-1 font-display font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">{p.question.replace(" (dérivé de l'ADVE)", "").replace(" (dérivé de l'ADVE + signaux externes)", "").replace(" (dérivé)", "")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-semibold">3 · La mesure — un score qui ne ment pas</h2>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Chaque pilier est scoré sur 25 points selon la complétude structurelle de son contenu ;
        le composite sur 200 vous situe sur l&apos;échelle des paliers. Le calcul est
        déterministe — aucune IA, aucun aléa — et chaque évolution est historisée.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {(Object.keys(TIER_BOUNDS) as (keyof typeof TIER_BOUNDS)[]).map((t) => (
          <div key={t} className="flex-1 rounded-(--radius-sm) border border-line bg-surface-raised px-3 py-2 text-center min-w-28">
            <p className="font-mono text-xs font-bold uppercase">{TIER_LABELS[t]}</p>
            <p className="font-mono text-[11px] text-ink-faint">
              {TIER_BOUNDS[t][0]}–{TIER_BOUNDS[t][1]}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 text-2xl font-semibold">4 · L&apos;exécution — l&apos;Oracle et La Guilde</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-display text-lg font-semibold">L&apos;Oracle</h3>
            <p className="mt-2 text-sm text-ink-muted">
              35 sections générées depuis vos piliers : executive summary, SWOT interne/externe,
              plan d&apos;activation, budget, KPIs, frameworks de référence (7S, BCG, NPS…),
              signature culturelle (Cult Index, Devotion Ladder, fenêtre d&apos;Overton). Le
              rapport ne dit que ce que votre marque a déclaré — chaque affirmation remonte à un
              pilier.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h3 className="font-display text-lg font-semibold">La Guilde</h3>
            <p className="mt-2 text-sm text-ink-muted">
              La stratégie sans exécution est un PDF de plus. La Guilde relie votre plan aux
              talents capables de le réaliser : missions cadrées, candidatures modérées, devis
              structurés, suivi par UPgraders.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-14 rounded-(--radius-lg) border border-line bg-surface-raised p-8 text-center">
        <h2 className="text-2xl font-semibold">La méthode commence par une mesure.</h2>
        <Link href="/diagnostic" className={buttonClass({ size: "lg", className: "mt-4" })}>
          Obtenir mon score /200
        </Link>
      </div>
    </div>
  );
}
