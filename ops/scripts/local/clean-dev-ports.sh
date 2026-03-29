#!/usr/bin/env bash
set -euo pipefail

PORTS=(4000 4173 5173 5174 5175 5176)

echo "[clean-dev-ports] Limpando portas: ${PORTS[*]}"

if command -v fuser >/dev/null 2>&1; then
  for p in "${PORTS[@]}"; do
    fuser -k "${p}/tcp" >/dev/null 2>&1 || true
  done
  echo "[clean-dev-ports] Limpeza concluida com fuser"
  exit 0
fi

if command -v lsof >/dev/null 2>&1; then
  for p in "${PORTS[@]}"; do
    lsof -ti "tcp:${p}" | xargs -r kill -9 || true
  done
  echo "[clean-dev-ports] Limpeza concluida com lsof"
  exit 0
fi

echo "[clean-dev-ports] Aviso: fuser/lsof nao encontrados; nenhuma porta foi encerrada" >&2
