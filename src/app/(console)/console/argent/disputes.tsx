"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Select } from "@/components/ui/form";
import { openDisputeAction, resolveDisputeAction, type DisputeFormState } from "./actions";

interface OpenDispute {
  id: string;
  missionTitle: string;
  reason: string;
  createdAt: string;
}

interface AssignedMission {
  id: string;
  title: string;
}

function OpenForm({ missions }: { missions: AssignedMission[] }) {
  const [state, action, pending] = useActionState<DisputeFormState, FormData>(openDisputeAction, {});
  if (missions.length === 0) {
    return <p className="text-sm text-ink-muted">Aucune mission attribuée : un litige se déclare sur une mission en cours.</p>;
  }
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <Select name="missionId" defaultValue="" className="h-9 min-w-56" aria-label="Mission">
        <option value="" disabled>Mission concernée…</option>
        {missions.map((m) => (
          <option key={m.id} value={m.id}>{m.title}</option>
        ))}
      </Select>
      <Input name="reason" required minLength={10} placeholder="Motif du litige signalé" className="h-9 min-w-64 flex-1" aria-label="Motif" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "…" : "Ouvrir un litige"}</Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

function ResolveForm({ disputeId }: { disputeId: string }) {
  const [state, action, pending] = useActionState<DisputeFormState, FormData>(resolveDisputeAction, {});
  return (
    <form action={action} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <Input name="resolution" required minLength={5} placeholder="Décision motivée…" className="h-8 min-w-56 flex-1 text-xs" aria-label="Décision" />
      <Select name="outcome" defaultValue="RESOLVED_CLIENT" className="h-8 w-44 text-xs" aria-label="Issue">
        <option value="RESOLVED_CLIENT">En faveur du client</option>
        <option value="RESOLVED_TALENT">En faveur du talent</option>
        <option value="CANCELED">Classer sans suite</option>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "…" : "Arbitrer"}</Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

export function DisputesPanel({ open, missions }: { open: OpenDispute[]; missions: AssignedMission[] }) {
  return (
    <div className="flex flex-col gap-4">
      <OpenForm missions={missions} />
      {open.length === 0 ? (
        <p className="text-sm text-ink-muted">Aucun litige ouvert. L&apos;arbitrage est manuel — pas d&apos;escrow automatique (§6).</p>
      ) : (
        <ul className="divide-y divide-line">
          {open.map((d) => (
            <li key={d.id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm">
                  <Badge variant="danger">En arbitrage</Badge>
                  <span className="font-medium">{d.missionTitle}</span>
                </p>
                <span className="font-mono text-xs text-ink-faint">{d.createdAt}</span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{d.reason}</p>
              <ResolveForm disputeId={d.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
