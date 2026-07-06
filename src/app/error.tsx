"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Boundary d'erreur de l'arbre de pages. Cas visé : un déploiement change les
// hashes des chunks JS ; un onglet ouvert AVANT le déploiement charge alors un
// chunk 404 pendant une navigation → « client-side exception ». On détecte ce
// cas précis et on recharge UNE fois pour récupérer le build courant (garde
// temporelle anti-boucle). Toute autre erreur affiche un repli sobre.
const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const RELOAD_TS = "__chunk_reload_ts__";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!CHUNK_ERROR.test(`${error?.name}: ${error?.message}`)) return;
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(RELOAD_TS) ?? 0);
    } catch {
      /* sessionStorage indisponible (mode privé strict) : on rechargera quand même */
    }
    if (Date.now() - last > 10_000) {
      try {
        sessionStorage.setItem(RELOAD_TS, String(Date.now()));
      } catch {
        /* ignore */
      }
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Rafraîchissez la page — si le souci persiste, réessayez dans un instant.
      </p>
      <Button type="button" onClick={reset} size="lg" className="mt-6">
        Réessayer
      </Button>
    </div>
  );
}
