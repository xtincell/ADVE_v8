"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldHint, Input, Label, Select } from "@/components/ui/form";
import { forgeAssetAction, type ForgeFormState } from "./actions";

interface KindOption {
  kind: string;
  label: string;
  needsObjectif?: boolean;
}

export function ForgeForm({ brandId, kinds }: { brandId: string; kinds: KindOption[] }) {
  const [state, action, pending] = useActionState<ForgeFormState, FormData>(forgeAssetAction, {});
  const [kind, setKind] = useState(kinds[0]?.kind ?? "");
  const needsObjectif = kinds.find((k) => k.kind === kind)?.needsObjectif ?? false;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1.2fr_1.6fr_auto]">
      <input type="hidden" name="brandId" value={brandId} />
      <Field>
        <Label htmlFor="forge-kind" className="text-xs">Livrable</Label>
        <Select id="forge-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-9">
          {kinds.map((k) => (
            <option key={k.kind} value={k.kind}>{k.label}</option>
          ))}
        </Select>
      </Field>
      {needsObjectif ? (
        <Field>
          <Label htmlFor="forge-objectif" className="text-xs">Objectif de la campagne *</Label>
          <Input
            id="forge-objectif"
            name="objectif"
            required
            minLength={5}
            placeholder="ex. : Lancement origine Éthiopie"
            className="h-9"
          />
        </Field>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}
      <div className="self-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Forge…" : "Forger"}
        </Button>
      </div>
      <FieldHint className="sm:col-span-3">
        Composition déterministe depuis vos piliers : ce qui manque au socle apparaît comme un trou
        explicite « À compléter », jamais comme une invention.
      </FieldHint>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
