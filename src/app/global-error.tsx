"use client";

import { useEffect } from "react";

// Boundary de dernier recours : ne se déclenche que si le layout racine lui-même
// lève une erreur (remplace tout le document, d'où <html>/<body> et styles inline
// — la CSS de l'app peut ne pas être chargée). Même logique anti-chunk-périmé que
// src/app/error.tsx : recharge une fois pour récupérer le build courant.
const CHUNK_ERROR =
  /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
const RELOAD_TS = "__chunk_reload_ts__";

export default function GlobalError({
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
      /* ignore */
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
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a08",
          color: "#f6f2ea",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, margin: 0 }}>Une erreur est survenue</h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", opacity: 0.7 }}>
            Rafraîchissez la page — si le souci persiste, réessayez dans un instant.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.65rem 1.5rem",
              borderRadius: "0.6rem",
              border: "none",
              background: "#e56458",
              color: "#ffffff",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
