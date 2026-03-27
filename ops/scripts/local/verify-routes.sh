#!/usr/bin/env bash
set -euo pipefail

# Verificacao operacional local de rotas web publicas e painel admin.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
API_ENTRY="$ROOT_DIR/apps/api/src/entrypoints/index.js"
LOG_DIR="$ROOT_DIR/artifacts/diagnostics"
LOG_FILE="$LOG_DIR/verify-routes.log"
PORT="${PORT:-3199}"
LOG_PRETTY="${LOG_PRETTY:-true}"
BOOT_WAIT_SEC="${BOOT_WAIT_SEC:-2}"

mkdir -p "$LOG_DIR"

if [[ ! -f "$API_ENTRY" ]]; then
  echo "[verify-routes] ERRO: entrypoint nao encontrado em $API_ENTRY" >&2
  exit 1
fi

cleanup() {
  if [[ -n "${PID:-}" ]]; then
    kill -TERM "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

cd "$ROOT_DIR"
LOG_PRETTY="$LOG_PRETTY" PORT="$PORT" node "$API_ENTRY" >"$LOG_FILE" 2>&1 &
PID=$!

sleep "$BOOT_WAIT_SEC"

if ! kill -0 "$PID" 2>/dev/null; then
  echo "[verify-routes] ERRO: processo da API encerrou antes dos checks (possivel EADDRINUSE)." >&2
  echo "[verify-routes] Veja log: artifacts/diagnostics/verify-routes.log" >&2
  exit 1
fi

check_route() {
  local route="$1"
  local expected="$2"
  local body_file
  body_file="$(mktemp)"
  local code

  code="$(curl -s -o "$body_file" -w "%{http_code}" --max-time 5 "http://localhost:${PORT}${route}")"
  if [[ "$code" != "200" ]]; then
    echo "[verify-routes] ERRO: ${route} retornou HTTP ${code}" >&2
    rm -f "$body_file"
    exit 1
  fi

  if ! grep -Fq "$expected" "$body_file"; then
    echo "[verify-routes] ERRO: ${route} nao contem marcador esperado (${expected})." >&2
    rm -f "$body_file"
    exit 1
  fi

  rm -f "$body_file"
  echo "[verify-routes] OK: ${route}"
}

check_route "/" "<!doctype html>"
check_route "/app" "<!doctype html>"
check_route "/admin" "<!doctype html>"

kill -TERM "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
PID=""

echo "[verify-routes] OK"
echo "[verify-routes] log => artifacts/diagnostics/verify-routes.log"
