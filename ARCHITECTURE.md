# ARCHITECTURE — La Fusée v2

Spécification de référence : [CAHIER-DES-CHARGES.md](./CAHIER-DES-CHARGES.md). Ce document tient en une page et décrit le **comment** ; le cahier décrit le **quoi**.

## Stack

| Couche | Choix | Note |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript strict** | `output: standalone`, runtime Node partout, zéro edge |
| Couche API | **Server Actions (mutations) + Route Handlers (contrats HTTP)** | Pas de tRPC : les Server Components lisent directement les services, les mutations passent par des actions typées Zod ; les route handlers sont réservés aux vrais contrats HTTP (webhooks, SSE, crons, MCP, intake token). Moins de couches, moins de dépendances, même sécurité de types. |
| DB | **PostgreSQL ≥ 16 + Prisma 6** | scoping tenant via helpers `db/scoped.ts` |
| Auth | **NextAuth v5** — credentials bcrypt + Google conditionnel, sessions JWT, TOTP (otplib) obligatoire ADMIN | god-mode par `GOD_MODE_EMAILS` |
| UI | **Tailwind CSS 4 + CVA** | tokens CSS 2 niveaux (référence → sémantique) dans `globals.css` |
| PDF | **PDFKit** (pile unique, zéro Chromium) | Oracle + rapport intake |
| Validation | **Zod** aux frontières (formulaires, APIs externes, sorties LLM) | |
| Tests | **Vitest** (domaine) + **Playwright** (E2E parcours d'argent) | |
| LLM | Gateway `fetch` multi-provider (Anthropic→OpenAI→Ollama→OpenRouter), optionnel au runtime | coûts journalisés en DB |

## Modules serveur (`src/server/`)

`auth` · `tenancy` · `brands` (ADVE/RTIS, point d'écriture unique `amendPillar()`) · `scoring` (déterministe pur) · `intake` · `oracle` (35 sections, mappers déterministes + enrichisseur LLM optionnel) · `pdf` · `billing` (offres, grille localisée, gates, abonnements) · `payments` (providers : stripe, manual-whatsapp, wave, mtn-momo, orange-money, cinetpay, paypal — `DEFERRED` sans clés) · `guild` (missions, candidatures, devis) · `talents` · `notifications` (SSE broker in-memory, push VAPID, email cascade Resend→Mailgun→SendGrid, digest) · `intelligence` (snapshots, feeds World Bank/RSS, radar heuristique) · `assets` (forge/vault) · `mcp` (endpoint unique + clés + relevés) · `llm` (gateway) · `vault` (credentials opérateur chiffrés AES-256-GCM) · `audit` · `settings` — ≈ 19 modules (budget ≤ 25).

## Modèle de données (~38 tables, budget ≤ 60)

Operator, User, Account, Brand, Pillar, PillarVersion, BrandSnapshot, BrandSource, IntakeSession, OracleReport, OracleSection, BrandAsset, Country, PriceRule, Subscription, Payment, WebhookEvent, Invoice, Credential, Mission, MissionApplication, TalentProfile, AgencyProfile, Earning, Dispute, Notification, PushSubscription, EmailLog, CommunityMember, MarketSignal, BrandAction, BrandRequest, McpApiKey, McpCall, McpStatement, LlmCall, AuditLog, Setting.

Principes : les 8 piliers = 8 lignes `Pillar` par marque, champs en JSON `{key: {value, certainty, updatedAt}}` versionnés dans `PillarVersion` ; score composite /200 = Σ 8 piliers /25 ; tout snapshot historisé dans `BrandSnapshot`.

## Surfaces (`src/app/`)

`(public)` funnel + marketing + légal + guilde · `(cockpit)/cockpit` founder · `(console)/console` operator · `(creator)/creator` · `(agency)/agency` · `api/` (auth, webhooks/[provider], sse, cron/*, mcp, intake).

## Conventions

- Français d'abord (UI, données, seeds) ; i18n dictionnaire simple `src/i18n/fr.ts` prêt pour EN.
- Honest-empty : composant `EmptyState` systématique ; jamais de donnée inventée.
- Manual-first : chaque action LLM a son formulaire manuel, mêmes endpoints.
- Toute mutation sensible → `audit.log()` (une table, simple).
- Config 100 % env (`src/env.ts` valide au démarrage) ; secrets opérateur → vault DB chiffré.
- Mono-instance assumé : SSE/caches en mémoire derrière des interfaces remplaçables.
