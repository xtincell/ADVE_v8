"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Select } from "@/components/ui/form";
import { respondBrandRequestAction, type RespondFormState } from "./actions";

interface RequestRow {
  id: string;
  brandName: string;
  authorEmail: string;
  subject: string;
  message: string;
  createdAt: string;
}

function RespondForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<RespondFormState, FormData>(respondBrandRequestAction, {});
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Input name="response" required minLength={3} placeholder="Votre réponse au founder…" className="h-8 min-w-64 flex-1 text-xs" aria-label="Réponse" />
      <Select name="outcome" defaultValue="DONE" className="h-8 w-36 text-xs" aria-label="Issue">
        <option value="DONE">Traitée</option>
        <option value="IN_PROGRESS">En traitement</option>
        <option value="DECLINED">Déclinée</option>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Répondre"}
      </Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

export function RequestQueue({ requests }: { requests: RequestRow[] }) {
  return (
    <ul className="divide-y divide-line">
      {requests.map((r) => (
        <li key={r.id} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm">
              <Badge variant="info">Ouverte</Badge>
              <span className="font-medium">{r.subject}</span>
            </p>
            <p className="font-mono text-xs text-ink-faint">
              {r.brandName} · {r.authorEmail} · {r.createdAt}
            </p>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{r.message}</p>
          <RespondForm requestId={r.id} />
        </li>
      ))}
    </ul>
  );
}
