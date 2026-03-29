#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

if ! command -v curl >/dev/null 2>&1; then
  echo "[dist:smoke] ERRO: curl nao encontrado para validacao de endpoints." >&2
  exit 1
fi

ensure_docker_environment "dist:smoke"

check_contains() {
  local label="$1"
  local url="$2"
  local expected_fragment="$3"

  local body
  body="$(curl -s --max-time 6 "$url" || true)"

  if [[ -z "$body" || "$body" != *"$expected_fragment"* ]]; then
    echo "[dist:smoke] ERRO: ${label} invalido em ${url}" >&2
    echo "[dist:smoke] Resposta: ${body:-<vazia>}" >&2
    return 1
  fi

  echo "[dist:smoke] OK: ${label}"
}

check_contains "api-healthz" "http://localhost:4000/healthz" '"status":"ok"'
check_contains "api-readyz" "http://localhost:4000/readyz" '"status":"ready"'
check_contains "api-public-health" "http://localhost:4000/api/health/public" '"status"'
check_contains "web-healthz" "http://localhost:4173/healthz" "ok"
check_contains "web-root" "http://localhost:4173/" "<!doctype html>"
check_contains "web-proxy-api" "http://localhost:4173/api/health/public" '"status"'

echo "[dist:smoke] OK: stack Docker validada (api + web + proxy)."
