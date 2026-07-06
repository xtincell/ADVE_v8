"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/form";
import { confirmMfaAction, type MfaFormState } from "./actions";

export function MfaEnrollForm() {
  const [state, action, pending] = useActionState<MfaFormState, FormData>(confirmMfaAction, {});
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field>
        <Label htmlFor="code">Code à 6 chiffres</Label>
        <Input id="code" name="code" inputMode="numeric" pattern="[0-9]*" maxLength={6} required autoFocus />
      </Field>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Vérification…" : "Activer la double authentification"}
      </Button>
    </form>
  );
}
