import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getIntakeSession, type IntakeAnswers } from "@/server/intake";
import { TIER_LABELS } from "@/server/scoring/score";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Activer mon espace" };

export default async function ActivationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; offre?: string }>;
}) {
  const { token, offre } = await searchParams;
  if (!token) notFound();
  const session = await getIntakeSession(token);
  if (!session || (session.status !== "SCORED" && session.status !== "ACTIVATED")) notFound();
  const answers = session.answers as Partial<IntakeAnswers>;

  return (
    <div className="mx-auto max-w-sm px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Activation</p>
      <h1 className="mt-2 text-3xl font-semibold">Votre marque vous attend.</h1>
      <div className="mt-4 rounded-(--radius-md) border border-line bg-surface-raised p-4">
        <p className="font-display text-lg font-semibold">{answers.brandName}</p>
        <p className="mt-0.5 font-mono text-sm text-ink-muted">
          Score {session.score ?? 0}/200 · palier {TIER_LABELS[session.tier ?? "LATENT"]}
        </p>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        Créez votre compte pour transférer ce diagnostic dans votre Cockpit : vos réponses
        deviennent le socle de votre marque, amendable champ par champ.
      </p>
      {offre && (
        <p className="mt-2 rounded-(--radius-sm) bg-gold-soft px-3 py-2 text-xs text-gold-strong">
          Votre sélection ({offre === "ORACLE_FULL" ? "Oracle — rapport complet" : "Rapport PDF"}) sera
          disponible dans votre Cockpit, rubrique Livrables.
        </p>
      )}
      <RegisterForm token={token} email={answers.email ?? ""} />
      <p className="mt-6 text-sm text-ink-muted">
        Déjà un compte ?{" "}
        <Link href={`/connexion?next=${encodeURIComponent(`/activation?token=${token}`)}`} className="font-medium text-accent hover:underline">
          Connectez-vous
        </Link>{" "}
        pour rattacher ce diagnostic.
      </p>
    </div>
  );
}
