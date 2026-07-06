#!/usr/bin/env bash
# Suite E2E complète en conditions de production : base réinitialisée,
# build standalone servi tel quel (comme la CI). Usage : bash scripts/e2e-full.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL="${DATABASE_URL:-$(grep -E '^DATABASE_URL=' .env | cut -d'"' -f2)}"
DB_NAME="${DB_URL##*/}"
ADMIN_URL="${DB_URL%/*}/postgres"

echo "── Reset base ($DB_NAME)"
psql "$ADMIN_URL" -q -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid<>pg_backend_pid();" >/dev/null
psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS $DB_NAME;" -c "CREATE DATABASE $DB_NAME;"
npm run db:migrate >/dev/null
npm run db:seed

echo "── Build standalone"
rm -rf .next
npm run build >/dev/null
cp -r .next/static .next/standalone/.next/static
if [ -d public ]; then cp -r public .next/standalone/public; fi

echo "── E2E (standalone)"
export CRON_SECRET="${CRON_SECRET:-e2e-cron-secret}"
PW_PROD=1 npx playwright test "$@"
