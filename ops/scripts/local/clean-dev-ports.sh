#!/usr/bin/env bash
set -euo pipefail

PORTS=(4000 4173 5173 5174 5175 5176)
MODE="${1:-clean}"

is_port_busy() {
  local port="$1"

  if command -v ss >/dev/null 2>&1; then
    ss -ltn "( sport = :${port} )" | tail -n +2 | grep -q .
    return $?
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN -t >/dev/null 2>&1
    return $?
  fi

  return 1
}

show_port_status() {
  local busy=0

  echo "[clean-dev-ports] Status de portas:"
  for p in "${PORTS[@]}"; do
    if is_port_busy "${p}"; then
      echo " - ${p}: OCUPADA"
      busy=1
    else
      echo " - ${p}: livre"
    fi
  done

  return ${busy}
}

show_port_owners() {
  echo "[clean-dev-ports] Donos das portas ocupadas:"

  for p in "${PORTS[@]}"; do
    if ! is_port_busy "${p}"; then
      continue
    fi

    echo " - ${p}:"

    if command -v ss >/dev/null 2>&1; then
      # Exibe PID e processo quando disponivel
      ss -ltnp "( sport = :${p} )" | tail -n +2 || true
      continue
    fi

    if command -v lsof >/dev/null 2>&1; then
      lsof -nP -iTCP:"${p}" -sTCP:LISTEN || true
      continue
    fi

    echo "   (sem ferramenta para identificar dono da porta)"
  done
}

if [[ "${MODE}" == "status" ]]; then
  show_port_status
  exit 0
fi

if [[ "${MODE}" == "doctor" ]]; then
  show_port_status || true
  show_port_owners
  exit 0
fi

echo "[clean-dev-ports] Limpando portas: ${PORTS[*]}"

if command -v fuser >/dev/null 2>&1; then
  for p in "${PORTS[@]}"; do
    fuser -k "${p}/tcp" >/dev/null 2>&1 || true
  done
  echo "[clean-dev-ports] Limpeza concluida com fuser"
elif command -v lsof >/dev/null 2>&1; then
  for p in "${PORTS[@]}"; do
    lsof -ti "tcp:${p}" | xargs -r kill -9 || true
  done
  echo "[clean-dev-ports] Limpeza concluida com lsof"
else
  echo "[clean-dev-ports] Aviso: fuser/lsof nao encontrados; nenhuma porta foi encerrada" >&2
fi

sleep 0.2

if show_port_status; then
  echo "[clean-dev-ports] Todas as portas alvo estao livres"
  exit 0
fi

echo "[clean-dev-ports] Erro: ainda ha portas ocupadas apos tentativa de limpeza" >&2
echo "[clean-dev-ports] Dica: execute 'npm run dev:ports:doctor' para diagnosticar" >&2
show_port_owners >&2
exit 1
