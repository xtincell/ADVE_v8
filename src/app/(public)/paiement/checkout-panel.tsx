"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { startCheckoutAction, type CheckoutFormState } from "./actions";

interface ProviderChoice {
  id: string;
  label: string;
  deferred: boolean;
  missing: string[];
}

const PROVIDER_HINTS: Record<string, string> = {
  WAVE: "Paiement instantané depuis l'app Wave",
  ORANGE_MONEY: "Paiement depuis votre compte Orange Money",
  MTN_MOMO: "Confirmation sur votre téléphone MTN",
  CINETPAY: "Mobile money & cartes locales",
  STRIPE: "Visa, Mastercard — paiement sécurisé",
  PAYPAL: "Compte PayPal (zone euro)",
  MANUAL_WHATSAPP: "Transfert + validation humaine sous 24 h ouvrées",
  MOCK: "Réservé au développement — succès immédiat",
};

export function CheckoutPanel({
  offre,
  token,
  marque,
  providers,
}: {
  offre: string;
  token: string;
  marque: string;
  providers: ProviderChoice[];
}) {
  const [selected, setSelected] = useState<string>(providers.find((p) => !p.deferred)?.id ?? "");
  const [state, action, pending] = useActionState<CheckoutFormState, FormData>(startCheckoutAction, {});

  if (state.manual) {
    return (
      <div className="mt-8 rounded-(--radius-md) border border-line bg-surface-raised p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-strong">En attente de validation</p>
        <h2 className="mt-2 font-display text-lg font-semibold">Votre référence : <span className="font-mono">{state.manual.reference}</span></h2>
        <p className="mt-2 text-sm text-ink-muted">{state.manual.instructions}</p>
        <a
          href={state.manual.waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex h-12 items-center justify-center rounded-(--radius-md) bg-accent px-6 font-medium text-accent-ink hover:bg-accent-strong"
        >
          Envoyer ma preuve sur WhatsApp
        </a>
        <p className="mt-3 text-xs text-ink-faint">
          Dès validation par un opérateur, votre accès s&apos;ouvre automatiquement — vous serez notifié.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8">
      <input type="hidden" name="offre" value={offre} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="marque" value={marque} />
      <input type="hidden" name="provider" value={selected} />
      <fieldset>
        <legend className="text-sm font-medium">Choisissez votre moyen de paiement</legend>
        <div className="mt-3 grid gap-2">
          {providers.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-(--radius-md) border p-3.5 transition-colors",
                selected === p.id ? "border-accent bg-accent-soft" : "border-line bg-surface-raised hover:border-line-strong",
                p.deferred && "cursor-not-allowed opacity-70",
              )}
            >
              <input
                type="radio"
                name="provider-radio"
                checked={selected === p.id}
                disabled={p.deferred}
                onChange={() => setSelected(p.id)}
                className="mt-1 accent-(--accent)"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {p.label}
                  {p.deferred && (
                    <span className="rounded-(--radius-xs) bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                      Bientôt disponible
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {p.deferred
                    ? `Non configuré chez l'opérateur (${p.missing.join(", ")})`
                    : PROVIDER_HINTS[p.id] ?? ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.deferred && (
        <p className="mt-3 rounded-(--radius-sm) bg-surface-sunken px-3 py-2 font-mono text-xs text-ink-muted">
          DEFERRED_AWAITING_CREDENTIALS — {state.deferred.missing.join(", ")}
        </p>
      )}
      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="lg" className="mt-5 w-full" disabled={pending || !selected}>
        {pending ? "Initialisation…" : "Payer maintenant"}
      </Button>
    </form>
  );
}
