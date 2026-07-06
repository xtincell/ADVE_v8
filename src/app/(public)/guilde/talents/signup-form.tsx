"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { talentSignupAction, type SignupFormState } from "../actions";

export function TalentSignupForm({ countries }: { countries: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState<SignupFormState, FormData>(talentSignupAction, {});
  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <h2 className="font-display text-lg font-semibold">Votre compte</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="t-name">Nom complet *</Label>
          <Input id="t-name" name="name" required minLength={2} autoComplete="name" />
        </Field>
        <Field>
          <Label htmlFor="t-email">Email *</Label>
          <Input id="t-email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field>
          <Label htmlFor="t-password">Mot de passe *</Label>
          <Input id="t-password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      </div>

      <h2 className="font-display text-lg font-semibold">Votre profil public</h2>
      <Field>
        <Label htmlFor="t-headline">Votre métier en une ligne *</Label>
        <Input id="t-headline" name="headline" required minLength={4} placeholder="Ex. : Directrice artistique & motion designer" />
      </Field>
      <Field>
        <Label htmlFor="t-skills">Compétences * (séparées par des virgules)</Label>
        <Input id="t-skills" name="skills" required placeholder="Identité visuelle, Motion, Photographie" />
      </Field>
      <Field>
        <Label htmlFor="t-bio">Bio</Label>
        <Textarea id="t-bio" name="bio" rows={3} placeholder="Parcours, clients marquants, ce que vous aimez faire…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="t-country">Pays *</Label>
          <Select id="t-country" name="country" defaultValue="">
            <option value="" disabled>Choisir…</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="t-city">Ville</Label>
          <Input id="t-city" name="city" />
        </Field>
        <Field>
          <Label htmlFor="t-whatsapp">WhatsApp</Label>
          <Input id="t-whatsapp" name="whatsapp" inputMode="tel" />
        </Field>
      </div>
      <Field>
        <Label htmlFor="t-portfolio">Portfolio (une URL par ligne)</Label>
        <FieldHint>Site, Behance, Instagram pro…</FieldHint>
        <Textarea id="t-portfolio" name="portfolio" rows={2} />
      </Field>

      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Création…" : "Créer mon espace Creator"}
      </Button>
    </form>
  );
}
