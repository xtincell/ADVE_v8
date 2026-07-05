import type { Metadata } from "next";
import { db } from "@/server/db";
import { AgencySignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Agences partenaires · La Guilde",
  description:
    "Agences comm, média, événementiel : pilotez les marques de vos clients avec la méthode La Fusée et confiez l'exécution au réseau.",
};

export const dynamic = "force-dynamic";

export default async function AgencesPage() {
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">La Guilde</p>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Agences partenaires</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Votre agence pilote plusieurs marques ? L&apos;espace Agency vous donne la vue portefeuille
        (score ADVE moyen, missions, commissions) et l&apos;accès au réseau de talents pour
        l&apos;exécution.
      </p>
      <AgencySignupForm countries={countries} />
    </div>
  );
}
