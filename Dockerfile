# syntax=docker/dockerfile:1
# Image de production unique : Express sert l'API, le temps réel (socket.io) et le front React compilé.

FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# 1. Dépendances (couche mise en cache tant que les package.json ne changent pas)
FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY server/prisma server/prisma
RUN npm ci --no-audit --no-fund

# 2. Compilation du client (Vite) et du serveur (esbuild)
FROM deps AS build
COPY . .
RUN npm run build \
  && npm prune --omit=dev --no-audit --no-fund \
  && npx prisma generate --schema server/prisma/schema.prisma

# 3. Image d'exécution
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=8080 \
    MUSIC_DIR=/music
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server/package.json ./server/package.json
COPY --from=build --chown=node:node /app/server/prisma ./server/prisma
COPY --from=build --chown=node:node /app/server/dist ./server/dist
COPY --from=build --chown=node:node /app/client/dist ./client/dist
# Dossier musique : en production, un volume Railway est monté ici (voir README).
RUN mkdir -p /music && chown node:node /music
USER node
EXPOSE 8080
# Applique les migrations puis démarre (les contenus initiaux sont ajoutés automatiquement si la base est vide).
CMD ["sh", "-c", "npx prisma migrate deploy --schema server/prisma/schema.prisma && node --enable-source-maps server/dist/index.js"]
