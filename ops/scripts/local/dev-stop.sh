#!/usr/bin/env bash
set -euo pipefail

echo "[dev-stop] Encerrando ambiente local monitorado"

bash ops/scripts/local/clean-dev-ports.sh

echo "[dev-stop] Ambiente local parado"