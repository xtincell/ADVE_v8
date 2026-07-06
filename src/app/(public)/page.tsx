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
import { Reveal } from "@/components/public/reveal";
import { getDefaultOperator } from "@/server/tenancy";
import { priceFor } from "@/server/billing/pricing";
import { PILLARS } from "@/server/brands/pillar-config";

export const dynamic = "force-dynamic";

const ADVE = PILLARS.filter((p) => !p.derived);
const PILLAR_ICON: Record<string, Icon> = { A: Fingerprint, D: Diamond, V: Coins, E: UsersThree };
// Rythme bento : chaque pilier occupe une largeur différente (variance, pas répétition).
const PILLAR_SPAN = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-5", "lg:col-span-7"];

export default async function LandingPage() {
  const operator = await getDefaultOperator();
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
      {/* ── HERO · plein écran, image éditoriale, texte incrusté ───────────── */}
      <section className="relative isolate flex min-h-[92dvh] items-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-studio-1.webp"
          alt="Directrice artistique de l'industrie créative africaine francophone dans son studio"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[72%_center]"
          loading="eager"
          fetchPriority="high"
        />
        {/* voiles : le titre reste lisible à gauche, le bas fond dans la page */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-surface via-surface/75 to-surface/5" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-surface to-transparent" aria-hidden />
        <div className="relative mx-auto w-full max-w-[1400px] px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
              UPgraders présente
            </p>
            <h1 className="mt-6 font-display text-6xl font-semibold leading-[0.9] tracking-tight text-white sm:text-7xl lg:text-8xl">
              De la poussière
              <br />
              <span className="text-accent">à l&apos;étoile.</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-white/75">
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
                className="rounded-full border border-white/25 px-6 py-3 font-medium text-white transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                Découvrir la méthode
              </Link>
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
