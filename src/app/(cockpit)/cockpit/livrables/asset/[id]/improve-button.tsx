"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { improveAssetAction, type ForgeFormState } from "../../actions";

/** Amélioration IA (optionnelle) : produit une nouvelle version DRAFT à arbitrer. */
export function ImproveButton({ assetId }: { assetId: string }) {
  const [state, action, pending] = useActionState<ForgeFormState, FormData>(improveAssetAction, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={assetId} />
      <Button
        type="submit"
        variant="ghost"
        disabled={pending}
        title="Réécriture proposée en brouillon séparé — cet asset reste intact"
      >
        {pending ? "Amélioration…" : "Améliorer (IA)"}
      </Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}
