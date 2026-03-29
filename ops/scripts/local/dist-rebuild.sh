#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"
source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

ensure_docker_environment "dist:rebuild"

echo "[dist:rebuild] Rebuild da stack Docker (up --build -d)..."
docker compose -f "$COMPOSE_FILE" up --build -d

echo "[dist:rebuild] Executando smoke de validacao..."
bash "$ROOT_DIR/ops/scripts/local/dist-smoke.sh"

echo "[dist:rebuild] OK: stack rebuildada e validada."
