"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label } from "@/components/ui/form";
import { registerAction, type AuthFormState } from "../actions";

export function RegisterForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field>
        <Label htmlFor="name">Votre nom</Label>
        <Input id="name" name="name" autoComplete="name" required minLength={2} />
      </Field>
      <Field>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email} required />
      </Field>
      <Field>
        <Label htmlFor="password">Mot de passe</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Création…" : "Créer mon compte et ouvrir le Cockpit"}
      </Button>
    </form>
  );
}
