import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Services",
  description: "Du diagnostic gratuit au retainer enterprise : les services UPgraders autour de La Fusée.",
};

const SERVICES = [
  {
    name: "Diagnostic & Oracle",
    desc: "L'état des lieux scoré de votre marque, puis la stratégie complète en 35 sections — SWOT, plan 90 jours, budget, KPIs, profil superfan.",
    for: "Pour démarrer ou repartir sur des bases saines.",
  },
  {
    name: "Cockpit (SaaS)",
    desc: "Le pilotage continu : amendements guidés du socle, recalcul stratégique, livrables de marque, suivi de la communauté et du score.",
    for: "Pour les fondateurs qui pilotent eux-mêmes.",
  },
  {
    name: "Retainers d'accompagnement",
    desc: "Un consultant UPgraders opère avec vous chaque mois : revues de score, arbitrages, production de livrables via La Guilde.",
    for: "Pour avancer vite avec un copilote.",
  },
  {
    name: "Missions créatives (La Guilde)",
    desc: "Identités visuelles, contenu, campagnes, événements — exécutés par des talents sélectionnés, cadrés par des briefs structurés et modérés.",
    for: "Pour exécuter le plan, poste par poste.",
  },
  {
    name: "Intégrations & API",
    desc: "Votre référentiel de marque accessible par API (MCP) pour vos outils internes, facturé à l'usage, clés et relevés inclus.",
    for: "Pour les équipes outillées.",
  },
  {
    name: "Enterprise",
    desc: "Multi-marques, gouvernance dédiée, engagements de service renforcés, formation des équipes.",
    for: "Pour les groupes et institutions. Sur devis.",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Services</p>
      <h1 className="mt-3 max-w-2xl text-3xl font-semibold md:text-5xl">
        Un seul système, plusieurs façons de l&apos;embarquer.
      </h1>
      <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <Card key={s.name}>
            <CardContent className="flex h-full flex-col pt-5">
              <h2 className="font-display text-lg font-semibold">{s.name}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-muted">{s.desc}</p>
              <p className="mt-3 font-mono text-xs uppercase tracking-wide text-accent">{s.for}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/tarifs" className={buttonClass({})}>
          Voir les tarifs
        </Link>
        <Link href="/contact" className={buttonClass({ variant: "outline" })}>
          Demander un devis
        </Link>
      </div>
    </div>
  );
}
