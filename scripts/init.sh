#!/usr/bin/env bash
# Amorce une machine de dev en une commande : deps → env → migrations → seeds.
# Prérequis : Node 22+, un Postgres 16 accessible.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "── La Fusée v2 — init dev"

if ! command -v node >/dev/null || [[ "$(node -v | cut -c2-3)" -lt 22 ]]; then
  echo "✗ Node 22+ requis (trouvé : $(node -v 2>/dev/null || echo 'aucun'))" && exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  SECRET=$(openssl rand -base64 32)
  sed -i.bak "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"${SECRET}\"|" .env && rm -f .env.bak
  echo "→ .env créé depuis .env.example (NEXTAUTH_SECRET généré)."
  echo "  Vérifie DATABASE_URL puis relance ce script si besoin."
fi

echo "→ npm install"
npm install --no-audit --no-fund

echo "→ migrations"
npm run db:migrate

echo "→ seeds (idempotents)"
npm run db:seed

echo "✓ Prêt. Lance : npm run dev"
