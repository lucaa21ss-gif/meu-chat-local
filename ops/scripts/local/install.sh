#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
DRY_RUN="${1:-}"
INTEGRITY_FILE="$ROOT_DIR/.integrity-manifest.sha256"
INTEGRITY_SIG_FILE="$ROOT_DIR/.integrity-manifest.sig"
INTEGRITY_PUB_FILE="$ROOT_DIR/.integrity-manifest.pub"

run_cmd() {
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

verify_integrity() {
  if [[ ! -f "$INTEGRITY_FILE" && ! -f "$INTEGRITY_SIG_FILE" && ! -f "$INTEGRITY_PUB_FILE" ]]; then
    echo "[warn] Manifesto de integridade ausente. Prosseguindo em modo de desenvolvimento."
    return 0
  fi

  if [[ ! -f "$INTEGRITY_FILE" || ! -f "$INTEGRITY_SIG_FILE" || ! -f "$INTEGRITY_PUB_FILE" ]]; then
    echo "[erro] Arquivos de integridade incompletos (.sha256/.sig/.pub)."
    exit 1
  fi

  if ! command -v sha256sum >/dev/null 2>&1; then
    echo "[erro] sha256sum nao encontrado para validar integridade."
    exit 1
  fi

  if ! command -v openssl >/dev/null 2>&1; then
    echo "[erro] openssl nao encontrado para validar assinatura."
    exit 1
  fi

  echo "[install] Validando assinatura do manifesto de integridade..."
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[dry-run] openssl dgst -sha256 -verify $INTEGRITY_PUB_FILE -signature $INTEGRITY_SIG_FILE $INTEGRITY_FILE"
  else
    openssl dgst -sha256 \
      -verify "$INTEGRITY_PUB_FILE" \
      -signature "$INTEGRITY_SIG_FILE" \
      "$INTEGRITY_FILE" >/dev/null
  fi

  echo "[install] Validando checksums dos arquivos criticos..."
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[dry-run] (cd $ROOT_DIR && sha256sum -c .integrity-manifest.sha256)"
  else
    (cd "$ROOT_DIR" && sha256sum -c "$(basename "$INTEGRITY_FILE")" >/dev/null)
  fi

  echo "[install] Integridade validada com sucesso."
}

if ! command -v docker >/dev/null 2>&1; then
  echo "[erro] Docker nao encontrado. Instale Docker antes de continuar."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[erro] Docker Compose (plugin) nao encontrado."
  exit 1
fi

verify_integrity

echo "[install] Subindo servicos com Docker Compose..."
run_cmd docker compose -f "$COMPOSE_FILE" up --build -d

echo "[install] Concluido. Acesse: http://localhost:4000"
echo "[install] Produto: http://localhost:4000/produto"
echo "[install] Guia: http://localhost:4000/guia"