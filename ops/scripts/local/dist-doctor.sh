#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
source "$ROOT_DIR/ops/scripts/local/docker-preflight.sh"

ensure_docker_environment "dist:doctor"
echo "[dist:doctor] OK: Docker CLI, Compose plugin e daemon estao disponiveis."
