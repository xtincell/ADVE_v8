"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label, Select, Textarea } from "@/components/ui/form";
import { agencySignupAction, type SignupFormState } from "../actions";

export function AgencySignupForm({ countries }: { countries: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState<SignupFormState, FormData>(agencySignupAction, {});
  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="a-agencyName">Nom de l&apos;agence *</Label>
          <Input id="a-agencyName" name="agencyName" required minLength={2} />
        </Field>
        <Field>
          <Label htmlFor="a-name">Votre nom (contact) *</Label>
          <Input id="a-name" name="name" required minLength={2} autoComplete="name" />
        </Field>
        <Field>
          <Label htmlFor="a-email">Email *</Label>
          <Input id="a-email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field>
          <Label htmlFor="a-password">Mot de passe *</Label>
          <Input id="a-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field>
          <Label htmlFor="a-country">Pays *</Label>
          <Select id="a-country" name="country" defaultValue="">
            <option value="" disabled>Choisir…</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="a-website">Site web</Label>
          <Input id="a-website" name="website" type="url" placeholder="https://…" />
        </Field>
      </div>
      <Field>
        <Label htmlFor="a-services">Services * (séparés par des virgules)</Label>
        <Input id="a-services" name="services" required placeholder="Brand content, Média, Événementiel" />
      </Field>
      <Field>
        <Label htmlFor="a-description">Présentation</Label>
        <Textarea id="a-description" name="description" rows={3} />
      </Field>
      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Création…" : "Créer notre espace Agency"}
      </Button>
    </form>
  );
}
