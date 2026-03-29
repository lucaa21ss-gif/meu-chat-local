#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_DIR="$ROOT_DIR/artifacts/diagnostics"
LOG_FILE="$LOG_DIR/dev-open.log"
NO_OPEN=0
START_IF_NEEDED=1
BOOT_WAIT_SEC="${BOOT_WAIT_SEC:-1}"
BOOT_RETRIES="${BOOT_RETRIES:-30}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-open)
      NO_OPEN=1
      ;;
    --no-start)
      START_IF_NEEDED=0
      ;;
    *)
      echo "[dev-open] argumento desconhecido: $1" >&2
      exit 2
      ;;
  esac
  shift
done

mkdir -p "$LOG_DIR"

find_web_url() {
  local port
  for port in 5173 5174 5175 5176; do
    if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 2 "http://localhost:${port}" >/dev/null 2>&1; then
      echo "http://localhost:${port}"
      return 0
    fi
  done

  return 1
}

wait_for_web_url() {
  local attempt=1
  local url=""

  while [[ "$attempt" -le "$BOOT_RETRIES" ]]; do
    if url="$(find_web_url)"; then
      echo "$url"
      return 0
    fi

    sleep "$BOOT_WAIT_SEC"
    attempt=$((attempt + 1))
  done

  return 1
}

open_url() {
  local url="$1"

  if [[ $NO_OPEN -eq 1 ]]; then
    echo "[dev-open] URL: $url"
    return 0
  fi

  if command -v wslview >/dev/null 2>&1; then
    nohup wslview "$url" >/dev/null 2>&1 &
    echo "[dev-open] Aberto com wslview: $url"
    return 0
  fi

  if command -v xdg-open >/dev/null 2>&1; then
    nohup xdg-open "$url" >/dev/null 2>&1 &
    echo "[dev-open] Aberto com xdg-open: $url"
    return 0
  fi

  if command -v open >/dev/null 2>&1; then
    nohup open "$url" >/dev/null 2>&1 &
    echo "[dev-open] Aberto com open: $url"
    return 0
  fi

  echo "[dev-open] Nenhum opener encontrado; URL: $url"
}

WEB_URL=""
if WEB_URL="$(find_web_url)"; then
  open_url "$WEB_URL"
  exit 0
fi

if [[ $START_IF_NEEDED -eq 0 ]]; then
  echo "[dev-open] WEB nao esta em execucao e --no-start foi informado" >&2
  exit 1
fi

echo "[dev-open] WEB nao encontrado; iniciando ambiente local"
cd "$ROOT_DIR"
nohup npm run dev:start >"$LOG_FILE" 2>&1 &

if ! WEB_URL="$(wait_for_web_url)"; then
  echo "[dev-open] ERRO: frontend nao ficou disponivel; veja $LOG_FILE" >&2
  exit 1
fi

open_url "$WEB_URL"