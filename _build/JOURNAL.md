# Journal de build — La Fusée v2

Une ligne par décision. Format : `AAAA-MM-JJ — décision`.

- 2026-07-05 — Démarrage Phase 0. Repo vide confirmé, Node 22.22, Postgres 16 local démarré (db `lafusee` + `lafusee_test`), branche `claude/la-fusee-v2-rebuild-9omp5v`.
- 2026-07-05 — `_reference/` ABSENT du repo : seeds canon UPgraders/La Fusée et assets de marque (logos, fonts) seront des placeholders propres rédigés depuis le cahier ; fonts tentées depuis Fontshare (licence libre), sinon fallback système. À remplacer par l'opérateur si le dump v1 devient disponible.
- 2026-07-05 — Couche API : Server Actions + Route Handlers (pas de tRPC) — les Server Components lisent les services directement ; les route handlers ne servent que les vrais contrats HTTP (webhooks, SSE, crons, MCP, intake). Moins de couches pour la même sécurité de types.
- 2026-07-05 — PDF : PDFKit retenu (pile unique, pure JS, zéro Chromium, wrapping texte natif, embed de fonts).
- 2026-07-05 — Schéma initial : 38 tables (budget ≤60). Champs de pilier en JSON versionné (PillarVersion) plutôt qu'une table par champ — l'UI lit/écrit le pilier entier, la certitude est par champ dans le JSON.
- 2026-07-05 — Scoring : composite /200 = somme des 8 piliers scorés /25 chacun ; barème par champ = complétude structurelle × multiplicateur de certitude (INFERRED 0.6, DECLARED 0.9, OFFICIAL 1.0), pondérations fixes en code, zéro LLM (verrouillé par test).
- 2026-07-05 — Templates de notifications/emails définis en code (typés), listés en Console avec envoi de test ; pas de table de templates éditables (sobriété — le cahier ne demande pas d'éditeur).
- 2026-07-05 — Chiffrement vault credentials : AES-256-GCM, clé dérivée HKDF de NEXTAUTH_SECRET (surcharge possible via VAULT_SECRET) — zéro dépendance, secrets système restent en env.
