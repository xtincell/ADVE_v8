# La Fusée v2

**Industry OS de stratégie de marque pour l'industrie créative d'Afrique francophone**, par UPgraders.
Funnel de diagnostic public → scoring déterministe /200 (méthode ADVE/RTIS) → rapport Oracle 35 sections + PDF → cockpit d'abonnement (intelligence, forge d'assets) → Guilde (marketplace de missions) → Console opérateur → API MCP facturable.

Trois doctrines structurent tout le code :

- **Honest-empty** — l'app n'invente jamais une donnée : un manque s'affiche comme un manque (`INSUFFISANT`, `DEFERRED_AWAITING_CREDENTIALS`), jamais comblé au jugé.
- **Manual-first** — toute capacité assistée par IA a son équivalent manuel qui passe par les mêmes endpoints ; l'IA propose, l'humain valide.
- **LLM optionnel au runtime** — sans aucune clé LLM, 100 % du périmètre déterministe fonctionne (le banc E2E complet tourne sans clé).

## Installation en 5 minutes

Prérequis : **Node 22+** et un **PostgreSQL 16** accessible.

```bash
git clone <repo> && cd ADVE_v8
bash scripts/init.sh     # .env généré, npm install, migrations, seeds idempotents
npm run dev              # → http://localhost:3000
```

`scripts/init.sh` crée `.env` depuis `.env.example` (seul `DATABASE_URL` est à vérifier). Les trois variables **requises** : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_BASE_URL` — tout le reste est optionnel et documenté dans [.env.example](.env.example).

### Comptes de démonstration (seeds)

| Email | Mot de passe | Rôle / état |
| --- | --- | --- |
| `fondateur@demo.test` | `demo1234` | Founder, marque Nyama Café, abonnement Cockpit **actif**, Oracle payé |
| `attente@demo.test` | `demo1234` | Founder, paiement manuel WhatsApp **en attente de validation** |
| `gratuit@demo.test` | `demo1234` | Founder sans abonnement (gates premium fermés) |
| `talent@demo.test` | `demo1234` | Talent Guilde (espace Creator) |
| `agence@demo.test` | `demo1234` | Agence (espace Agency) |
| `ops@demo.test` | `demo1234` | Opératrice (Console, sans MFA) |
| `xtincell@gmail.com` | `Fusee!2026-admin` | Admin god-mode (MFA TOTP exigée à la première connexion) |

## Déploiement

Le contrat de portabilité : **config 100 % env, build pur** (aucun accès réseau/DB au build), artefact `standalone`. Trois modes, du plus simple au plus packagé :

### 1. Node + pm2

```bash
npm ci
npm run build:standalone           # build + statiques copiées dans l'artefact
npm run db:migrate                 # prisma migrate deploy
npm run db:seed                    # idempotent (opérateur, pays, grille tarifaire…)
pm2 start ecosystem.config.cjs
```

> `instances: 1` est volontaire : le broker SSE des notifications vit en mémoire du processus (contrat mono-instance documenté). L'interface est remplaçable (Redis pub/sub) le jour du multi-pod.

### 2. Docker

```bash
docker build -t la-fusee .
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://…" \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXT_PUBLIC_BASE_URL="https://votre-domaine" \
  la-fusee                          # l'entrypoint exécute prisma migrate deploy puis sert l'app
```

Les seeds (one-off, ils importent le code applicatif) se lancent depuis l'étage builder :

```bash
docker build --target builder -t la-fusee-builder .
docker run --rm -e DATABASE_URL="postgresql://…" la-fusee-builder npm run db:seed
```

### 3. PaaS (Coolify, etc.)

Buildpack Dockerfile → ce repo se déploie tel quel : l'image migre au boot, la config passe par les variables d'environnement du PaaS.

### Crons (obligatoires en production)

Aucun scheduler in-process : quatre endpoints HTTP protégés par `CRON_SECRET` (Bearer), **fail-closed** en production. Exemple crontab :

```cron
0 8 * * 1  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/digest
0 3 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/subscriptions
0 6 * * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/signals
0 4 1 * *  curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/statements
```

### Webhooks de paiement

`POST /api/webhooks/{stripe|wave|mtn_momo|orange_money|cinetpay|paypal}` — signature vérifiée sur corps brut (Stripe, Wave) ou statut re-lu chez le provider avant tout règlement ; idempotents. Les clés mobile money se configurent par opérateur dans **Console → Vault** (chiffrées AES-256-GCM en base), les secrets système (Stripe, DB) restent en env.

## Tests

```bash
npm run typecheck && npm run lint
npm test                     # unitaires (scoring, Oracle, mesures, forge, gateway LLM)
bash scripts/e2e-full.sh     # banc complet : base réinitialisée + build standalone + Playwright
```

Le banc E2E couvre les cinq parcours d'argent de bout en bout : funnel avec paiement test → PDF ; amendement ADVE → refresh RTIS → Oracle → export PDF ; dépôt Guilde → modération → candidature → attribution ; abonnement manuel WhatsApp → validation opérateur → droits ouverts ; notification SSE reçue en direct.

## Carte du code

```
prisma/                 schéma (39 tables), migrations, seeds idempotents
src/app/(public)        funnel, tarifs, légal, Guilde publique, blog markdown
src/app/(cockpit)       produit vendu : marque ADVE/RTIS, livrables (Oracle + forge), intelligence, réglages
src/app/(console)       opérateur : comptes, marques, argent (+ relevés MCP), vault, guilde, config, audit
src/app/(creator|agency) espaces minces talent / agence
src/app/api             SSE, crons, webhooks, MCP, PDF, push, export RGPD
src/server/*            modules métier — UN point d'écriture ADVE (amend.ts), scoring pur,
                        oracle (35 sections), pdf (PDFKit unique), payments (adapters + settle),
                        billing (gates), guild, notifications, intelligence, assets, mcp, llm (gateway), vault
```

Le journal des décisions de construction vit dans [`_build/JOURNAL.md`](_build/JOURNAL.md), l'état du périmètre dans [`_build/LEDGER.json`](_build/LEDGER.json), la spécification dans [`CAHIER-DES-CHARGES.md`](CAHIER-DES-CHARGES.md).
