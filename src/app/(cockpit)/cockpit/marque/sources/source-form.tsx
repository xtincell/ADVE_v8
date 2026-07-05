"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { addSourceAction, type ActionResult } from "../actions";

export function SourceForm({ brandId }: { brandId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addSourceAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="brandId" value={brandId} />
      <Field>
        <Label htmlFor="src-title">Titre</Label>
        <Input id="src-title" name="title" required maxLength={200} placeholder="Ex. : Compte Instagram officiel" />
      </Field>
      <Field>
        <Label htmlFor="src-kind">Type</Label>
        <Select id="src-kind" name="kind" defaultValue="LINK">
          <option value="LINK">Lien</option>
          <option value="DOCUMENT">Document</option>
          <option value="NOTE">Note</option>
        </Select>
      </Field>
      <Field className="sm:col-span-2">
        <Label htmlFor="src-url">URL (optionnelle)</Label>
        <Input id="src-url" name="url" type="url" placeholder="https://…" />
      </Field>
      <Field className="sm:col-span-2">
        <Label htmlFor="src-content">Contenu / note (optionnel)</Label>
        <Textarea id="src-content" name="content" rows={3} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter la source"}
        </Button>
        {state?.ok && <span className="ml-3 text-xs font-medium text-success">{state.message}</span>}
        <FieldError>{state && !state.ok ? state.error : null}</FieldError>
      </div>
    </form>
  );
}
