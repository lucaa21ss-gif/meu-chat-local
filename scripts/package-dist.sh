#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION="${DIST_VERSION:-$(node -p "require('$ROOT_DIR/package.json').version")}"
ARCHIVE_NAME="meu-chat-local-${VERSION}.tar.gz"
ARCHIVE_PATH="$DIST_DIR/$ARCHIVE_NAME"

mkdir -p "$DIST_DIR"

echo "[dist] Gerando pacote de distribuicao: $ARCHIVE_PATH"

tar \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='server/node_modules' \
  --exclude='web/node_modules' \
  --exclude='dist' \
  --exclude='coverage' \
  --exclude='server/chat.db' \
  --exclude='server/chat.db-shm' \
  --exclude='server/chat.db-wal' \
  --exclude='web/output.css' \
  -czf "$ARCHIVE_PATH" \
  -C "$ROOT_DIR" \
  .

echo "[dist] Pacote criado com sucesso."
echo "[dist] Arquivo: $ARCHIVE_PATH"