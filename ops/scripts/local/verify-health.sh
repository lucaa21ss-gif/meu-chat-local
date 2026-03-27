#!/usr/bin/env bash
set -euo pipefail

# Verificacao operacional local: boot + health checks + graceful shutdown.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
API_ENTRY="$ROOT_DIR/apps/api/src/entrypoints/index.js"
LOG_DIR="$ROOT_DIR/artifacts/diagnostics"
LOG_FILE="$LOG_DIR/hardening-e2e.log"
PORT="${PORT:-3099}"
LOG_PRETTY="${LOG_PRETTY:-true}"
BOOT_WAIT_SEC="${BOOT_WAIT_SEC:-2}"

mkdir -p "$LOG_DIR"

if [[ ! -f "$API_ENTRY" ]]; then
  echo "[verify-health] ERRO: entrypoint nao encontrado em $API_ENTRY" >&2
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
  echo "[verify-health] ERRO: processo da API encerrou antes dos checks (possivel EADDRINUSE)." >&2
  echo "[verify-health] Veja log: artifacts/diagnostics/hardening-e2e.log" >&2
  exit 1
fi

HEALTHZ="$(curl -s --max-time 5 "http://localhost:${PORT}/healthz")"
READYZ="$(curl -s --max-time 5 "http://localhost:${PORT}/readyz")"
PUBLIC_HEALTH="$(curl -s --max-time 5 "http://localhost:${PORT}/api/health/public")"

if [[ "$HEALTHZ" != *'"status":"ok"'* ]]; then
  echo "[verify-health] ERRO: /healthz inesperado: $HEALTHZ" >&2
  exit 1
fi

if [[ "$READYZ" != *'"status":"ready"'* ]]; then
  echo "[verify-health] ERRO: /readyz inesperado: $READYZ" >&2
  exit 1
fi

if [[ "$PUBLIC_HEALTH" != *'"status"'* ]]; then
  echo "[verify-health] ERRO: /api/health/public inesperado: $PUBLIC_HEALTH" >&2
  exit 1
fi

kill -TERM "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
PID=""

echo "[verify-health] OK"
echo "[verify-health] /healthz => $HEALTHZ"
echo "[verify-health] /readyz => $READYZ"
echo "[verify-health] /api/health/public => $PUBLIC_HEALTH"
echo "[verify-health] log => artifacts/diagnostics/hardening-e2e.log"
