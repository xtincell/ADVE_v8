"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Label, Select } from "@/components/ui/form";
import { updateProfileAction, type ReglagesFormState } from "./actions";

export function ProfileForm({
  name,
  email,
  country,
  phone,
  countries,
}: {
  name: string;
  email: string;
  country: string;
  phone: string;
  countries: { code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ReglagesFormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field>
        <Label htmlFor="p-name">Nom</Label>
        <Input id="p-name" name="name" defaultValue={name} autoComplete="name" />
      </Field>
      <Field>
        <Label htmlFor="p-email">Email (identifiant)</Label>
        <Input id="p-email" value={email} disabled className="opacity-60" />
      </Field>
      <Field>
        <Label htmlFor="p-country">Pays</Label>
        <Select id="p-country" name="country" defaultValue={country}>
          <option value="">—</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor="p-phone">WhatsApp / téléphone</Label>
        <Input id="p-phone" name="phone" defaultValue={phone} inputMode="tel" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {state.ok && <span className="text-xs font-medium text-success">Profil mis à jour.</span>}
      </div>
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
