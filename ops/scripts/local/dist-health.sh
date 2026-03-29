#!/usr/bin/env bash

set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "[dist:health] ERRO: curl nao encontrado para validacao de endpoints." >&2
  exit 1
fi

check_code() {
  local label="$1"
  local url="$2"
  local expected_code="${3:-200}"
  local code

  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 6 "$url" || true)"
  if [[ "$code" == "$expected_code" ]]; then
    echo "[dist:health] OK: ${label} (${code})"
    return 0
  fi

  echo "[dist:health] ERRO: ${label} retornou ${code:-sem resposta} (esperado ${expected_code})" >&2
  return 1
}

check_code "api-healthz" "http://localhost:4000/healthz"
check_code "api-readyz" "http://localhost:4000/readyz"
check_code "api-public-health" "http://localhost:4000/api/health/public"
check_code "web-healthz" "http://localhost:4173/healthz"
check_code "web-root" "http://localhost:4173/"
check_code "web-proxy-api" "http://localhost:4173/api/health/public"

echo "[dist:health] OK: endpoints da stack responderam corretamente."
