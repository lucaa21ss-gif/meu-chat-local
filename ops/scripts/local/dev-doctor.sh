#!/usr/bin/env bash
set -euo pipefail

STRICT=0
SKIP_ENDPOINTS=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strict)
      STRICT=1
      ;;
    --skip-endpoints)
      SKIP_ENDPOINTS=1
      ;;
    *)
      echo "[dev-doctor] argumento desconhecido: $1" >&2
      exit 2
      ;;
  esac
  shift
done

ISSUES=0
WARNINGS=0

print_section() {
  echo
  echo "[dev-doctor] === $1 ==="
}

pass() {
  echo "[dev-doctor] OK: $1"
}

warn() {
  echo "[dev-doctor] WARN: $1"
  WARNINGS=$((WARNINGS + 1))
}

fail() {
  echo "[dev-doctor] FAIL: $1"
  ISSUES=$((ISSUES + 1))
}

print_section "Contexto"
echo "[dev-doctor] Data: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "[dev-doctor] PWD: $(pwd)"

print_section "Ferramentas"
if command -v node >/dev/null 2>&1; then
  pass "node $(node -v)"
else
  fail "node nao encontrado"
fi

if command -v npm >/dev/null 2>&1; then
  pass "npm $(npm -v)"
else
  fail "npm nao encontrado"
fi

if command -v concurrently >/dev/null 2>&1; then
  pass "concurrently disponivel"
else
  warn "concurrently nao encontrado no PATH (npm scripts ainda podem resolver via node_modules/.bin)"
fi

if command -v curl >/dev/null 2>&1; then
  pass "curl disponivel"
else
  warn "curl nao encontrado; checks HTTP serao pulados"
fi

print_section "Portas monitoradas"
PORT_STATUS_OUTPUT="$(bash ops/scripts/local/clean-dev-ports.sh status || true)"
echo "${PORT_STATUS_OUTPUT}"

if echo "${PORT_STATUS_OUTPUT}" | grep -q "OCUPADA"; then
  warn "ha portas ocupadas; exibindo donos"
  bash ops/scripts/local/clean-dev-ports.sh doctor || true
else
  pass "todas as portas monitoradas estao livres"
fi

print_section "Endpoints locais"
if [[ ${SKIP_ENDPOINTS} -eq 1 ]]; then
  echo "[dev-doctor] checks de endpoint pulados (--skip-endpoints)"
elif command -v curl >/dev/null 2>&1; then
  if curl -fsS --max-time 2 "http://localhost:4000/api/health" >/dev/null 2>&1; then
    pass "API disponivel em http://localhost:4000/api/health"
  else
    warn "API indisponivel em http://localhost:4000/api/health"
  fi

  WEB_FOUND=""
  for PORT in 5173 5174 5175 5176; do
    if curl -fsS --max-time 2 "http://localhost:${PORT}" >/dev/null 2>&1; then
      WEB_FOUND="${PORT}"
      break
    fi
  done

  if [[ -n "${WEB_FOUND}" ]]; then
    pass "WEB disponivel em http://localhost:${WEB_FOUND}"
  else
    warn "WEB indisponivel nas portas 5173-5176"
  fi
fi

print_section "Resumo"
echo "[dev-doctor] Issues: ${ISSUES}"
echo "[dev-doctor] Warnings: ${WARNINGS}"

if [[ ${STRICT} -eq 1 && ( ${ISSUES} -gt 0 || ${WARNINGS} -gt 0 ) ]]; then
  echo "[dev-doctor] strict mode: falhou devido a issues/warnings"
  exit 1
fi

if [[ ${ISSUES} -gt 0 ]]; then
  exit 1
fi

echo "[dev-doctor] concluido"
