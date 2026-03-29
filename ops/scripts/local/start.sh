#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"

source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

wait_for_http() {
  local label="$1"
  local url="$2"
  local expected_fragment="$3"
  local timeout_sec="${4:-90}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local body
    body="$(curl -s --max-time 4 "$url" || true)"
    if [[ -n "$body" && "$body" == *"$expected_fragment"* ]]; then
      echo "[start] OK: ${label}"
      return 0
    fi

    if (( $(date +%s) - started_at >= timeout_sec )); then
      echo "[start] ERRO: timeout aguardando ${label} (${url})" >&2
      echo "[start] Ultima resposta: ${body:-<vazia>}" >&2
      return 1
    fi

    sleep 2
  done
}

if ! command -v curl >/dev/null 2>&1; then
  echo "[start] ERRO: curl nao encontrado para validar endpoints." >&2
  exit 1
fi

ensure_docker_environment "start"

docker compose -f "$COMPOSE_FILE" up -d

wait_for_http "healthz" "http://localhost:4000/healthz" '"status":"ok"'
wait_for_http "readyz" "http://localhost:4000/readyz" '"status":"ready"'
wait_for_http "web" "http://localhost:4173/healthz" "ok"

echo "[start] Servicos iniciados."