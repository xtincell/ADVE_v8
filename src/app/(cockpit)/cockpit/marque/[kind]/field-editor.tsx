"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { CertaintyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input, Textarea } from "@/components/ui/form";
import { reformulateFieldAction, saveFieldAction, validateFieldAction, type ActionResult } from "../actions";

// Éditeur d'un champ ADVE : édition directe (manual-first) + validation humaine
// des champs pré-remplis. Toute écriture passe par le point d'écriture unique.
// L'assistance IA (optionnelle) PROPOSE une reformulation — c'est l'humain qui
// choisit de l'utiliser puis d'enregistrer.

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
  llmAssist = false,
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
  llmAssist?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveFieldAction, null);
  const [text, setText] = useState(value);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [assistBusy, startAssist] = useTransition();
  const inputId = `${kind}-${fieldKey}`;

  const askReformulation = (mode: "LLM_REFORMULATE" | "LLM_STRATEGIC") => {
    setAssistError(null);
    startAssist(async () => {
      const res = await reformulateFieldAction({ brandId, kind, key: fieldKey, value: text, mode });
      if (res.ok) setSuggestion(res.suggestion);
      else setAssistError(res.error);
    });
  };

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
          <Input id={inputId} name="value" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
        ) : (
          <Textarea
            id={inputId}
            name="value"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={type === "list" ? placeholder ?? "Un élément par ligne" : placeholder}
            rows={type === "list" ? 4 : 5}
          />
        )}
        {type === "list" && <FieldHint className="mt-1">Un élément par ligne.</FieldHint>}

        {suggestion && (
          <div className="mt-3 rounded-(--radius-sm) border border-info bg-info-soft p-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
              Proposition IA — rien n&apos;est enregistré sans vous
            </p>
            <p className="mt-1 whitespace-pre-line text-sm">{suggestion}</p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => { setText(suggestion); setSuggestion(null); }}>
                Utiliser ce texte
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                Ignorer
              </Button>
            </div>
          </div>
        )}

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
          {llmAssist && text.trim().length >= 10 && (
            <span className="ml-auto flex items-center gap-1">
              <Button type="button" size="sm" variant="ghost" disabled={assistBusy} onClick={() => askReformulation("LLM_REFORMULATE")} title="Même substance, plus clair — proposition à valider">
                {assistBusy ? "…" : "Reformuler (IA)"}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={assistBusy} onClick={() => askReformulation("LLM_STRATEGIC")} title="Relecture stratégique — proposition à valider">
                Version stratégique (IA)
              </Button>
            </span>
          )}
          {state?.ok && <span className="text-xs font-medium text-success">{state.message}</span>}
        </div>
        <FieldError>{state && !state.ok ? state.error : assistError}</FieldError>
      </form>
    </div>
  );
}
