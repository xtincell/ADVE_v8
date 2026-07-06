"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { addBrandActionAction, sendBrandRequestAction, type OpsFormState } from "./actions";

const PILLAR_OPTIONS: [string, string][] = [
  ["", "— aucun pilier —"],
  ["AUTHENTICITE", "A · Authenticité"],
  ["DISTINCTION", "D · Distinction"],
  ["VALEUR", "V · Valeur"],
  ["ENGAGEMENT", "E · Engagement"],
  ["RISQUE", "R · Risque"],
  ["TRACK", "T · Track record"],
  ["INNOVATION", "I · Innovation"],
  ["STRATEGIE", "S · Stratégie"],
];

export function ActionForm({ brandId }: { brandId: string }) {
  const [state, action, pending] = useActionState<OpsFormState, FormData>(addBrandActionAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-(--radius-md) border border-line bg-surface-sunken/40 p-4 sm:grid-cols-[2fr_1.2fr_1fr_auto]">
      <input type="hidden" name="brandId" value={brandId} />
      <Field>
        <Label htmlFor="a-title" className="text-xs">Action *</Label>
        <Input id="a-title" name="title" required minLength={3} placeholder="ex. : Publier 5 preuves clients" className="h-9" />
      </Field>
      <Field>
        <Label htmlFor="a-pillar" className="text-xs">Pilier visé</Label>
        <Select id="a-pillar" name="pillarKind" defaultValue="" className="h-9">
          {PILLAR_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor="a-due" className="text-xs">Échéance</Label>
        <Input id="a-due" name="dueAt" type="date" className="h-9" />
      </Field>
      <div className="self-end">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Ajouter"}</Button>
      </div>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

export function RequestForm({ brandId }: { brandId: string }) {
  const [state, action, pending] = useActionState<OpsFormState, FormData>(sendBrandRequestAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="brandId" value={brandId} />
      <Field>
        <Label htmlFor="r-subject">Sujet *</Label>
        <Input id="r-subject" name="subject" required minLength={5} maxLength={160} placeholder="ex. : Shooting produit pour la nouvelle gamme" />
      </Field>
      <Field>
        <Label htmlFor="r-message">Message *</Label>
        <Textarea id="r-message" name="message" required minLength={10} rows={3} placeholder="Contexte, attentes, délais souhaités…" />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Envoi…" : "Envoyer à l'opérateur"}
        </Button>
        {state.ok && <span className="text-sm text-success">Demande envoyée — réponse dans ce fil.</span>}
        {state.error && <FieldError>{state.error}</FieldError>}
      </div>
    </form>
  );
}
