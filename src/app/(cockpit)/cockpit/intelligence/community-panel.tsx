"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, Input, Label, Select } from "@/components/ui/form";
import { addMemberAction, deleteMemberAction, updateMemberLevelAction, type IntelFormState } from "./actions";

const LEVELS = [
  ["SPECTATEUR", "Spectateur"],
  ["INTERESSE", "Intéressé"],
  ["PARTICIPANT", "Participant"],
  ["ENGAGE", "Engagé"],
  ["AMBASSADEUR", "Ambassadeur"],
  ["EVANGELISTE", "Évangéliste"],
] as const;

interface Member {
  id: string;
  name: string;
  handle: string | null;
  channel: string | null;
  level: string;
  note: string | null;
}

export function CommunityPanel({ brandId, members }: { brandId: string; members: Member[] }) {
  const [state, action, pending] = useActionState<IntelFormState, FormData>(addMemberAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communauté (recensement manuel)</CardTitle>
        <CardDescription>
          Qui sont les personnes réelles derrière vos chiffres ? Chaque changement d&apos;échelon
          historise un instantané (Cult Index, ladder).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 rounded-(--radius-md) border border-line bg-surface-sunken/40 p-4 sm:grid-cols-[1fr_1fr_150px_auto]">
          <input type="hidden" name="brandId" value={brandId} />
          <Field>
            <Label htmlFor="m-name" className="text-xs">Nom *</Label>
            <Input id="m-name" name="name" required minLength={2} className="h-9" />
          </Field>
          <Field>
            <Label htmlFor="m-channel" className="text-xs">Canal / note</Label>
            <Input id="m-channel" name="channel" placeholder="whatsapp, boutique…" className="h-9" />
          </Field>
          <Field>
            <Label htmlFor="m-level" className="text-xs">Échelon *</Label>
            <Select id="m-level" name="level" defaultValue="PARTICIPANT" className="h-9">
              {LEVELS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
          </Field>
          <div className="self-end">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "…" : "Ajouter"}
            </Button>
          </div>
          {state.error && <FieldError>{state.error}</FieldError>}
        </form>

        {members.length > 0 && (
          <ul className="mt-4 divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {m.name}
                    {(m.level === "AMBASSADEUR" || m.level === "EVANGELISTE") && <Badge variant="accent">Superfan</Badge>}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {[m.handle, m.channel, m.note].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateMemberLevelAction} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={m.id} />
                    <Select
                      name="level"
                      defaultValue={m.level}
                      className="h-8 w-36 text-xs"
                      aria-label={`Échelon de ${m.name}`}
                    >
                      {LEVELS.map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </Select>
                    <Button type="submit" size="sm" variant="outline">↕</Button>
                  </form>
                  <form action={deleteMemberAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <Button type="submit" size="sm" variant="ghost" aria-label={`Retirer ${m.name}`}>
                      ✕
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
