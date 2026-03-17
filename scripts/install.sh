#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN="${1:-}"

run_cmd() {
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

if ! command -v docker >/dev/null 2>&1; then
  echo "[erro] Docker nao encontrado. Instale Docker antes de continuar."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[erro] Docker Compose (plugin) nao encontrado."
  exit 1
fi

echo "[install] Subindo servicos com Docker Compose..."
run_cmd docker compose -f "$ROOT_DIR/docker-compose.yml" up --build -d

echo "[install] Concluido. Acesse: http://localhost:3001"
echo "[install] Produto: http://localhost:3001/produto"
echo "[install] Guia: http://localhost:3001/guia"