#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/ops/docker/docker-compose.yml"

docker compose -f "$COMPOSE_FILE" stop

echo "[stop] Servicos pausados."