import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Fingerprint,
  Gauge,
  Gem,
  Layers,
  LayoutDashboard,
  Rocket,
  ScrollText,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreDial } from "@/components/public/score-dial";
import { HeroBackground } from "@/components/public/hero-background";
import { Reveal } from "@/components/public/reveal";
import { getDefaultOperator } from "@/server/tenancy";
import { priceFor } from "@/server/billing/pricing";
import { PILLARS } from "@/server/brands/pillar-config";
import { db } from "@/server/db";
import { TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

const ADVE = PILLARS.filter((p) => !p.derived);
const PILLAR_ICON: Record<string, LucideIcon> = { A: Fingerprint, D: Gem, V: Coins, E: Users };

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

  const stats: { icon: LucideIcon; big: string; small: string }[] = [
    { icon: Layers, big: "8 piliers", small: "ADVE fondateurs + RTIS dérivés, recalculés en cascade" },
    { icon: Gauge, big: "Score /200", small: "100 % déterministe — même marque, même score, toujours" },
    { icon: ScrollText, big: "35 sections", small: "L'Oracle : votre stratégie complète, exportable en PDF" },
  ];

  return (
    <>
      {/* ── Hero cosmique (WebGL) ─────────────────────────────────────────── */}
      <section
        data-theme="dark"
        className="relative isolate overflow-hidden bg-surface text-ink"
      >
        <div className="hero-aurora absolute inset-0" aria-hidden />
        <HeroBackground />
        <div className="hero-vignette absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-24 md:grid-cols-[1.15fr_1fr] md:py-36">
          <div>
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
              <Rocket className="h-3.5 w-3.5" aria-hidden /> UPgraders présente La Fusée
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.03] md:text-7xl">
              De la poussière
              <br />
              <span className="text-accent">à l&apos;étoile.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-muted">
              La Fusée transforme les marques créatives d&apos;Afrique francophone en icônes
              culturelles : un score de marque mesurable, une méthode complète, un réseau de
              talents pour exécuter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/diagnostic" className={buttonClass({ size: "lg" })}>
                Obtenir mon diagnostic gratuit
              </Link>
              <Link
                href="/methode"
                className="inline-flex items-center gap-2 rounded-(--radius-md) border border-line-strong px-6 py-3 font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              >
                Découvrir la méthode <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              Sans compte, sans carte bancaire — 10 minutes, sur votre téléphone.
            </p>
          </div>
          <div className="flex justify-center">
            <div className="rounded-(--radius-xl) border border-line bg-surface-raised/40 p-8 shadow-2xl backdrop-blur-md">
              <ScoreDial target={canon?.score ?? 0} tierLabel={TIER_LABELS[canon?.tier ?? "LATENT"]} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Chiffres de la méthode */}
      <section className="border-b border-line bg-surface-raised">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal key={s.big} delay={i * 90} className="flex items-start gap-3 text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-md) bg-accent-soft text-accent">
                <s.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-3xl font-semibold text-accent">{s.big}</p>
                <p className="mt-1 text-sm text-ink-muted">{s.small}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Aperçu produit */}
      <section className="section-glow border-b border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-accent">Le produit</p>
            <h2 className="mt-3 text-2xl font-semibold md:text-3xl">
              Votre diagnostic, en un coup d&apos;œil.
            </h2>
            <p className="mt-3 text-ink-muted">
              Un score /200, vos quatre piliers et les signaux stratégiques — clairs, datés,
              exportables. Voici ce que vous obtenez en 10 minutes.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-10 overflow-hidden rounded-(--radius-lg) border border-line shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/diagnostic-showcase.webp"
              alt="Aperçu du diagnostic de marque La Fusée : score sur 200, les quatre piliers et l'analyse stratégique"
              width={1600}
              height={905}
              className="w-full"
              loading="lazy"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Méthode ADVE */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">La méthode</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">
            Quatre piliers fondateurs. Quatre piliers dérivés. Zéro blabla.
          </h2>
          <p className="mt-4 text-ink-muted">
            Vous déclarez qui est votre marque (ADVE) ; La Fusée en dérive risques, lecture
            marché, actions et stratégie (RTIS). Chaque amendement recalcule votre score — la
            progression se voit.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ADVE.map((p, i) => {
            const Icon = PILLAR_ICON[p.letter] ?? Sparkles;
            return (
              <Reveal key={p.kind} delay={i * 80}>
                <Card className="group relative h-full overflow-hidden transition-colors hover:border-accent">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-4xl font-bold text-accent">{p.letter}</span>
                      <Icon className="h-5 w-5 text-ink-faint transition-colors group-hover:text-accent" aria-hidden />
                    </div>
                    <h3 className="mt-2 font-display text-lg font-semibold">{p.name}</h3>
                    <p className="mt-1 text-sm text-ink-muted">{p.question}</p>
                  </CardContent>
                </Card>
              </Reveal>
            );
          })}
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
          <Reveal>
            <h2 className="text-3xl font-semibold md:text-4xl">Un parcours, trois étages.</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Sparkles, tag: "Étage 1 · Gratuit", accent: false, title: "Le diagnostic scoré",
                desc: "10 minutes de questionnaire guidé → votre score /200, votre palier de marque et l'état de vos 4 piliers. Sans compte.",
                price: <>0 FCFA</>,
              },
              {
                icon: ScrollText, tag: "Étage 2 · One-shot", accent: true, title: "L'Oracle — 35 sections",
                desc: "Le rapport de stratégie complet : SWOT, plan d'activation, budget, KPIs, frameworks Big-4 — exporté en PDF, daté et signé.",
                price: <>{oracle?.formatted ?? "—"}</>,
              },
              {
                icon: LayoutDashboard, tag: "Étage 3 · Abonnement", accent: false, title: "Le Cockpit",
                desc: "Le pilotage continu : amendements, refresh stratégique, livrables, missions, intelligence communautaire.",
                price: <>{cockpit?.formatted ?? "—"}<span className="text-sm font-normal text-ink-muted"> /mois</span></>,
              },
            ].map((e, i) => (
              <Reveal key={e.title} delay={i * 90} className="h-full">
                <Card className={`h-full ${e.accent ? "border-accent shadow-lg" : ""}`}>
                  <CardContent className="flex h-full flex-col pt-5">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-(--radius-md) ${e.accent ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}>
                      <e.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className={`mt-4 font-mono text-xs uppercase tracking-widest ${e.accent ? "text-accent" : "text-ink-faint"}`}>{e.tag}</p>
                    <h3 className="mt-1 font-display text-xl font-semibold">{e.title}</h3>
                    <p className="mt-2 text-sm text-ink-muted">{e.desc}</p>
                    <p className="mt-4 font-mono text-lg font-bold">{e.price}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
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
        <Reveal className="flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold">À quoi ça ressemble, piloté.</h2>
          <Badge variant="outline">Univers de démonstration</Badge>
        </Reveal>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Nyama Café et sa guilde sont les personnages de notre monde de démonstration — le même
          que celui des comptes de test. Les verbatims clients réels prendront leur place ici.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            { quote: "J'ai enfin une réponse à \"où en est ma marque ?\" qui n'est pas une opinion. Le score bouge quand je travaille — c'est simple et ça rend accro.", name: "Awa Cissé", role: "Fondatrice, Nyama Café (démo) — Dakar" },
            { quote: "Côté talent, La Guilde m'apporte des missions déjà cadrées : brief structuré, budget annoncé, modération sérieuse. On travaille, on ne négocie pas dans le vide.", name: "Moussa Diop", role: "Directeur artistique, membre de La Guilde (démo)" },
          ].map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <Card className="h-full">
                <CardContent className="pt-5">
                  <p className="text-ink">« {t.quote} »</p>
                  <p className="mt-4 text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-ink-muted">{t.role}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA final */}
      <section data-theme="dark" className="relative isolate overflow-hidden border-t border-line bg-surface text-ink">
        <div className="hero-aurora absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface-raised/40 text-accent backdrop-blur">
            <Rocket className="h-6 w-6" aria-hidden />
          </span>
          <h2 className="max-w-2xl text-3xl font-semibold md:text-4xl">
            Votre marque a un score. Découvrez-le maintenant.
          </h2>
          <Link href="/diagnostic" className={buttonClass({ size: "xl" })}>
            Lancer mon diagnostic gratuit
          </Link>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-faint">
            10 minutes · sans compte · sans carte
          </p>
        </div>
      </section>
    </>
  );
}
