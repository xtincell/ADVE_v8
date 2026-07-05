"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label } from "@/components/ui/form";
import { googleSignInAction, loginAction, type AuthFormState } from "../actions";

export function LoginForm({ next, withGoogle }: { next: string; withGoogle: boolean }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <div className="mt-8">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <Field>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        {state.mfa && (
          <Field>
            <Label htmlFor="totp">Code de vérification</Label>
            <FieldHint>Entrez le code à 6 chiffres de votre application d&apos;authentification.</FieldHint>
            <Input id="totp" name="totp" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" autoFocus />
          </Field>
        )}
        <FieldError>{state.error}</FieldError>
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      {withGoogle && (
        <form action={googleSignInAction} className="mt-3">
          <input type="hidden" name="next" value={next} />
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Continuer avec Google
          </Button>
        </form>
      )}
    </div>
  );
}
