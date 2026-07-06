"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError, FieldHint, Input } from "@/components/ui/form";
import { createMcpKeyAction, revokeMcpKeyAction, type McpKeyFormState } from "./actions";

interface KeyRow {
  id: string;
  label: string;
  prefix: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  callsThisMonth: number;
}

export function McpKeys({ keys, gateNotice }: { keys: KeyRow[]; gateNotice: string | null }) {
  const [state, action, pending] = useActionState<McpKeyFormState, FormData>(createMcpKeyAction, {});

  return (
    <div className="flex flex-col gap-4">
      {gateNotice ? (
        <p className="rounded-(--radius-sm) border border-line bg-surface-sunken px-3 py-2 text-sm text-ink-muted">
          <span className="font-mono text-xs text-ink-faint">TIER_GATE_DENIED · </span>
          {gateNotice}
        </p>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <div className="min-w-52 flex-1">
            <Input name="label" placeholder="Nom de la clé (ex. : intégration n8n)" required minLength={3} maxLength={60} className="h-9" aria-label="Nom de la clé" />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "…" : "Créer une clé"}
          </Button>
          {state.error && <FieldError>{state.error}</FieldError>}
        </form>
      )}

      {state.plaintext && (
        <div className="rounded-(--radius-md) border border-gold bg-gold-soft p-4">
          <p className="text-sm font-semibold">Votre clé — copiez-la maintenant, elle ne sera plus jamais affichée.</p>
          <code className="mt-2 block select-all break-all rounded-(--radius-sm) bg-surface-raised px-3 py-2 font-mono text-xs">
            {state.plaintext}
          </code>
          <p className="mt-2 text-xs text-ink-muted">
            Usage : <code className="font-mono">Authorization: Bearer &lt;clé&gt;</code> sur{" "}
            <code className="font-mono">POST /api/mcp</code> (JSON-RPC : initialize, tools/list, tools/call).
          </p>
        </div>
      )}

      {keys.length > 0 && (
        <ul className="divide-y divide-line">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {k.label}
                  {!k.active && <Badge variant="neutral">Révoquée</Badge>}
                </p>
                <p className="font-mono text-xs text-ink-faint">
                  {k.prefix}… · créée le {k.createdAt}
                  {k.lastUsedAt ? ` · dernier appel ${k.lastUsedAt}` : " · jamais utilisée"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{k.callsThisMonth} appel{k.callsThisMonth > 1 ? "s" : ""} ce mois</Badge>
                {k.active && (
                  <form action={revokeMcpKeyAction}>
                    <input type="hidden" name="id" value={k.id} />
                    <Button type="submit" size="sm" variant="ghost">Révoquer</Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <FieldHint>
        Chaque appel d&apos;outil réussi compte 1 unité ; le relevé mensuel est gelé en début de mois
        suivant et réglé par les rails de paiement habituels.
      </FieldHint>
    </div>
  );
}
