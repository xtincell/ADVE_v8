import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  ArrowUpRight,
  Coins,
  Diamond,
  Fingerprint,
  Gauge,
  Scroll,
  SquaresFour,
  Sparkle,
  Stack,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { HeroBackground } from "@/components/public/hero-background";
import { Reveal } from "@/components/public/reveal";
import { getDefaultOperator } from "@/server/tenancy";
import { priceFor } from "@/server/billing/pricing";
import { PILLARS } from "@/server/brands/pillar-config";
import { db } from "@/server/db";
import { TIER_LABELS } from "@/server/scoring/score";

export const dynamic = "force-dynamic";

const ADVE = PILLARS.filter((p) => !p.derived);
const PILLAR_ICON: Record<string, Icon> = { A: Fingerprint, D: Diamond, V: Coins, E: UsersThree };
// Rythme bento : chaque pilier occupe une largeur différente (variance, pas répétition).
const PILLAR_SPAN = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"];

export default async function LandingPage() {
  const operator = await getDefaultOperator();
  const canon = await db.brand.findUnique({
    where: { operatorId_slug: { operatorId: operator.id, slug: "la-fusee" } },
    select: { score: true, tier: true },
  });
  const [pdf, cockpit, oracle] = await Promise.all([
    priceFor(operator.id, "INTAKE_PDF", "SN"),
    priceFor(operator.id, "COCKPIT_MONTHLY", "SN"),
    priceFor(operator.id, "ORACLE_FULL", "SN"),
  ]);

  const stats: { icon: Icon; big: string; small: string }[] = [
    { icon: Stack, big: "8 piliers", small: "ADVE fondateurs, RTIS dérivés, recalculés en cascade." },
    { icon: Gauge, big: "Score /200", small: "100 % déterministe. Même marque, même score." },
    { icon: Scroll, big: "35 sections", small: "L'Oracle, votre stratégie complète, exportable en PDF." },
  ];

  return (
    <>
      {/* ── HERO · portrait éditorial + score flottant ─────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="hero-aurora absolute inset-0" aria-hidden />
        <HeroBackground />
        <div className="hero-vignette absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid min-h-[88dvh] max-w-[1400px] items-center gap-10 px-5 pt-16 pb-20 lg:grid-cols-12 lg:gap-6 lg:px-8">
          <div className="lg:col-span-6 lg:pr-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
              UPgraders présente
            </p>
            <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.9] tracking-tight sm:text-7xl lg:text-8xl">
              De la poussière
              <br />
              <span className="text-accent">à l&apos;étoile.</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-muted">
              Le premier score de marque déterministe pour l&apos;industrie créative d&apos;Afrique
              francophone. Vous mesurez, vous progressez, vous devenez une icône.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/diagnostic"
                className="group inline-flex items-center gap-3 rounded-full bg-accent py-2 pl-6 pr-2 font-medium text-accent-ink transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
              >
                Obtenir mon diagnostic gratuit
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4 w-4" weight="bold" aria-hidden />
                </span>
              </Link>
              <Link
                href="/methode"
                className="rounded-full border border-line-strong px-6 py-3 font-medium text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                Découvrir la méthode
              </Link>
            </div>
          </div>
          <div className="relative lg:col-span-6 lg:justify-self-end">
            <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
              {/* halo chaud : la profondeur vient de la lumière, pas d'un cadre plat */}
              <div
                className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(60%_55%_at_65%_35%,rgba(229,100,88,0.4),transparent_70%)] blur-2xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-[2rem] border border-line/70 shadow-[0_50px_140px_-40px_rgba(229,100,88,0.5)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-creative-2.webp"
                  alt="Portrait d'une directrice artistique de l'industrie créative africaine francophone"
                  width={1200}
                  height={1490}
                  className="aspect-[4/5] w-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                />
                {/* fond du portrait fondu dans la page pour éviter la couture */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/15 to-transparent" aria-hidden />
                <div className="absolute inset-0 bg-gradient-to-r from-surface/45 to-transparent" aria-hidden />
              </div>
              {/* carte de score flottante : la métrique produit, concrète, posée sur l'image */}
              <div className="absolute -bottom-6 -left-3 flex items-center gap-4 rounded-2xl border border-white/15 bg-black/55 px-5 py-4 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7)] backdrop-blur-md sm:-left-6">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">Score de marque</p>
                  <p className="mt-1 font-display text-3xl font-bold tabular-nums text-white">
                    {canon?.score ?? 0}
                    <span className="text-base font-medium text-white/45">/200</span>
                  </p>
                </div>
                <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-accent-ink">
                  {TIER_LABELS[canon?.tier ?? "LATENT"]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS · bande inline, hairlines, zéro carte ────────────────────── */}
      <section className="border-y border-line">
        <div className="mx-auto grid max-w-[1400px] gap-px bg-line px-0 sm:grid-cols-3">
          {stats.map((s) => (
            <Reveal key={s.big} className="bg-surface px-6 py-10 lg:px-8">
              <s.icon className="h-6 w-6 text-accent" weight="light" aria-hidden />
              <p className="mt-5 font-display text-3xl font-semibold tabular-nums">{s.big}</p>
              <p className="mt-2 max-w-xs text-sm text-ink-muted">{s.small}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRODUIT · média pleine largeur, texte décalé ───────────────────── */}
      <section className="section-glow overflow-hidden py-24 lg:py-32">
        <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
          <Reveal className="max-w-xl">
            <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Votre diagnostic, en un coup d&apos;œil.
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              Un score sur 200, vos quatre piliers, les signaux stratégiques. Clairs, datés,
              exportables.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-14 lg:-mr-20">
            <div className="overflow-hidden rounded-[2rem] border border-line bg-surface-raised/40 p-2 shadow-[0_40px_120px_-30px_rgba(229,100,88,0.3)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/diagnostic-showcase.webp"
                alt="Aperçu du diagnostic de marque La Fusée, score sur 200 avec les quatre piliers et l'analyse stratégique"
                width={1600}
                height={905}
                className="w-full rounded-[calc(2rem-0.5rem)]"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── MÉTHODE · bento asymétrique ────────────────────────────────────── */}
      <section className="border-t border-line py-24 lg:py-32">
        <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">La méthode ADVE</p>
            <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Quatre piliers déclarés. Quatre piliers dérivés.
            </h2>
            <p className="mt-4 text-lg text-ink-muted">
              Vous déclarez qui est votre marque. La Fusée en dérive risques, lecture marché,
              actions et stratégie. Chaque amendement recalcule votre score.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-3 lg:grid-cols-12">
            {ADVE.map((p, i) => {
              const Ic = PILLAR_ICON[p.letter] ?? Sparkle;
              const tinted = i % 3 === 0;
              return (
                <Reveal key={p.kind} delay={i * 80} className={PILLAR_SPAN[i]}>
                  <article
                    className={`group h-full rounded-[1.5rem] border p-8 transition-colors duration-300 ${
                      tinted ? "border-accent/25 bg-accent-soft/40" : "border-line bg-surface-raised/40"
                    } hover:border-accent/60`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-5xl font-bold text-accent">{p.letter}</span>
                      <Ic className="h-7 w-7 text-ink-muted transition-colors duration-300 group-hover:text-accent" weight="light" aria-hidden />
                    </div>
                    <h3 className="mt-6 font-display text-xl font-semibold">{p.name}</h3>
                    <p className="mt-2 max-w-sm text-ink-muted">{p.question}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
          <Reveal className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 rounded-[1.5rem] border border-line bg-surface-sunken/40 px-6 py-4 font-mono text-xs text-ink-muted">
            <span className="font-semibold text-ink">Cascade</span>
            {["A", "D", "V", "E", "R", "T", "I", "S"].map((l, i) => (
              <span key={l} className="flex items-center gap-2">
                <span className={i < 4 ? "font-bold text-accent" : "font-bold text-gold-strong"}>{l}</span>
                {i < 7 && <span className="text-ink-faint" aria-hidden>→</span>}
              </span>
            ))}
            <span className="ml-auto hidden lg:block">un amendement en amont périme l&apos;aval, jamais en silence</span>
          </Reveal>
        </div>
      </section>

      {/* ── OFFRE · trois paliers, celui du milieu mis en avant ────────────── */}
      <section className="border-t border-line py-24 lg:py-32">
        <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
          <Reveal>
            <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Un parcours, trois paliers.
            </h2>
          </Reveal>
          <div className="mt-14 grid items-stretch gap-4 lg:grid-cols-3">
            {[
              { icon: Sparkle, tag: "Gratuit", featured: false, title: "Le diagnostic scoré",
                desc: "Dix minutes de questionnaire guidé, votre score sur 200, votre palier et l'état de vos 4 piliers. Sans compte.",
                price: "0 FCFA", suffix: "" },
              { icon: Scroll, tag: "One-shot", featured: true, title: "L'Oracle, 35 sections",
                desc: "Le rapport de stratégie complet : SWOT, plan d'activation, budget, KPIs, frameworks Big-4, exporté en PDF daté.",
                price: oracle?.formatted, suffix: "" },
              { icon: SquaresFour, tag: "Abonnement", featured: false, title: "Le Cockpit",
                desc: "Le pilotage continu : amendements, refresh stratégique, livrables, missions, intelligence communautaire.",
                price: cockpit?.formatted, suffix: " /mois" },
            ].map((e, i) => (
              <Reveal key={e.title} delay={i * 90} className={e.featured ? "lg:-mt-4 lg:mb-4" : ""}>
                <article
                  className={`flex h-full flex-col rounded-[1.75rem] border p-8 transition-transform duration-300 ${
                    e.featured
                      ? "border-accent/60 bg-accent-soft/30 shadow-[0_40px_100px_-30px_rgba(229,100,88,0.4)]"
                      : "border-line bg-surface-raised/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${e.featured ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"}`}>
                      <e.icon className="h-5 w-5" weight="light" aria-hidden />
                    </span>
                    {e.featured && <Badge variant="gold">Recommandé</Badge>}
                  </div>
                  <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-faint">{e.tag}</p>
                  <h3 className="mt-1 font-display text-2xl font-semibold">{e.title}</h3>
                  <p className="mt-3 flex-1 text-ink-muted">{e.desc}</p>
                  <p className="mt-6 font-mono text-2xl font-bold tabular-nums">
                    {e.price ?? "sur demande"}
                    {e.price && e.suffix ? <span className="text-sm font-normal text-ink-muted">{e.suffix}</span> : null}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-faint">
            {pdf ? <>Rapport PDF léger dès {pdf.formatted}. </> : null}Prix affichés pour la zone UEMOA,{" "}
            <Link href="/tarifs" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
              voir la grille complète
            </Link>.
          </p>
        </div>
      </section>

      {/* ── PREUVE · une seule citation, en grand ──────────────────────────── */}
      <section className="border-t border-line py-24 lg:py-32">
        <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
          <Reveal className="mx-auto max-w-4xl">
            <Badge variant="outline" className="mb-8">Univers de démonstration</Badge>
            <blockquote className="font-display text-3xl font-medium leading-tight tracking-tight md:text-4xl">
              « J&apos;ai enfin une réponse à &quot;où en est ma marque ?&quot; qui n&apos;est pas une
              opinion. Le score bouge quand je travaille. »
            </blockquote>
            <div className="mt-8 flex flex-wrap items-baseline gap-x-3">
              <p className="font-medium">Awa Cissé</p>
              <p className="text-sm text-ink-muted">Fondatrice de Nyama Café, Dakar</p>
            </div>
            <p className="mt-8 max-w-2xl border-l-2 border-line pl-4 text-sm text-ink-muted">
              Nyama Café et sa guilde peuplent notre univers de démonstration, le même que celui des
              comptes de test. Les verbatims clients réels prendront leur place ici.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA final · pleine largeur ─────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-t border-line">
        <div className="hero-aurora absolute inset-0 opacity-80" aria-hidden />
        <div className="relative mx-auto flex max-w-[1400px] flex-col items-center gap-8 px-5 py-28 text-center lg:px-8">
          <h2 className="max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-6xl">
            Votre marque a un score. Découvrez-le.
          </h2>
          <Link
            href="/diagnostic"
            className="group inline-flex items-center gap-3 rounded-full bg-accent py-2.5 pl-7 pr-2.5 text-lg font-medium text-accent-ink transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
          >
            Obtenir mon diagnostic gratuit
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight className="h-5 w-5" weight="bold" aria-hidden />
            </span>
          </Link>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-ink-faint">
            Dix minutes, sans compte, sans carte
          </p>
        </div>
      </section>
    </>
  );
}
