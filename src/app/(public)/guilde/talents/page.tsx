import type { Metadata } from "next";
import { db } from "@/server/db";
import { TalentSignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Devenir talent · La Guilde",
  description:
    "Rejoignez le réseau de talents opéré par UPgraders : missions cadrées, budgets annoncés, progression par tiers, commissions dégressives.",
};

export const dynamic = "force-dynamic";

const TIERS = [
  ["Apprenti", "Vos premières missions, accompagnées"],
  ["Compagnon", "Autonome, commissions réduites"],
  ["Maître", "Missions premium, priorité de sélection"],
  ["Associé", "Le cercle : commissions minimales, co-construction"],
];

export default async function TalentsPage() {
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">La Guilde</p>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Devenir talent</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Des missions déjà cadrées (brief structuré, budget annoncé), des candidatures arbitrées par
        un opérateur — pas de premier-arrivé-premier-servi — et une progression par tiers qui fait
        baisser votre commission.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TIERS.map(([t, d], i) => (
          <div key={t} className="rounded-(--radius-sm) border border-line bg-surface-raised p-3">
            <p className="font-mono text-[10px] text-ink-faint">TIER {i + 1}</p>
            <p className="font-display text-sm font-semibold">{t}</p>
            <p className="mt-1 text-xs text-ink-muted">{d}</p>
          </div>
        ))}
      </div>
      <TalentSignupForm countries={countries} />
    </div>
  );
}
