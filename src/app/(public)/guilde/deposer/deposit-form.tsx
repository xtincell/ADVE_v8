"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Select, Textarea } from "@/components/ui/form";
import { depositMissionAction, draftMissionAction, type DepositFormState } from "../actions";

interface Draft {
  title: string;
  summary: string;
  contexte: string;
  objectifs: string;
  livrables: string;
  contraintes: string;
  skills: string;
}

export function DepositForm({ countries, llmAssist = false }: { countries: { code: string; name: string }[]; llmAssist?: boolean }) {
  const [state, action, pending] = useActionState<DepositFormState, FormData>(depositMissionAction, {});
  const [raw, setRaw] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftVersion, setDraftVersion] = useState(0);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [drafting, startDrafting] = useTransition();

  const runDraft = () => {
    setDraftError(null);
    startDrafting(async () => {
      const res = await draftMissionAction({ raw });
      if (res.ok) {
        setDraft(res.draft);
        setDraftVersion((v) => v + 1); // remonte le formulaire avec les nouveaux defauts
      } else {
        setDraftError(res.error);
      }
    });
  };

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
    <>
      {llmAssist && (
        <details className="mt-8 rounded-(--radius-md) border border-line bg-surface-raised p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Rédiger le brief avec l&apos;IA (optionnel)
          </summary>
          <p className="mt-2 text-xs text-ink-muted">
            Décrivez votre besoin librement — l&apos;IA structure un brief (titre, résumé, objectifs,
            livrables) que vous relisez et complétez avant de soumettre. Elle n&apos;invente ni budget
            ni délai, et vos coordonnées restent à saisir par vous.
          </p>
          <Textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={4}
            className="mt-3"
            placeholder="Ex. : On lance une 3e origine de café en septembre, il nous faut une vidéo hero et des déclinaisons stories…"
            aria-label="Description libre du besoin"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={runDraft} disabled={drafting}>
              {drafting ? "Rédaction…" : "Structurer le brief"}
            </Button>
            {draft && <span className="text-xs font-medium text-success">Brief proposé ci-dessous — relisez et ajustez.</span>}
          </div>
          <FieldError>{draftError}</FieldError>
        </details>
      )}

    <form key={draftVersion} action={action} className="mt-8 flex flex-col gap-5">
      {draft && <input type="hidden" name="llmAssisted" value="1" />}
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
        <Input id="title" name="title" required minLength={8} defaultValue={draft?.title} placeholder="Ex. : Identité visuelle complète pour lancement" />
      </Field>
      <Field>
        <Label htmlFor="summary">Résumé public *</Label>
        <FieldHint>2-3 phrases affichées sur le mur (sans coordonnées).</FieldHint>
        <Textarea id="summary" name="summary" required minLength={20} rows={2} defaultValue={draft?.summary} />
      </Field>
      <Field>
        <Label htmlFor="contexte">Contexte *</Label>
        <Textarea id="contexte" name="contexte" required minLength={20} rows={3} defaultValue={draft?.contexte} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="objectifs">Objectifs * (un par ligne)</Label>
          <Textarea id="objectifs" name="objectifs" required rows={3} defaultValue={draft?.objectifs} />
        </Field>
        <Field>
          <Label htmlFor="livrables">Livrables attendus * (un par ligne)</Label>
          <Textarea id="livrables" name="livrables" required rows={3} defaultValue={draft?.livrables} />
        </Field>
      </div>
      <Field>
        <Label htmlFor="contraintes">Contraintes</Label>
        <Textarea id="contraintes" name="contraintes" rows={2} defaultValue={draft?.contraintes} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <Label htmlFor="skills">Compétences recherchées</Label>
          <FieldHint>Séparées par des virgules.</FieldHint>
          <Input id="skills" name="skills" defaultValue={draft?.skills} placeholder="Direction artistique, Vidéo…" />
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
    </>
  );
}
