#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
REMOVE_VOLUMES="${1:-}"

if [[ "$REMOVE_VOLUMES" == "--purge" ]]; then
  docker compose -f "$COMPOSE_FILE" down -v
  echo "[uninstall] Servicos removidos com volumes."
  exit 0
fi

docker compose -f "$COMPOSE_FILE" down
echo "[uninstall] Servicos removidos (volumes preservados)."
echo "[uninstall] Use --purge para remover tambem os dados locais."