import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { startDiagnostic } from "./actions";

export const metadata: Metadata = {
  title: "Diagnostic de marque gratuit",
  description:
    "Obtenez le score /200 de votre marque en 10 minutes : questionnaire guidé, sans compte, sans carte bancaire.",
};

const STEPS = [
  ["Votre marque", "Nom, secteur, pays — 1 minute"],
  ["Authenticité", "Votre histoire et vos valeurs"],
  ["Valeur", "Votre offre et votre modèle"],
  ["Distinction", "Votre position et votre promesse"],
  ["Engagement", "Vos canaux et votre communauté"],
  ["Résultat", "Votre score /200 et votre palier"],
];

export default function DiagnosticStartPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Diagnostic gratuit</p>
      <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
        10 minutes pour savoir où en est votre marque.
      </h1>
      <p className="mt-4 text-ink-muted">
        Répondez avec ce que vous savez — les trous comptent aussi : ils révèlent exactement où
        votre marque doit travailler. Aucune réponse n&apos;est inventée à votre place.
      </p>
      <ol className="mt-8 space-y-2">
        {STEPS.map(([title, sub], i) => (
          <li key={title} className="flex items-center gap-3 rounded-(--radius-sm) border border-line bg-surface-raised px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-xs font-bold text-accent-strong">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-ink-muted">{sub}</p>
            </div>
          </li>
        ))}
      </ol>
      <form action={startDiagnostic} className="mt-8">
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Commencer mon diagnostic
        </Button>
      </form>
      <p className="mt-3 text-xs text-ink-faint">
        Un lien privé est créé pour votre session — vous pourrez y revenir à tout moment.
      </p>
    </div>
  );
}
