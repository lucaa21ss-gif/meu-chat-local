#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

if ! command -v curl >/dev/null 2>&1; then
  echo "[dist:status] ERRO: curl nao encontrado para checks HTTP." >&2
  exit 1
fi

ensure_docker_environment "dist:status"

echo "[dist:status] Containers (compose ps):"
docker compose -f "$COMPOSE_FILE" ps

echo
echo "[dist:status] Endpoints:"

check_code() {
  local label="$1"
  local url="$2"
  local code

  code="$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" || true)"
  if [[ "$code" == "200" ]]; then
    echo "  - ${label}: OK (200)"
  else
    echo "  - ${label}: FAIL (${code:-sem resposta})"
  fi
}

check_code "api-healthz" "http://localhost:4000/healthz"
check_code "api-readyz" "http://localhost:4000/readyz"
check_code "web-healthz" "http://localhost:4173/healthz"
check_code "web-root" "http://localhost:4173/"
check_code "web-proxy-api" "http://localhost:4173/api/health/public"
