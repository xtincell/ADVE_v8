import type { Metadata } from "next";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Statut du service" };
export const dynamic = "force-dynamic";

// Page de statut honnête : elle teste réellement les dépendances au chargement.
async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number | null }> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: null };
  }
}

function StatusRow({ name, ok, detail }: { name: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-ink-muted">{detail}</p>
      </div>
      <span
        className={`rounded-(--radius-xs) px-2 py-1 font-mono text-xs font-semibold ${
          ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}
      >
        {ok ? "OPÉRATIONNEL" : "INCIDENT"}
      </span>
    </div>
  );
}

export default async function StatutPage() {
  const dbCheck = await checkDatabase();
  const now = new Date();

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <p className="font-mono text-xs uppercase tracking-widest text-accent">Statut</p>
      <h1 className="mt-3 text-3xl font-semibold">État du service</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Vérifié en direct au chargement de cette page —{" "}
        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "medium" }).format(now)}.
      </p>
      <div className="mt-8 rounded-(--radius-md) border border-line bg-surface-raised px-5 py-2">
        <StatusRow
          name="Application"
          ok
          detail="Le rendu de cette page prouve que l'application répond."
        />
        <StatusRow
          name="Base de données"
          ok={dbCheck.ok}
          detail={dbCheck.ok ? `Répond en ${dbCheck.latencyMs} ms` : "Injoignable — nos équipes sont alertées"}
        />
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Un incident ? Écrivez-nous via la page Contact — les incidents majeurs font l&apos;objet
        d&apos;un post-mortem publié sous 5 jours ouvrés (voir SLA).
      </p>
    </div>
  );
}
