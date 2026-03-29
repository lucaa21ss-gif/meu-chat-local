#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_DIR="$ROOT_DIR/artifacts/diagnostics"
LOG_FILE="$LOG_DIR/dev-smoke.log"
API_URL="${API_URL:-http://localhost:4000/api/health}"
WEB_URL="${WEB_URL:-http://localhost:5173}"
BOOT_WAIT_SEC="${BOOT_WAIT_SEC:-1}"
BOOT_RETRIES="${BOOT_RETRIES:-30}"

mkdir -p "$LOG_DIR"

START_PID=""

cleanup() {
  if [[ -n "$START_PID" ]]; then
    kill -TERM "$START_PID" 2>/dev/null || true
    wait "$START_PID" 2>/dev/null || true
  fi

  cd "$ROOT_DIR"
  npm run dev:stop >/dev/null 2>&1 || true
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local attempt=1

  while [[ "$attempt" -le "$BOOT_RETRIES" ]]; do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "[dev-smoke] OK: $label disponivel em $url"
      return 0
    fi

    sleep "$BOOT_WAIT_SEC"
    attempt=$((attempt + 1))
  done

  echo "[dev-smoke] ERRO: $label indisponivel em $url apos ${BOOT_RETRIES} tentativas" >&2
  return 1
}

trap cleanup EXIT

cd "$ROOT_DIR"

echo "[dev-smoke] Iniciando ambiente local"
npm run dev:start >"$LOG_FILE" 2>&1 &
START_PID=$!

wait_for_url "$API_URL" "API"
wait_for_url "$WEB_URL" "WEB"

API_RESPONSE="$(curl -fsS --max-time 5 "$API_URL")"
WEB_RESPONSE="$(curl -fsS --max-time 5 "$WEB_URL")"

if [[ "$API_RESPONSE" != *'"status":"ok"'* \
   && "$API_RESPONSE" != *'"status":"healthy"'* \
   && "$API_RESPONSE" != *'"status":"degraded"'* ]]; then
  echo "[dev-smoke] ERRO: resposta inesperada da API: $API_RESPONSE" >&2
  exit 1
fi

if [[ "$WEB_RESPONSE" != *'<title>'* && "$WEB_RESPONSE" != *'id="root"'* ]]; then
  echo "[dev-smoke] ERRO: resposta inesperada do WEB" >&2
  exit 1
fi

echo "[dev-smoke] OK: API e WEB responderam corretamente"
echo "[dev-smoke] Log: artifacts/diagnostics/dev-smoke.log"