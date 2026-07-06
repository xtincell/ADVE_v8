"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/form";
import { addSignalAction, type IntelFormState } from "./actions";

export function SignalForm({ brandId }: { brandId: string }) {
  const [state, action, pending] = useActionState<IntelFormState, FormData>(addSignalAction, {});
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[2fr_1.4fr_auto]">
      <input type="hidden" name="brandId" value={brandId} />
      <Input name="title" placeholder="Signal observé (ex. : un concurrent ouvre à Plateau)" required minLength={5} className="h-9" aria-label="Signal observé" />
      <Input name="url" type="url" placeholder="Lien (optionnel)" className="h-9" aria-label="Lien du signal" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Ajouter le signal"}
      </Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
