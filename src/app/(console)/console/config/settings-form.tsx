"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label } from "@/components/ui/form";
import { updateSettingsAction, type ConfigFormState } from "./actions";

export function SettingsForm({
  rates,
  whatsapp,
  durationDays,
}: {
  rates: Record<string, number>;
  whatsapp: string;
  durationDays: number;
}) {
  const [state, action, pending] = useActionState<ConfigFormState, FormData>(updateSettingsAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field>
        <Label htmlFor="whatsapp">Numéro WhatsApp (paiement manuel)</Label>
        <FieldHint>Format international sans + (ex. 221771234567). Vide = valeur de l&apos;env.</FieldHint>
        <Input id="whatsapp" name="whatsapp" defaultValue={whatsapp} inputMode="numeric" />
      </Field>
      <Field>
        <Label htmlFor="duration">Durée d&apos;activation manuelle (jours)</Label>
        <Input id="duration" name="duration" type="number" min={1} max={366} defaultValue={durationDays} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Commissions Guilde par tier talent (taux dégressifs)</legend>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["APPRENTI", "COMPAGNON", "MAITRE", "ASSOCIE"] as const).map((tier) => (
            <Field key={tier}>
              <Label htmlFor={`rate-${tier}`} className="font-mono text-xs">{tier}</Label>
              <Input
                id={`rate-${tier}`}
                name={`rate:${tier}`}
                type="number"
                step="0.01"
                min={0}
                max={0.9}
                defaultValue={rates[tier] ?? 0.25}
              />
            </Field>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
        {state.ok && <span className="text-xs font-medium text-success">Paramètres mis à jour.</span>}
      </div>
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
