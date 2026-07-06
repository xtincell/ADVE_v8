"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { updateTalentProfileAction, type ProfilFormState } from "./actions";

interface Props {
  defaults: {
    headline: string;
    bio: string;
    skills: string;
    city: string;
    country: string;
    whatsapp: string;
    available: boolean;
  };
  countries: { code: string; name: string }[];
}

export function ProfilForm({ defaults, countries }: Props) {
  const [state, action, pending] = useActionState<ProfilFormState, FormData>(updateTalentProfileAction, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field>
        <Label htmlFor="p-headline">Accroche *</Label>
        <Input id="p-headline" name="headline" defaultValue={defaults.headline} required minLength={3} maxLength={120} placeholder="ex. : Directrice artistique & brand designer" />
      </Field>
      <Field>
        <Label htmlFor="p-bio">Bio</Label>
        <Textarea id="p-bio" name="bio" defaultValue={defaults.bio} rows={4} maxLength={1000} />
      </Field>
      <Field>
        <Label htmlFor="p-skills">Compétences (séparées par des virgules)</Label>
        <Input id="p-skills" name="skills" defaultValue={defaults.skills} maxLength={400} placeholder="Identité visuelle, Motion design, …" />
        <FieldHint>Elles alimentent l&apos;annuaire public et le matching des missions.</FieldHint>
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="p-city">Ville</Label>
          <Input id="p-city" name="city" defaultValue={defaults.city} maxLength={80} />
        </Field>
        <Field>
          <Label htmlFor="p-country">Pays</Label>
          <Select id="p-country" name="country" defaultValue={defaults.country}>
            <option value="">—</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="p-whatsapp">WhatsApp</Label>
          <Input id="p-whatsapp" name="whatsapp" defaultValue={defaults.whatsapp} maxLength={30} placeholder="+221…" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="available" defaultChecked={defaults.available} className="h-4 w-4 accent-(--accent)" />
        Disponible pour de nouvelles missions
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
        {state.ok && <span className="text-sm text-success">Profil enregistré.</span>}
        {state.error && <FieldError>{state.error}</FieldError>}
      </div>
    </form>
  );
}
