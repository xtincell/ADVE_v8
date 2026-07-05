"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { depositMissionAction, type DepositFormState } from "../actions";

export function DepositForm({ countries }: { countries: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState<DepositFormState, FormData>(depositMissionAction, {});

  if (state.ok) {
    return (
      <div className="mt-8 rounded-(--radius-md) border border-success bg-success-soft p-6">
        <h2 className="font-display text-lg font-semibold">Mission reçue ✓</h2>
        <p className="mt-2 text-sm">
          Elle est en file de modération — vous recevrez la décision par email à l&apos;adresse
          indiquée. Une fois publiée, les talents candidatent avec des devis structurés et
          l&apos;opérateur vous présente la meilleure sélection.
        </p>
        <Link href="/guilde" className={buttonClass({ variant: "outline", className: "mt-4" })}>
          Retour au mur des missions
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      <h2 className="font-display text-lg font-semibold">Votre marque</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="brandName">Nom de la marque *</Label>
          <Input id="brandName" name="brandName" required minLength={2} />
        </Field>
        <Field>
          <Label htmlFor="sector">Secteur *</Label>
          <Input id="sector" name="sector" required placeholder="Ex. : Mode, Food, Musique…" />
        </Field>
        <Field>
          <Label htmlFor="country">Pays *</Label>
          <Select id="country" name="country" defaultValue="">
            <option value="" disabled>Choisir…</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </Select>
        </Field>
      </div>

      <h2 className="font-display text-lg font-semibold">Contact (jamais publié)</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="contactName">Nom *</Label>
          <Input id="contactName" name="contactName" required />
        </Field>
        <Field>
          <Label htmlFor="contactEmail">Email *</Label>
          <Input id="contactEmail" name="contactEmail" type="email" required />
        </Field>
        <Field>
          <Label htmlFor="contactPhone">WhatsApp</Label>
          <Input id="contactPhone" name="contactPhone" inputMode="tel" />
        </Field>
      </div>

      <h2 className="font-display text-lg font-semibold">La mission</h2>
      <Field>
        <Label htmlFor="title">Titre *</Label>
        <Input id="title" name="title" required minLength={8} placeholder="Ex. : Identité visuelle complète pour lancement" />
      </Field>
      <Field>
        <Label htmlFor="summary">Résumé public *</Label>
        <FieldHint>2-3 phrases affichées sur le mur (sans coordonnées).</FieldHint>
        <Textarea id="summary" name="summary" required minLength={20} rows={2} />
      </Field>
      <Field>
        <Label htmlFor="contexte">Contexte *</Label>
        <Textarea id="contexte" name="contexte" required minLength={20} rows={3} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="objectifs">Objectifs * (un par ligne)</Label>
          <Textarea id="objectifs" name="objectifs" required rows={3} />
        </Field>
        <Field>
          <Label htmlFor="livrables">Livrables attendus * (un par ligne)</Label>
          <Textarea id="livrables" name="livrables" required rows={3} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="contraintes">Contraintes</Label>
        <Textarea id="contraintes" name="contraintes" rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="skills">Compétences recherchées</Label>
          <FieldHint>Séparées par des virgules.</FieldHint>
          <Input id="skills" name="skills" placeholder="Direction artistique, Vidéo…" />
        </Field>
        <Field>
          <Label htmlFor="budgetMin">Budget min (FCFA)</Label>
          <Input id="budgetMin" name="budgetMin" inputMode="numeric" pattern="[0-9]*" />
        </Field>
        <Field>
          <Label htmlFor="budgetMax">Budget max (FCFA)</Label>
          <Input id="budgetMax" name="budgetMax" inputMode="numeric" pattern="[0-9]*" />
        </Field>
      </div>
      <Field>
        <Label htmlFor="deadline">Échéance souhaitée</Label>
        <Input id="deadline" name="deadline" type="date" />
      </Field>

      <FieldError>{state.error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Envoi…" : "Soumettre à la modération"}
      </Button>
      <p className="text-xs text-ink-faint">
        En soumettant, vous acceptez les <Link href="/legal/cgu" className="underline">CGU</Link> — votre
        brief reste confidentiel jusqu&apos;à publication.
      </p>
    </form>
  );
}
