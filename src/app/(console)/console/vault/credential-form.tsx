"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/form";
import { saveCredentialAction, type CredentialFormState } from "./actions";

export function CredentialForm({
  provider,
  fields,
}: {
  provider: string;
  fields: { key: string; label: string; secret?: boolean }[];
}) {
  const [state, action, pending] = useActionState<CredentialFormState, FormData>(saveCredentialAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="provider" value={provider} />
      {fields.map((f) => (
        <Field key={f.key}>
          <Label htmlFor={`${provider}-${f.key}`} className="text-xs">{f.label}</Label>
          <Input
            id={`${provider}-${f.key}`}
            name={f.key}
            type={f.secret ? "password" : "text"}
            autoComplete="off"
            placeholder={f.secret ? "••••••••" : ""}
            className="h-9 font-mono text-xs"
          />
        </Field>
      ))}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Chiffrement…" : "Enregistrer (chiffré)"}
        </Button>
        {state.ok && <span className="text-xs font-medium text-success">Clés enregistrées.</span>}
      </div>
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
