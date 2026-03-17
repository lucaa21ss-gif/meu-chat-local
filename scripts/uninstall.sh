#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOVE_VOLUMES="${1:-}"

if [[ "$REMOVE_VOLUMES" == "--purge" ]]; then
  docker compose -f "$ROOT_DIR/docker-compose.yml" down -v
  echo "[uninstall] Servicos removidos com volumes."
  exit 0
fi

docker compose -f "$ROOT_DIR/docker-compose.yml" down
echo "[uninstall] Servicos removidos (volumes preservados)."
echo "[uninstall] Use --purge para remover tambem os dados locais."