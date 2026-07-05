"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/form";
import { updatePriceAction, type ConfigFormState } from "./actions";

interface Rule {
  id: string;
  tier: string;
  zone: string;
  amount: number;
  currency: string;
  active: boolean;
}

const TIER_ORDER = ["INTAKE_FREE", "INTAKE_PDF", "ORACLE_FULL", "COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"];
const ZONE_ORDER = ["UEMOA", "CEMAC", "DIASPORA", "OTHER"];

export function PriceGridEditor({ rules }: { rules: Rule[] }) {
  const [state, action, pending] = useActionState<ConfigFormState, FormData>(updatePriceAction, {});
  const byKey = new Map(rules.map((r) => [`${r.tier}:${r.zone}`, r]));

  return (
    <form action={action}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line-strong text-left">
              <th className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Tier</th>
              {ZONE_ORDER.map((z) => (
                <th key={z} className="py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{z}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.map((tier) => (
              <tr key={tier} className="border-b border-line">
                <td className="py-2 pr-3 font-mono text-xs">{tier}</td>
                {ZONE_ORDER.map((zone) => {
                  const rule = byKey.get(`${tier}:${zone}`);
                  if (!rule) return <td key={zone} className="py-2 pr-3 text-ink-faint">—</td>;
                  return (
                    <td key={zone} className="py-2 pr-3">
                      <span className="flex items-center gap-1">
                        <input
                          name={`amount:${rule.id}`}
                          defaultValue={rule.amount}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="h-8 w-24 rounded-(--radius-xs) border border-line bg-surface-raised px-2 font-mono text-xs focus:border-accent focus:outline-none"
                          aria-label={`${tier} ${zone}`}
                        />
                        <span className="font-mono text-[10px] text-ink-faint">{rule.currency}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer la grille"}
        </Button>
        {state.ok && <span className="text-xs font-medium text-success">Grille mise à jour.</span>}
      </div>
      <FieldError>{state.error}</FieldError>
    </form>
  );
}
