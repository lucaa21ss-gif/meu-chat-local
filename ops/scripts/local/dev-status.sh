#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_DIR="$ROOT_DIR/artifacts/diagnostics"
LATEST_LOG="$(find "$LOG_DIR" -maxdepth 1 -type f 2>/dev/null | sort | tail -n 1 || true)"

check_url() {
  local url="$1"
  if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
    echo "online"
  else
    echo "offline"
  fi
}

echo "[dev-status] Data: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "[dev-status] Root: $ROOT_DIR"

echo
echo "[dev-status] Portas"
bash "$ROOT_DIR/ops/scripts/local/clean-dev-ports.sh" status || true

echo
echo "[dev-status] Endpoints"
echo " - API (4000): $(check_url "http://localhost:4000/api/health")"

WEB_STATUS="offline"
WEB_PORT=""
for port in 5173 5174 5175 5176; do
  if [[ "$(check_url "http://localhost:${port}")" == "online" ]]; then
    WEB_STATUS="online"
    WEB_PORT="$port"
    break
  fi
done

if [[ -n "$WEB_PORT" ]]; then
  echo " - WEB ($WEB_PORT): $WEB_STATUS"
else
  echo " - WEB (5173-5176): $WEB_STATUS"
fi

echo
echo "[dev-status] Logs"
if [[ -n "$LATEST_LOG" && -f "$LATEST_LOG" ]]; then
  echo " - ultimo log: $LATEST_LOG"
  tail -n 20 "$LATEST_LOG"
else
  echo " - nenhum log encontrado em $LOG_DIR"
fi