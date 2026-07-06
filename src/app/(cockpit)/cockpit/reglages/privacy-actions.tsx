"use client";

import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { deleteAccountAction } from "./actions";

export function PrivacyActions() {
  const [confirm, setConfirm] = useState("");
  return (
    <div className="flex flex-col gap-5">
      <div>
        <a href="/api/compte/export" className={buttonClass({ variant: "outline", size: "sm" })}>
          Exporter mes données (JSON)
        </a>
      </div>
      <form action={deleteAccountAction} className="border-t border-line pt-4">
        <p className="text-sm font-medium text-danger">Supprimer mon compte</p>
        <p className="mt-1 text-xs text-ink-muted">
          Vos données personnelles sont supprimées ou anonymisées sous 90 jours ; les factures sont
          conservées (obligation légale) sans lien avec votre identité. Action irréversible — tapez{" "}
          <strong>SUPPRIMER</strong> pour confirmer.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Input
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="SUPPRIMER"
            className="h-9 w-40"
          />
          <Button type="submit" variant="danger" size="sm" disabled={confirm !== "SUPPRIMER"}>
            Supprimer définitivement
          </Button>
        </div>
      </form>
    </div>
  );
}
