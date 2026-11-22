<#
  One Year, One Love : démarrage local (Windows / PowerShell)

  Usage :
    .\start-local.ps1            # base Postgres Docker + migrations + contenus + serveurs de dev
    .\start-local.ps1 -SkipDb    # utilise le DATABASE_URL du fichier .env (Postgres déjà installé)
    .\start-local.ps1 -Prod      # construit et lance l'image de production (docker compose, port 8080)
#>
param(
  [switch]$SkipDb,
  [switch]$Prod
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Magenta }
function Test-Cmd($name) { return [bool](Get-Command $name -ErrorAction SilentlyContinue) }

Write-Host "`n  One Year, One Love  ·  Our Love Games`n" -ForegroundColor Red

if (-not (Test-Path .env)) {
  Write-Step "Création du fichier .env à partir de .env.example"
  Copy-Item .env.example .env
  Write-Host "   Pense à personnaliser MIGUEL_PIN, ADELE_PIN et JWT_SECRET dans .env" -ForegroundColor Yellow
}

if ($Prod) {
  if (-not (Test-Cmd docker)) { throw "Docker est requis pour le mode -Prod." }
  Write-Step "Construction et lancement de l'image de production"
  docker compose --profile app up --build
  exit $LASTEXITCODE
}

if (-not (Test-Cmd node)) { throw "Node.js 20 ou plus est requis : https://nodejs.org" }
$major = [int]((node -v).TrimStart('v').Split('.')[0])
if ($major -lt 20) { throw "Node.js 20 ou plus est requis (version actuelle : $(node -v))." }

if (-not $SkipDb) {
  if (-not (Test-Cmd docker)) { throw "Docker est requis pour la base locale (ou relance avec -SkipDb et ton propre Postgres)." }
  docker info *> $null
  if ($LASTEXITCODE -ne 0) { throw "Docker ne répond pas : lance Docker Desktop puis réessaie." }
  Write-Step "Démarrage de PostgreSQL (docker compose, port 5433)"
  docker compose up -d db
  if ($LASTEXITCODE -ne 0) { throw "Impossible de démarrer la base." }
  Write-Host "   Attente de la base" -NoNewline
  for ($i = 0; $i -lt 60; $i++) {
    $health = docker inspect -f '{{.State.Health.Status}}' love-db 2>$null
    if ($health -eq 'healthy') { break }
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
  }
  Write-Host " $health"
  if ($health -ne 'healthy') { throw "La base n'est pas prête." }
}

if (-not (Test-Path node_modules)) {
  Write-Step "Installation des dépendances"
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm install a échoué." }
}

Write-Step "Migrations de la base"
npm run db:deploy
if ($LASTEXITCODE -ne 0) { throw "Les migrations ont échoué (vérifie DATABASE_URL dans .env)." }

Write-Step "Contenus initiaux (uniquement si la base est vide)"
npm run db:seed
if ($LASTEXITCODE -ne 0) { throw "Le remplissage initial a échoué." }

Write-Step "Lancement : API sur http://localhost:4000, site sur http://localhost:5173"
Write-Host "   Sur ton téléphone (même Wi-Fi) : http://<IP-de-ce-PC>:5173" -ForegroundColor DarkGray
Write-Host "   Ctrl+C pour arrêter.`n" -ForegroundColor DarkGray
Start-Job -ScriptBlock { Start-Sleep -Seconds 6; Start-Process "http://localhost:5173" } | Out-Null
npm run dev
