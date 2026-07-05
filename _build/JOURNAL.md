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
- 2026-07-05 — Branche `main` créée sur GitHub via l'API (base du commit Phase 0) : le repo distant était né sans branche par défaut, une PR exige une base. Draft PR #1 ouverte.
- 2026-07-05 — CI rouge au 1er push (typecheck) : leçon — relancer typecheck localement avant CHAQUE commit, pas seulement au scaffold. Augmentation de types JWT corrigée vers `@auth/core/jwt` (le module façade `next-auth/jwt` ne fusionne pas avec l'identité réelle des callbacks).
- 2026-07-05 — @playwright/test pinné ~1.56.0 : c'est la version appariée au chromium-1194 préinstallé dans l'environnement de dev distant ; la CI télécharge son navigateur et reste alignée.
- 2026-07-05 — Pas de page /inscription : l'entrée canonique d'un compte founder est le diagnostic (activation) ; la page connexion pointe vers /diagnostic. Talents/agences s'inscrivent via la Guilde (S7).
- 2026-07-05 — Témoignages de la landing rédigés depuis l'univers de démo seedé (Awa Cissé/Nyama Café, Moussa Diop/Guilde) — cohérents avec les données produit, à remplacer par de vrais verbatims client par l'opérateur.
- 2026-07-05 — JALON PHASE 1 : funnel complet E2E vert (landing → intake → résultat scoré → paywall → activation → cockpit) + connexion démo + mobile. 3/3 Playwright.
- 2026-07-05 — S2 : contenu légal FR rédigé de zéro (v1 absent) — structure opposable réelle, faits société marqués [À COMPLÉTER] jamais inventés ; à faire relire par l'opérateur/un conseil.
- 2026-07-05 — Blog en fichiers markdown (content/blog) rendus par `marked` (dep légère justifiée) : zéro table, zéro CMS ; l'opérateur publie en commitant.
- 2026-07-05 — Contact sans formulaire : WhatsApp (canal roi, wa.me depuis env) + email — pas de table ContactMessage, sobriété.
- 2026-07-05 — Mur public Guilde + fiches mission livrés en avance (S7) : les liens de navigation existaient et les données seedées les rendent réels ; dépôt/inscriptions/candidatures restent en S7.
- 2026-07-05 — Shells Console/Creator/Agency créés : les rôles seedés atterrissaient sur des 404 post-login. Console protégée par MFA TOTP effectif dès maintenant (enrôlement /mfa autonome + refresh de session unstable_update).
- 2026-07-05 — /realisations : uniquement des marques réellement pilotées dans l'outil (score + progression depuis 1er snapshot) — pas de mur de logos inventé.
