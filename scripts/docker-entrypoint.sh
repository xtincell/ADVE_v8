#!/bin/sh
# Boot du conteneur : migrations d'abord (idempotentes), puis le serveur standalone.
set -e

echo "── La Fusée v2 — prisma migrate deploy"
PRISMA="${PRISMA_CLI:-/opt/prisma-cli/node_modules/.bin/prisma}"
"$PRISMA" migrate deploy --schema prisma/schema.prisma

echo "── serveur (node server.js sur :${PORT:-3000})"
exec node server.js
