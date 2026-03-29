#!/usr/bin/env bash

set -euo pipefail

NO_OPEN="false"
if [[ "${1:-}" == "--no-open" ]]; then
  NO_OPEN="true"
fi

APP_URL="http://localhost:4173"
API_URL="http://localhost:4000"
HEALTH_URL="http://localhost:4000/healthz"

echo "[dist:open] URLs"
echo "  - Web: ${APP_URL}"
echo "  - API: ${API_URL}"
echo "  - Health: ${HEALTH_URL}"

if [[ "$NO_OPEN" == "true" ]]; then
  exit 0
fi

open_url() {
  local url="$1"

  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
    return
  fi

  if command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
    return
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "Start-Process '$url'" >/dev/null 2>&1 || true
    return
  fi

  echo "[dist:open] Aviso: nao foi encontrado comando para abrir navegador automaticamente."
}

open_url "$APP_URL"
