# syntax=docker/dockerfile:1
# La Fusée v2 — image multi-stage (cahier §11.1 : standalone + Docker + pm2).
# Le runner exécute EXACTEMENT l'artefact que le banc E2E valide à chaque run :
# node .next/standalone/server.js (+ statiques copiées, migrations au boot).

# ── deps : installation propre (postinstall → prisma generate) ────────────────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# ── builder : build Next PUR (aucun réseau, aucune vraie config) ─────────────
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Placeholders de BUILD uniquement : la collecte de données de pages de Next
# importe les modules de routes, dont la config NextAuth qui appelle env() au
# niveau module — le schéma exige la PRÉSENCE de ces 3 clés. Aucune connexion
# n'est ouverte au build (toutes les routes sont dynamiques) et rien ne fuit :
# le runner est un étage séparé, l'env réel est injecté par l'hôte au runtime.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    NEXTAUTH_SECRET="build-placeholder-secret-32-chars!!" \
    NEXT_PUBLIC_BASE_URL="http://localhost:3000"
RUN npm run build

# ── runner : artefact standalone + capacité de migration ─────────────────────
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Blog markdown lu au runtime depuis le cwd (src/server/blog.ts)
COPY --from=builder /app/content ./content

# Migrations au boot : schéma + migrations + CLI prisma ISOLÉE dans /opt
# (la CLI 6.x n'est pas auto-portable, et l'installer dans /app contaminerait
# les node_modules exacts de l'artefact standalone).
COPY --from=builder /app/prisma ./prisma
RUN mkdir -p /opt/prisma-cli && cd /opt/prisma-cli \
  && npm init -y >/dev/null 2>&1 \
  && npm install --no-audit --no-fund prisma@6

COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app /opt/prisma-cli
USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

# Seeds (opérationnel, one-off) : ils importent le code applicatif (tsx + src),
# volontairement absents du runner. Depuis l'étage builder :
#   docker build --target builder -t lafusee-builder .
#   docker run --rm -e DATABASE_URL="..." lafusee-builder npm run db:seed
