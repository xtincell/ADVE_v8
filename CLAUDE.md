# La Fusée v2 — CLAUDE.md

SaaS de stratégie de marque (UPgraders) pour l'industrie créative d'Afrique francophone. **Autorité produit : `CAHIER-DES-CHARGES.md`** (périmètre §13, anti-patterns §12, budgets §14). Architecture : `ARCHITECTURE.md`. État de mission : `_build/LEDGER.json` + `_build/JOURNAL.md`.

## Commandes

```bash
npm run dev            # serveur de dev (http://localhost:3000)
npm run build          # build pur (zéro migration/seed/réseau)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest (tests de domaine)
npm run e2e            # playwright (parcours d'argent)
npm run db:migrate     # prisma migrate deploy
npm run db:migrate:dev # prisma migrate dev (crée une migration)
npm run db:seed        # seeds idempotents (admin, canon, pays/grille, démo)
bash scripts/init.sh   # amorce une machine de dev en une commande
```

## Architecture (10 lignes)

- Next.js 15 App Router + React 19, TS strict, `output: standalone`, runtime Node uniquement.
- Mutations = Server Actions (Zod aux frontières) ; Route Handlers réservés aux contrats HTTP : `api/webhooks/[provider]`, `api/sse`, `api/cron/*`, `api/mcp`, `api/intake`.
- Domaine dans `src/server/<module>/` (~19 modules : brands, scoring, oracle, billing, payments, guild, notifications, intelligence, llm, vault, audit…). Le point d'écriture UNIQUE des piliers est `src/server/brands/amend.ts` — toute autre écriture de pilier est un bug.
- Prisma + Postgres, ~38 tables ; toute donnée métier porte `operatorId` (tenant) — utiliser les helpers scopés de `src/server/tenancy`.
- Surfaces : `(public)` funnel/marketing/guilde, `(cockpit)` founder, `(console)` operator, `(creator)`, `(agency)`.
- UI : Tailwind 4, tokens 2 niveaux dans `globals.css` (les composants n'utilisent QUE les tokens sémantiques), CVA pour les variantes.

## Conventions non négociables

- **Honest-empty** : jamais de donnée inventée ; états vides/`DEFERRED`/`INSUFFISANT` explicites.
- **Manual-first** : toute capacité LLM a son équivalent formulaire, mêmes endpoints ; l'app est 100 % fonctionnelle sans aucune clé LLM.
- **Scoring 100 % déterministe** (aucun LLM dans le chemin — test de non-régression).
- Français d'abord ; vocabulaire business en façade (zéro mythologie interne dans l'UI/PDF/emails).
- Sobriété : pas de scaffolding spéculatif ; une capacité = une implémentation ; supprimer ce qu'on remplace.
- Config 100 % env (`src/env.ts`) ; jamais de secret en dur ; jamais d'API d'hébergeur.
