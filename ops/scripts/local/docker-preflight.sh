#!/usr/bin/env bash

set -euo pipefail

ensure_docker_environment() {
  local prefix="${1:-docker}"

  if ! command -v docker >/dev/null 2>&1; then
    echo "[${prefix}] ERRO: Docker nao encontrado. Instale Docker antes de continuar." >&2
    return 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "[${prefix}] ERRO: Docker Compose (plugin) nao encontrado." >&2
    return 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "[${prefix}] ERRO: Docker daemon indisponivel (socket inacessivel)." >&2
    echo "[${prefix}] Dica Linux: tente 'sudo systemctl start docker' ou 'sudo service docker start'." >&2
    echo "[${prefix}] Dica de permissao: adicione seu usuario ao grupo docker e reabra a sessao." >&2
    echo "[${prefix}] Exemplo: sudo usermod -aG docker $USER" >&2
    return 1
  fi
}
