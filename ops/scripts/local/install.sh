#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
DRY_RUN="${1:-}"
INTEGRITY_FILE="$ROOT_DIR/.integrity-manifest.sha256"
INTEGRITY_SIG_FILE="$ROOT_DIR/.integrity-manifest.sig"
INTEGRITY_PUB_FILE="$ROOT_DIR/.integrity-manifest.pub"

source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

run_cmd() {
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

wait_for_http() {
  local label="$1"
  local url="$2"
  local expected_fragment="$3"
  local timeout_sec="${4:-120}"
  local started_at
  started_at="$(date +%s)"

  while true; do
    local body
    body="$(curl -s --max-time 4 "$url" || true)"
    if [[ -n "$body" && "$body" == *"$expected_fragment"* ]]; then
      echo "[install] OK: ${label}"
      return 0
    fi

    if (( $(date +%s) - started_at >= timeout_sec )); then
      echo "[erro] Timeout aguardando ${label} em ${url}" >&2
      echo "[erro] Resposta atual: ${body:-<vazia>}" >&2
      return 1
    fi

    sleep 2
  done
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

if [[ "$DRY_RUN" != "--dry-run" ]]; then
  ensure_docker_environment "install"
else
  if ! command -v docker >/dev/null 2>&1; then
    echo "[erro] Docker nao encontrado. Instale Docker antes de continuar."
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "[erro] Docker Compose (plugin) nao encontrado."
    exit 1
  fi
fi

verify_integrity

echo "[install] Subindo servicos com Docker Compose..."
run_cmd docker compose -f "$COMPOSE_FILE" up --build -d

if [[ "$DRY_RUN" != "--dry-run" ]]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "[erro] curl nao encontrado para validacao pos-start." >&2
    exit 1
  fi

  echo "[install] Aguardando API ficar saudavel..."
  wait_for_http "healthz" "http://localhost:4000/healthz" '"status":"ok"'
  wait_for_http "readyz" "http://localhost:4000/readyz" '"status":"ready"'
  wait_for_http "web" "http://localhost:4173/healthz" "ok"

  echo "[install] Validacao concluida com sucesso."
fi

echo "[install] Concluido. Acesse: http://localhost:4000"
echo "[install] Web separado: http://localhost:4173"
echo "[install] Produto: http://localhost:4000/produto"
echo "[install] Guia: http://localhost:4000/guia"