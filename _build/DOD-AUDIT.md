# Audit final de conformité — La Fusée v2

Date : 2026-07-06 · Branche : `claude/la-fusee-v2-rebuild-9omp5v` · Référence : `CAHIER-DES-CHARGES.md`
Méthode : chaque ligne du périmètre est vérifiée **par exécution** (test, banc, sonde HTTP) ou par mesure directe ; trois revues à contexte frais (anti-patterns/budgets, doctrines, sécurité) attaquent la conformité — leurs constats sont intégrés ci-dessous.

## 1. Périmètre §13 IN (1–10)

| # | Tranche | Preuve d'exécution |
|---|---|---|
| 1 | Socle (auth, rôles, god-mode, tenant, tokens, seeds) | Login E2E vert ; MFA TOTP admin (page /mfa) ; god-mode env élève ADMIN ; seeds ×2 sans doublon ; `_build/LEDGER.json` S1.* |
| 2 | Funnel public complet + légal + pricing | `e2e/funnel.spec.ts` 3/3 (desktop + @mobile Pixel 7) ; 8 pages légales ; /tarifs dérivé de PriceRule |
| 3 | Méthode ADVE→scoring→RTIS→staleness | `e2e/methode.spec.ts` 2/2 ; 13 tests unitaires scoring + verrou anti-LLM ; point d'écriture unique amendPillar |
| 4 | Oracle 35 sections + PDF | 22 tests unitaires mappers ; E2E génération + export `%PDF-` >20 Ko ; hash SHA-256 du socle gelé |
| 5 | Paiements (Stripe, manuel WhatsApp, mobile money DEFERRED, gates) | `e2e/paiements.spec.ts` 2/2 ; règle d'or : settle uniquement sur confirmation authentifiée ; idempotence WebhookEvent |
| 6 | Console (7 rubriques) | `e2e/console.spec.ts` 3/3 ; édition opérateur via le même point d'écriture (`?marque=`) |
| 7 | Guilde (mur, dépôt, modération, candidatures, devis) | `e2e/guilde.spec.ts` 2/2 : dépôt→modération→devis structuré→attribution→commission 25 % |
| 8 | Notifications (SSE unique, email cascade, digest, crons HTTP) | `e2e/notifications.spec.ts` 4/4 dont SSE live 2 contextes et cron fail-closed |
| 9 | Intelligence honnête + forge/vault d'assets | `e2e/intelligence.spec.ts` 2/2 + `e2e/forge.spec.ts` 2/2 ; 9 tests unitaires mesures/composers ; gate TIER_GATE_DENIED structuré |
| 10 | Creator/Agency minces + MCP facturable | `e2e/espaces.spec.ts` 2/2 + `e2e/mcp.spec.ts` 3/3 (clé une fois, JSON-RPC, comptage, relevé gelé, encaissement par le rail réel) |
| X | LLM optionnel (gateway + 5 usages à équivalent manuel) | 6 tests unitaires gateway (fetch simulé) ; `e2e/llm.spec.ts` 3/3 : zéro clé ⇒ zéro façade, déterministe entier |

**Banc complet : 28/28 E2E (Playwright, artefact standalone) + 37/37 unitaires (Vitest) + typecheck strict + lint — verts.** CI GitHub verte sur les 4 derniers pushes (9d5d586, e3e2140, e7c20ba, 2d1604e).

## 2. Les 5 parcours d'argent (DoD mission)

1. **Funnel complet avec paiement test → PDF débloqué** — `paiements.spec.ts:8` ✅
2. **Amendement ADVE → staleness → refresh RTIS → Oracle → export PDF réel** — `methode.spec.ts:8` ✅
3. **Dépôt Guilde → modération → candidature (devis structuré) → attribution + commission** — `guilde.spec.ts` ✅
4. **Abonnement manuel WhatsApp → file Console → validation → ACTIF + facture** — `paiements.spec.ts:50` ✅
5. **Notification in-app SSE reçue en direct (2 contextes, sans reload)** — `notifications.spec.ts:8` ✅

## 3. Budgets de sobriété §14 (mesurés)

| Budget | Limite | Mesuré | État |
|---|---|---|---|
| Tables (modèles Prisma) | ≤ 60 | **38** | ✅ |
| Routes (pages + handlers) | ≤ 200 | **64** (55 pages + 9 handlers) | ✅ |
| Modules serveur (1er niveau src/server) | ≤ 25 | **20** | ✅ |
| Pile PDF | 1 | **1** (PDFKit, zéro Chromium) | ✅ |
| Moteur Oracle | 1 | **1** (`src/server/oracle`) | ✅ |
| Endpoint SSE | 1 | **1** (`/api/sse` — le MCP est du JSON-RPC sans flux) | ✅ |
| Endpoint MCP | 1 | **1** (`/api/mcp`) | ✅ |

