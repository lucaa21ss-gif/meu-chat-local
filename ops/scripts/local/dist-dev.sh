#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

if ! command -v curl >/dev/null 2>&1; then
  echo "[dist:dev] ERRO: curl nao encontrado para validar endpoints." >&2
  exit 1
fi

wait_for_http() {
  local label="$1"
  local url="$2"
  local expected_fragment="$3"
  local timeout_sec="${4:-120}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local body
    
    body="$(curl -s --max-time 5 "$url" || true)"

    if [[ -n "$body" && "$body" == *"$expected_fragment"* ]]; then
      echo "[dist:dev] OK: ${label}"
      return 0
    fi

    if (( $(date +%s) - started_at >= timeout_sec )); then
      echo "[dist:dev] ERRO: timeout aguardando ${label} (${url})" >&2
      echo "[dist:dev] Ultima resposta: ${body:-<vazia>}" >&2
      return 1
    fi

    sleep 2
  done
}

ensure_docker_environment "dist:dev"

echo "[dist:dev] Subindo ambiente DEV com hot reload..."
docker compose -f "$COMPOSE_FILE" --profile dev up -d ollama server-dev web-dev

echo "[dist:dev] Aguardando prontidao dos servicos..."
wait_for_http "api-healthz" "http://localhost:4000/healthz" '"status":"ok"'
wait_for_http "web-root" "http://localhost:5173/" "<!doctype html>"
wait_for_http "web-proxy-api" "http://localhost:5173/api/health/public" '"status"'

echo "[dist:dev] Ambiente pronto."
echo "[dist:dev] Web: http://localhost:5173"
echo "[dist:dev] API: http://localhost:4000"
