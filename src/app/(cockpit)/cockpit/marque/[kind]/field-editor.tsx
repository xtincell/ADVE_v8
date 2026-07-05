"use client";

import { useActionState } from "react";
import { CertaintyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Textarea } from "@/components/ui/form";
import { saveFieldAction, validateFieldAction, type ActionResult } from "../actions";

// Éditeur d'un champ ADVE : édition directe (manual-first) + validation humaine
// des champs pré-remplis. Toute écriture passe par le point d'écriture unique.

export function FieldEditor({
  brandId,
  kind,
  fieldKey,
  label,
  question,
  type,
  placeholder,
  inferable,
  value,
  certainty,
}: {
  brandId: string;
  kind: string;
  fieldKey: string;
  label: string;
  question: string;
  type: "text" | "textarea" | "list";
  placeholder?: string;
  inferable: boolean;
  value: string;
  certainty: "DECLARED" | "INFERRED" | "OFFICIAL" | null;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveFieldAction, null);
  const inputId = `${kind}-${fieldKey}`;

  return (
    <div className="rounded-(--radius-md) border border-line bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {certainty && <CertaintyBadge certainty={certainty} />}
          {!inferable && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint" title="Ce champ exige une saisie humaine — jamais pré-rempli par l'IA.">
              Saisie humaine
            </span>
          )}
        </div>
      </div>
      <FieldHint className="mt-1">{question}</FieldHint>
      <form action={action} className="mt-3">
        <input type="hidden" name="brandId" value={brandId} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="key" value={fieldKey} />
        {type === "text" ? (
          <Input id={inputId} name="value" defaultValue={value} placeholder={placeholder} />
        ) : (
          <Textarea
            id={inputId}
            name="value"
            defaultValue={value}
            placeholder={type === "list" ? placeholder ?? "Un élément par ligne" : placeholder}
            rows={type === "list" ? 4 : 5}
          />
        )}
        {type === "list" && <FieldHint className="mt-1">Un élément par ligne.</FieldHint>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {certainty === "INFERRED" && (
            <Button
              type="submit"
              size="sm"
              variant="gold"
              formAction={validateFieldAction}
              title="Confirme la proposition telle quelle (certitude Validé)"
            >
              Valider tel quel
            </Button>
          )}
          {certainty === "DECLARED" && value && (
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              formAction={validateFieldAction}
              title="Marque ce champ comme officiellement validé"
            >
              Marquer validé
            </Button>
          )}
          {state?.ok && <span className="text-xs font-medium text-success">{state.message}</span>}
        </div>
        <FieldError>{state && !state.ok ? state.error : null}</FieldError>
      </form>
    </div>
  );
}
