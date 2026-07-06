"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { updateRolesAction, type RolesFormState } from "./actions";

const ALL_ROLES = ["ADMIN", "OPERATOR", "FOUNDER", "TALENT", "AGENCY", "USER"] as const;

export function RoleEditor({ userId, roles, disabled }: { userId: string; roles: string[]; disabled?: boolean }) {
  const [state, action, pending] = useActionState<RolesFormState, FormData>(updateRolesAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex flex-wrap gap-1">
        {ALL_ROLES.map((r) => (
          <label
            key={r}
            className="flex cursor-pointer items-center gap-1 rounded-(--radius-xs) border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] uppercase has-checked:border-accent has-checked:bg-accent-soft"
          >
            <input type="checkbox" name="roles" value={r} defaultChecked={roles.includes(r)} disabled={disabled} className="h-3 w-3 accent-(--accent)" />
            {r}
          </label>
        ))}
      </div>
      <Button type="submit" size="sm" variant="outline" disabled={pending || disabled} title={disabled ? "Impossible de modifier ses propres rôles" : undefined}>
        {pending ? "…" : "Appliquer"}
      </Button>
      {state.ok && <span className="text-xs text-success">✓</span>}
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
