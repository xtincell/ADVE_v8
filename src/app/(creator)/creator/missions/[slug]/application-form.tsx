"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Textarea } from "@/components/ui/form";
import { applyToMissionAction, type ApplyFormState } from "./actions";

export function ApplicationForm({ missionId, currency }: { missionId: string; currency: string }) {
  const [state, action, pending] = useActionState<ApplyFormState, FormData>(applyToMissionAction, {});
  const [lines, setLines] = useState([0, 1]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="missionId" value={missionId} />
      <Field>
        <Label htmlFor="message">Votre approche *</Label>
        <FieldHint>Comment vous aborderiez la mission — c&apos;est ce que l&apos;opérateur lit en premier.</FieldHint>
        <Textarea id="message" name="message" required minLength={20} rows={4} />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Devis structuré * ({currency})</legend>
        <div className="mt-2 space-y-2">
          {lines.map((i) => (
            <div key={i} className="grid grid-cols-[1fr_140px] gap-2">
              <Input name={`ligne-label-${i}`} placeholder={`Poste ${i + 1} (ex. : Recherche & moodboards)`} aria-label={`Libellé poste ${i + 1}`} />
              <Input name={`ligne-amount-${i}`} inputMode="numeric" pattern="[0-9]*" placeholder="Montant" aria-label={`Montant poste ${i + 1}`} />
            </div>
          ))}
        </div>
        {lines.length < 8 && (
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setLines((l) => [...l, l.length])}>
            + Ajouter un poste
          </Button>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="delaiJours">Délai de livraison (jours) *</Label>
          <Input id="delaiJours" name="delaiJours" type="number" min={1} max={365} required />
        </Field>
        <Field>
          <Label htmlFor="conditions">Conditions</Label>
          <Input id="conditions" name="conditions" placeholder="Ex. : 50 % à la commande" />
        </Field>
      </div>

      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Envoi…" : "Envoyer ma candidature"}
      </Button>
      <p className="text-xs text-ink-faint">
        Votre devis n&apos;est visible que de l&apos;opérateur — jamais des autres talents.
      </p>
    </form>
  );
}
