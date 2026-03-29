#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

ensure_docker_environment "dist:logs"

MODE="${1:-tail}"
SERVICE="${2:-}"

case "$MODE" in
  tail)
    if [[ -n "$SERVICE" ]]; then
      docker compose -f "$COMPOSE_FILE" logs --tail=200 "$SERVICE"
    else
      docker compose -f "$COMPOSE_FILE" logs --tail=200
    fi
    ;;
  follow)
    if [[ -n "$SERVICE" ]]; then
      docker compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
    else
      docker compose -f "$COMPOSE_FILE" logs -f
    fi
    ;;
  *)
    echo "[dist:logs] Uso: bash ops/scripts/local/dist-logs.sh [tail|follow] [service]" >&2
    exit 1
    ;;
esac
