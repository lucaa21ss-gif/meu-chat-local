#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_DIR="$ROOT_DIR/artifacts/diagnostics"
MODE="${1:-latest}"
TARGET="${2:-}"

resolve_latest_log() {
  find "$LOG_DIR" -maxdepth 1 -type f | sort | tail -n 1
}

resolve_target_log() {
  if [[ -n "$TARGET" ]]; then
    echo "$LOG_DIR/$TARGET"
    return 0
  fi

  resolve_latest_log
}

ensure_log_dir() {
  mkdir -p "$LOG_DIR"
}

ensure_log_dir

case "$MODE" in
  list)
    echo "[dev-logs] Logs em $LOG_DIR"
    find "$LOG_DIR" -maxdepth 1 -type f | sort
    ;;
  latest)
    LOG_FILE="$(resolve_target_log)"
    if [[ -z "$LOG_FILE" || ! -f "$LOG_FILE" ]]; then
      echo "[dev-logs] Nenhum log encontrado" >&2
      exit 1
    fi
    echo "[dev-logs] Exibindo: $LOG_FILE"
    tail -n 80 "$LOG_FILE"
    ;;
  tail)
    LOG_FILE="$(resolve_target_log)"
    if [[ -z "$LOG_FILE" || ! -f "$LOG_FILE" ]]; then
      echo "[dev-logs] Log alvo nao encontrado" >&2
      exit 1
    fi
    echo "[dev-logs] Exibindo ultimas 80 linhas: $LOG_FILE"
    tail -n 80 "$LOG_FILE"
    ;;
  follow)
    LOG_FILE="$(resolve_target_log)"
    if [[ -z "$LOG_FILE" || ! -f "$LOG_FILE" ]]; then
      echo "[dev-logs] Log alvo nao encontrado" >&2
      exit 1
    fi
    echo "[dev-logs] Seguindo log: $LOG_FILE"
    tail -n 80 -f "$LOG_FILE"
    ;;
  *)
    echo "[dev-logs] Uso: bash ops/scripts/local/dev-logs.sh [list|latest|tail|follow] [arquivo.log]" >&2
    exit 2
    ;;
esac