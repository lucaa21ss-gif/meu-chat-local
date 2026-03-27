#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
VERSION="${DIST_VERSION:-$(node -p "require('$ROOT_DIR/package.json').version")}"
ARCHIVE_NAME="meu-chat-local-${VERSION}.tar.gz"
ARCHIVE_PATH="$DIST_DIR/$ARCHIVE_NAME"
INTEGRITY_FILE="$ROOT_DIR/.integrity-manifest.sha256"
INTEGRITY_SIG_FILE="$ROOT_DIR/.integrity-manifest.sig"
INTEGRITY_PUB_FILE="$ROOT_DIR/.integrity-manifest.pub"
CHECKSUMS_FILE="$DIST_DIR/CHECKSUMS.txt"
CHECKSUMS_SIG_FILE="$DIST_DIR/CHECKSUMS.txt.sig"
CHECKSUMS_PUB_FILE="$DIST_DIR/CHECKSUMS.txt.pub"
TMP_PRIVATE_KEY=""
TMP_PUBLIC_KEY=""

mkdir -p "$DIST_DIR"

echo "[dist] Gerando pacote de distribuicao: $ARCHIVE_PATH"

cleanup() {
  rm -f "$INTEGRITY_FILE" "$INTEGRITY_SIG_FILE" "$INTEGRITY_PUB_FILE"
  if [[ -n "$TMP_PRIVATE_KEY" ]]; then
    rm -f "$TMP_PRIVATE_KEY"
  fi
  if [[ -n "$TMP_PUBLIC_KEY" ]]; then
    rm -f "$TMP_PUBLIC_KEY"
  fi
}

trap cleanup EXIT

if ! command -v openssl >/dev/null 2>&1; then
  echo "[erro] openssl nao encontrado. Instale openssl para assinar artefatos."
  exit 1
fi

INTEGRITY_TARGETS=(
  "ops/docker/docker-compose.yml"
  "apps/api/package.json"
  "apps/api/package-lock.json"
  "apps/web/package.json"
  "apps/web/package-lock.json"
  "ops/scripts/local/install.sh"
  "ops/scripts/local/start.sh"
  "ops/scripts/local/stop.sh"
  "ops/scripts/local/uninstall.sh"
)

(
  cd "$ROOT_DIR"
  : > "$INTEGRITY_FILE"
  for target in "${INTEGRITY_TARGETS[@]}"; do
    if [[ ! -f "$target" ]]; then
      echo "[erro] arquivo obrigatorio ausente para integridade: $target"
      exit 1
    fi
    sha256sum "$target" >> "$INTEGRITY_FILE"
  done
)

if [[ -n "${DIST_SIGNING_PRIVATE_KEY_B64:-}" ]]; then
  TMP_PRIVATE_KEY="$(mktemp)"
  TMP_PUBLIC_KEY="$(mktemp)"
  echo "$DIST_SIGNING_PRIVATE_KEY_B64" | base64 -d > "$TMP_PRIVATE_KEY"
  chmod 600 "$TMP_PRIVATE_KEY"
  openssl pkey -in "$TMP_PRIVATE_KEY" -pubout -out "$TMP_PUBLIC_KEY"
else
  TMP_PRIVATE_KEY="$(mktemp)"
  TMP_PUBLIC_KEY="$(mktemp)"
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$TMP_PRIVATE_KEY" >/dev/null 2>&1
  openssl pkey -in "$TMP_PRIVATE_KEY" -pubout -out "$TMP_PUBLIC_KEY"
fi

cp "$TMP_PUBLIC_KEY" "$INTEGRITY_PUB_FILE"
openssl dgst -sha256 -sign "$TMP_PRIVATE_KEY" -out "$INTEGRITY_SIG_FILE" "$INTEGRITY_FILE"

tar \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='node_modules' \
  --exclude='apps/api/node_modules' \
  --exclude='apps/web/node_modules' \
  --exclude='ops/scripts/local/node_modules' \
  --exclude='dist' \
  --exclude='coverage' \
  --exclude='apps/api/chat.db' \
  --exclude='apps/api/chat.db-shm' \
  --exclude='apps/api/chat.db-wal' \
  --exclude='apps/web/output.css' \
  -czf "$ARCHIVE_PATH" \
  -C "$ROOT_DIR" \
  .

(
  cd "$DIST_DIR"
  sha256sum "$ARCHIVE_NAME" > "$CHECKSUMS_FILE"
)

cp "$TMP_PUBLIC_KEY" "$CHECKSUMS_PUB_FILE"
openssl dgst -sha256 -sign "$TMP_PRIVATE_KEY" -out "$CHECKSUMS_SIG_FILE" "$CHECKSUMS_FILE"

echo "[dist] Pacote criado com sucesso."
echo "[dist] Arquivo: $ARCHIVE_PATH"
echo "[dist] Checksums: $CHECKSUMS_FILE"
echo "[dist] Assinatura: $CHECKSUMS_SIG_FILE"
echo "[dist] Chave publica: $CHECKSUMS_PUB_FILE"