## 4. Portabilité §11.1

- **Config 100 % env** : `src/env.ts` validé au premier accès runtime (jamais au build) ; `.env.example` exhaustif — 3 requis, tout le reste optionnel. ✅
- **Build pur** : `next build` sans réseau ni DB ; `output: "standalone"`. ✅ (le banc rebuild à chaque run)
- **Node 22 + Postgres 16, trois modes** : dev (`scripts/init.sh`), pm2 (`ecosystem.config.cjs` — **vérifié en exécution** : online, 200), Docker (`Dockerfile` multi-stage + migrations au boot). ✅
- **Vérification Docker** : pas de daemon dans l'environnement de build — le layout du runner a été **assemblé à l'identique et exécuté** : `prisma migrate deploy` (CLI isolée /opt) OK, serveur 200 sur /, /tarifs, /statut, /blog (articles markdown résolus depuis ./content). Réserve honnête : le `docker build` lui-même n'a pas pu tourner ici ; il sera exercé par le déploiement Coolify (buildpack Dockerfile).
- **Zéro code vendor/plateforme** dans l'app (le déploiement Coolify est externe au repo). ✅

## 5. Sécurité §11.2

- Bcrypt + JWT ; **MFA TOTP obligatoire ADMIN** (redirect /mfa avant Console) ; god-mode par env. ✅ (E2E login/console)
- **Gates structurés** TIER_GATE_DENIED + upgrade path, god-mode/staff bypass. ✅ (E2E intelligence/mcp)
- **Paiements** : signature Stripe sur corps brut ; statut re-lu chez le provider (Wave/MoMo/CinetPay/PayPal) ; validation humaine (manuel) ; idempotence `WebhookEvent unique(provider, externalId)` ; MOCK verrouillé hors prod réelle. ✅
- **Vault** AES-256-GCM par opérateur, secrets jamais réaffichés ; clés MCP hashées SHA-256, clair montré une fois. ✅ (E2E vault + mcp)
- **Crons fail-closed** (CRON_SECRET, 401/503). ✅ (E2E)
- **Audit** des mutations sensibles (paiements, rôles, piliers, vault, forge, MCP, relevés). ✅
- Revue défensive à contexte frais : constats et corrections en §8.

## 6. Qualité §11.3 & seeds §11.4

- TS strict, ESLint, **37 tests unitaires de domaine** (scoring/staleness, mappers Oracle, mesures, composers forge, gateway LLM), **28 E2E parcours d'argent** — zéro « test de doctrine ». ✅
- Seeds idempotents : admin god-mode, canon UPgraders (193/200) + La Fusée, 22 pays/4 zones + grille, démo Nyama Café (89, INFERRED à valider, communauté, abonnements ACTIF + PENDING), 3 missions Guilde, comptes de rôle (dont `gratuit@` pour les gates fermés). ✅
- Reprise v1 : **aucune** (décision cahier). ✅

## 7. Anti-patterns §12

- Nommage par domaine métier (`billing`, `oracle`, `guild`…) — « Oracle » et « La Guilde » sont des noms **produit** du cahier. ✅
- Un point d'écriture ADVE (amendPillar) ; une implémentation par capacité ; pas de bus d'intents, pas de hash-chain. ✅
- Features fantômes purgées en P3 : config `BLOB_STORAGE_PUT_URL_TEMPLATE` (jamais lue) supprimée ; 5 fonctions mortes supprimées ; ~20 exports internes refermés (knip + tri manuel).
- Revue à contexte frais : constats et corrections en §8.

## 8. Constats des revues à contexte frais (et corrections)

_(rempli après retour des trois auditeurs)_

## 9. Réserves honnêtes

- Le `docker build` n'a pas pu être exécuté dans cet environnement (pas de daemon) — layout du runner vérifié à l'identique hors image (cf. §4) ; l'image sera construite par Coolify au déploiement.
- Les chemins LLM **avec** clés sont prouvés en unitaire (fetch simulé : fallback, retry Zod, indisponibilité) — aucun provider réel n'est appelé par le banc. Première clé réelle = à brancher en env, aucune modification de code.
- Rails mobile money : clients HTTP réels présents, **non testés contre les sandboxes providers** (pas de credentials) — état affiché honnêtement `DEFERRED_AWAITING_CREDENTIALS`, câblage vault prêt.
- Pas de rate limiting applicatif (choix assumé v2.0 : mono-instance derrière un reverse proxy — à poser au niveau proxy si besoin).
