import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreDial } from "@/components/public/score-dial";
import { getDefaultOperator } from "@/server/tenancy";
import { priceFor } from "@/server/billing/pricing";
import { PILLARS } from "@/server/brands/pillar-config";
import { db } from "@/server/db";
import { TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

const ADVE = PILLARS.filter((p) => !p.derived);

export default async function LandingPage() {
  const operator = await getDefaultOperator();
  // Score réel de la marque canon (données seedées, jamais inventées).
  const canon = await db.brand.findUnique({
    where: { operatorId_slug: { operatorId: operator.id, slug: "la-fusee" } },
    select: { score: true, tier: true },
  });
  const [pdf, cockpit, oracle] = await Promise.all([
    priceFor(operator.id, "INTAKE_PDF", "SN"),
    priceFor(operator.id, "COCKPIT_MONTHLY", "SN"),
    priceFor(operator.id, "ORACLE_FULL", "SN"),
  ]);

  return (
    <>
      {/* ── Hero */}
      <section className="texture-geo border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              UPgraders présente La Fusée
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
              De la poussière
              <br />
              à l&apos;étoile.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-muted">
              La Fusée transforme les marques créatives d&apos;Afrique francophone en icônes
              culturelles : un score de marque mesurable, une méthode complète, un réseau de
              talents pour exécuter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/diagnostic" className={buttonClass({ size: "lg" })}>
                Obtenir mon diagnostic gratuit
              </Link>
              <Link href="/methode" className={buttonClass({ variant: "outline", size: "lg" })}>
                Découvrir la méthode
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              Sans compte, sans carte bancaire — 10 minutes, sur votre téléphone.
            </p>
          </div>
          <div className="flex justify-center">
            <ScoreDial target={canon?.score ?? 0} tierLabel={TIER_LABELS[canon?.tier ?? "LATENT"]} />
          </div>
        </div>
      </section>

      {/* ── Chiffres de la méthode */}
      <section className="border-b border-line bg-surface-raised">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3">
          {[
            ["8 piliers", "ADVE fondateurs + RTIS dérivés, recalculés en cascade"],
            ["Score /200", "100 % déterministe — même marque, même score, toujours"],
            ["35 sections", "L'Oracle : votre stratégie complète, exportable en PDF"],
          ].map(([big, small]) => (
            <div key={big} className="text-center sm:text-left">
              <p className="font-display text-3xl font-semibold text-accent">{big}</p>
              <p className="mt-1 text-sm text-ink-muted">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Méthode ADVE */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">La méthode</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
            Quatre piliers fondateurs. Quatre piliers dérivés. Zéro blabla.
          </h2>
          <p className="mt-4 text-ink-muted">
            Vous déclarez qui est votre marque (ADVE) ; La Fusée en dérive risques, lecture
            marché, actions et stratégie (RTIS). Chaque amendement recalcule votre score — la
            progression se voit.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ADVE.map((p) => (
            <Card key={p.kind} className="relative overflow-hidden">
              <CardContent className="pt-5">
                <span className="font-display text-4xl font-bold text-accent">{p.letter}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{p.name}</h3>
                <p className="mt-1 text-sm text-ink-muted">{p.question}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-(--radius-md) border border-line bg-surface-sunken/50 px-4 py-3 font-mono text-xs text-ink-muted">
          <span className="font-semibold text-ink">Cascade :</span>
          {["A", "D", "V", "E", "R", "T", "I", "S"].map((l, i) => (
            <span key={l} className="flex items-center gap-2">
              <span className={i < 4 ? "font-bold text-accent" : "font-bold text-gold-strong"}>{l}</span>
              {i < 7 && <span aria-hidden>→</span>}
            </span>
          ))}
          <span className="ml-auto hidden sm:block">un amendement en amont périme l&apos;aval — visible, jamais silencieux</span>
        </div>
      </section>

      {/* ── Ce que vous obtenez */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold md:text-4xl">Un parcours, trois étages.</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Étage 1 · Gratuit</p>
                <h3 className="mt-2 font-display text-xl font-semibold">Le diagnostic scoré</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  10 minutes de questionnaire guidé → votre score /200, votre palier de marque et
                  l&apos;état de vos 4 piliers. Sans compte.
                </p>
                <p className="mt-4 font-mono text-lg font-bold">0 FCFA</p>
              </CardContent>
            </Card>
            <Card className="border-accent">
              <CardContent className="pt-5">
                <p className="font-mono text-xs uppercase tracking-widest text-accent">Étage 2 · One-shot</p>
                <h3 className="mt-2 font-display text-xl font-semibold">L&apos;Oracle — 35 sections</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Le rapport de stratégie complet : SWOT, plan d&apos;activation, budget, KPIs,
                  frameworks Big-4 — exporté en PDF, daté et signé.
                </p>
                <p className="mt-4 font-mono text-lg font-bold">{oracle?.formatted ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">Étage 3 · Abonnement</p>
                <h3 className="mt-2 font-display text-xl font-semibold">Le Cockpit</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Le pilotage continu : amendements, refresh stratégique, livrables, missions,
                  intelligence communautaire.
                </p>
                <p className="mt-4 font-mono text-lg font-bold">
                  {cockpit?.formatted ?? "—"}<span className="text-sm font-normal text-ink-muted"> /mois</span>
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="mt-6 text-sm text-ink-faint">
            Rapport PDF léger dès {pdf?.formatted ?? "—"} · prix affichés pour la zone UEMOA —{" "}
            <Link href="/tarifs" className="underline hover:text-ink">
              voir la grille complète
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── Témoignages — univers de démonstration, étiqueté comme tel (honest-empty) */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold">À quoi ça ressemble, piloté.</h2>
          <Badge variant="outline">Univers de démonstration</Badge>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Nyama Café et sa guilde sont les personnages de notre monde de démonstration — le même
          que celui des comptes de test. Les verbatims clients réels prendront leur place ici.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-5">
              <p className="text-ink">
                « J&apos;ai enfin une réponse à &quot;où en est ma marque ?&quot; qui n&apos;est pas
                une opinion. Le score bouge quand je travaille — c&apos;est simple et ça rend
                accro. »
              </p>
              <p className="mt-4 text-sm font-medium">Awa Cissé</p>
              <p className="text-xs text-ink-muted">Fondatrice, Nyama Café (démo) — Dakar</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-ink">
                « Côté talent, La Guilde m&apos;apporte des missions déjà cadrées : brief structuré,
                budget annoncé, modération sérieuse. On travaille, on ne négocie pas dans le
                vide. »
              </p>
              <p className="mt-4 text-sm font-medium">Moussa Diop</p>
              <p className="text-xs text-ink-muted">Directeur artistique, membre de La Guilde (démo)</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── CTA final */}
      <section className="border-t border-line bg-surface-inverse text-ink-inverse">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center">
          <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl">
            Votre marque a un score. Découvrez-le maintenant.
          </h2>
          <Link href="/diagnostic" className={buttonClass({ size: "xl" })}>
            Lancer mon diagnostic gratuit
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest opacity-60">
            10 minutes · sans compte · sans carte
          </p>
        </div>
      </section>
    </>
  );
}
