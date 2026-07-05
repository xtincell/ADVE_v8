import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultOperator } from "@/server/tenancy";
import { priceGridForZone } from "@/server/billing/pricing";
import { ZoneTabs } from "./zone-tabs";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Prix localisés par zone économique (UEMOA, CEMAC, diaspora) — FCFA d'abord, mobile money accepté. Diagnostic gratuit.",
};

export const dynamic = "force-dynamic";

const ZONES = [
  { id: "UEMOA", label: "UEMOA (FCFA)", hint: "Sénégal, Côte d'Ivoire, Bénin…" },
  { id: "CEMAC", label: "CEMAC (FCFA)", hint: "Cameroun, Gabon, Congo…" },
  { id: "DIASPORA", label: "Diaspora (€)", hint: "Europe & Amérique du Nord" },
] as const;

export default async function TarifsPage({ searchParams }: { searchParams: Promise<{ zone?: string }> }) {
  const { zone: zoneParam } = await searchParams;
  const zone = ZONES.some((z) => z.id === zoneParam) ? zoneParam! : "UEMOA";
  const operator = await getDefaultOperator();
  const grid = await priceGridForZone(operator.id, zone);
  const by = (tier: string) => grid.find((g) => g.tier === tier);

  const oneShots = [
    {
      price: by("INTAKE_FREE"),
      name: "Diagnostic",
      desc: "Questionnaire guidé 10 min, score /200, palier, aperçu des piliers.",
      cta: { href: "/diagnostic", label: "Commencer" },
      free: true,
    },
    {
      price: by("INTAKE_PDF"),
      name: "Rapport PDF",
      desc: "Votre diagnostic mis en page : analyse des manques, premières recommandations.",
      cta: { href: "/diagnostic", label: "Faire le diagnostic d'abord" },
    },
    {
      price: by("ORACLE_FULL"),
      name: "L'Oracle — 35 sections",
      desc: "La stratégie complète : SWOT, plan 90 jours, budget, KPIs, frameworks Big-4, profil superfan.",
      cta: { href: "/diagnostic", label: "Faire le diagnostic d'abord" },
      featured: true,
    },
  ];

  const recurrents = [
    {
      price: by("COCKPIT_MONTHLY"),
      name: "Cockpit",
      desc: "Le pilotage continu de votre marque : amendements, refresh stratégique, livrables, intelligence communautaire.",
      period: "/mois",
      featured: true,
    },
    {
      price: by("RETAINER_BASE"),
      name: "Retainer Base",
      desc: "Cockpit + un consultant UPgraders qui opère avec vous chaque mois.",
      period: "/mois",
    },
    {
      price: by("RETAINER_PRO"),
      name: "Retainer Pro",
      desc: "L'accompagnement renforcé : production de livrables incluse via La Guilde.",
      period: "/mois",
    },
    {
      price: by("RETAINER_ENTERPRISE"),
      name: "Enterprise",
      desc: "Multi-marques, équipe dédiée, engagements de service sur mesure.",
      period: "",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Tarifs</p>
      <h1 className="mt-3 max-w-2xl text-3xl font-semibold md:text-5xl">
        Des prix pensés pour votre zone, pas pour la Silicon Valley.
      </h1>
      <p className="mt-4 max-w-2xl text-ink-muted">
        La grille est localisée par zone économique — FCFA d&apos;abord, parité fixe 655,957 FCFA/€.
        Paiement mobile money (Wave, Orange Money, MTN MoMo), carte bancaire ou validation
        WhatsApp.
      </p>

      <ZoneTabs zones={ZONES.map((z) => ({ id: z.id, label: z.label, hint: z.hint }))} current={zone} />

      <h2 className="mt-10 text-xl font-semibold">One-shots</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {oneShots.map((o) => (
          <Card key={o.name} className={o.featured ? "border-accent" : undefined}>
            <CardContent className="flex h-full flex-col pt-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{o.name}</h3>
                {o.featured && <Badge variant="accent">Recommandé</Badge>}
                {o.free && <Badge variant="success">Gratuit</Badge>}
              </div>
              <p className="mt-2 flex-1 text-sm text-ink-muted">{o.desc}</p>
              <p className="mt-4 font-mono text-2xl font-bold">{o.price?.formatted ?? "—"}</p>
              <Link href={o.cta.href} className={buttonClass({ variant: o.featured ? "primary" : "outline", className: "mt-3" })}>
                {o.cta.label}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-semibold">Abonnements</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {recurrents.map((r) => (
          <Card key={r.name} className={r.featured ? "border-accent" : undefined}>
            <CardContent className="flex h-full flex-col pt-5">
              <h3 className="font-display text-lg font-semibold">{r.name}</h3>
              <p className="mt-2 flex-1 text-sm text-ink-muted">{r.desc}</p>
              <p className="mt-4 font-mono text-xl font-bold">
                {r.price?.formatted ?? "—"}
                {r.period && !r.price?.onQuote && (
                  <span className="text-sm font-normal text-ink-muted">{r.period}</span>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-(--radius-lg) border border-line bg-surface-raised p-6">
        <h2 className="font-display text-lg font-semibold">Questions fréquentes</h2>
        <dl className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold">Comment payer sans carte bancaire ?</dt>
            <dd className="mt-1 text-sm text-ink-muted">
              Mobile money (Wave, Orange Money, MTN MoMo) selon votre pays, ou paiement manuel
              validé par WhatsApp : vous réglez, un opérateur confirme, votre accès s&apos;ouvre
              pour 30 jours.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold">Le diagnostic est-il vraiment gratuit ?</dt>
            <dd className="mt-1 text-sm text-ink-muted">
              Oui — sans compte et sans carte. C&apos;est l&apos;entrée de la méthode : vous gardez
              votre score et votre lien de résultat.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold">Puis-je arrêter le Cockpit quand je veux ?</dt>
            <dd className="mt-1 text-sm text-ink-muted">
              Oui, l&apos;abonnement est mensuel sans engagement. Vos données restent exportables.
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold">Ma zone n&apos;est pas listée ?</dt>
            <dd className="mt-1 text-sm text-ink-muted">
              La grille UEMOA s&apos;applique par défaut, par proximité économique.{" "}
              <Link href="/contact" className="underline">Contactez-nous</Link> pour un devis adapté.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
