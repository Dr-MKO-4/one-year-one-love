#!/usr/bin/env bash
# One Year, One Love : démarrage local (macOS / Linux / Git Bash)
#
#   ./start-local.sh            base Postgres Docker + migrations + contenus + serveurs de dev
#   ./start-local.sh --skip-db  utilise le DATABASE_URL du fichier .env
#   ./start-local.sh --prod     construit et lance l'image de production (port 8080)
set -euo pipefail
cd "$(dirname "$0")"

step() { printf '\n\033[35m>> %s\033[0m\n' "$1"; }
SKIP_DB=0; PROD=0
for a in "$@"; do
  case "$a" in
    --skip-db) SKIP_DB=1 ;;
    --prod) PROD=1 ;;
    *) echo "Option inconnue : $a"; exit 1 ;;
  esac
done

printf '\n\033[31m  One Year, One Love  ·  Our Love Games\033[0m\n'

if [ ! -f .env ]; then
  step "Création du fichier .env à partir de .env.example"
  cp .env.example .env
  echo "   Pense à personnaliser MIGUEL_PIN, ADELE_PIN et JWT_SECRET dans .env"
fi

if [ "$PROD" = 1 ]; then
  step "Construction et lancement de l'image de production"
  exec docker compose --profile app up --build
fi

command -v node >/dev/null || { echo "Node.js 20+ est requis."; exit 1; }
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || { echo "Node.js 20+ est requis."; exit 1; }

if [ "$SKIP_DB" = 0 ]; then
  command -v docker >/dev/null || { echo "Docker est requis (ou utilise --skip-db)."; exit 1; }
  docker info >/dev/null 2>&1 || { echo "Docker ne répond pas : lance Docker puis réessaie."; exit 1; }
  step "Démarrage de PostgreSQL (docker compose, port 5433)"
  docker compose up -d db
  printf '   Attente de la base'
  for _ in $(seq 1 60); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' love-db 2>/dev/null)" = healthy ] && break
    printf '.'; sleep 1
  done
  echo
fi

if [ ! -d node_modules ]; then
  step "Installation des dépendances"
  npm install --no-audit --no-fund
fi

step "Migrations de la base"
npm run db:deploy

step "Contenus initiaux (uniquement si la base est vide)"
npm run db:seed

step "Lancement : API sur http://localhost:4000, site sur http://localhost:5173"
echo "   Ctrl+C pour arrêter."
npm run dev
