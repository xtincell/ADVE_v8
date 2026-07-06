import type { Metadata } from "next";
import { db } from "@/server/db";
import { llmAvailable } from "@/server/llm/gateway";
import { DepositForm } from "./deposit-form";

export const metadata: Metadata = {
  title: "Déposer une mission · La Guilde",
  description:
    "Déposez votre brief : modération sous 24 h ouvrées, candidatures de talents vérifiés, contact jamais exposé publiquement.",
};

export const dynamic = "force-dynamic";

export default async function DeposerPage() {
  const countries = await db.country.findMany({
    where: { active: true },
    orderBy: [{ zone: "asc" }, { name: "asc" }],
    select: { code: true, name: true },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">La Guilde</p>
      <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Déposer une mission</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Votre brief passe en modération avant publication — un opérateur UPgraders vérifie qu&apos;il
        est clair, budgété et sérieux. Vos coordonnées ne sont <strong className="text-ink">jamais</strong>{" "}
        affichées publiquement : les candidatures vous parviennent via l&apos;opérateur.
      </p>
      <DepositForm countries={countries} llmAssist={llmAvailable()} />
    </div>
  );
}
