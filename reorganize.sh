#!/bin/bash
set -x

echo "--- REORGANIZAÇÃO CORRIGIDA ---"

safe_mkdir() {
  mkdir -p "$1"
}

# 1. Estrutura
DIRS=(
  apps/api/src/entrypoints apps/api/src/bootstrap apps/api/src/http apps/api/tests
  apps/web/src/ui apps/web/src/app apps/web/src/infra apps/web/tests
  platform/persistence/sqlite platform/persistence/migrations
  platform/llm/ollama
  platform/fs/storage platform/fs/backup-archive
  platform/observability/logging platform/observability/telemetry
  platform/queue/local-queue
  shared/kernel/errors shared/kernel/types
  shared/config/env shared/config/paths
  shared/security/crypto
  ops/docker/api ops/docker/ollama
  ops/scripts/local ops/scripts/ci
  ops/github/workflows
  docs/architecture docs/runbooks docs/api/openapi
  artifacts/backups artifacts/diagnostics artifacts/capacity
)

for d in "${DIRS[@]}"; do safe_mkdir "$d"; done

# Módulos
MODULES=(chat users backup health audit config-governance resilience approvals capacity incident storage)
for mod in "${MODULES[@]}"; do
  safe_mkdir "modules/$mod/domain"
  safe_mkdir "modules/$mod/application"
  safe_mkdir "modules/$mod/contracts"
done

# 2. Mover de ORIGINAL (server/ e web/)
# Se o server/ existe, movemos.
if [ -d "server" ]; then
  # Apps/api
  mv server/index.js apps/api/src/entrypoints/ 2>/dev/null || true
  mv server/Dockerfile apps/api/ 2>/dev/null || true
  mv server/package*.json apps/api/ 2>/dev/null || true
  mv server/src/http/*.js apps/api/src/http/ 2>/dev/null || true
  mv server/*.test.js apps/api/tests/ 2>/dev/null || true
  
  # Alguns arquivos em entrypoints
  [ -f apps/api/src/http/app-startup.js ] && mv apps/api/src/http/app-startup.js apps/api/src/entrypoints/
  [ -f apps/api/src/http/app-main-module.js ] && mv apps/api/src/http/app-main-module.js apps/api/src/entrypoints/
  [ -f apps/api/src/http/app-server-listen.js ] && mv apps/api/src/http/app-server-listen.js apps/api/src/entrypoints/

  # Platform (De server/src/infra/ original se existir)
  INFRA_BASE="server/src/infra"
  [ -d "$INFRA_BASE/db" ] && mv $INFRA_BASE/db/db.js platform/persistence/sqlite/ 2>/dev/null || true
  [ -d "$INFRA_BASE/db/migrations" ] && mv $INFRA_BASE/db/migrations/* platform/persistence/migrations/ 2>/dev/null || true
  [ -d "$INFRA_BASE/ollama" ] && mv $INFRA_BASE/ollama/*.js platform/llm/ollama/ 2>/dev/null || true
  [ -d "$INFRA_BASE/fs" ] && mv $INFRA_BASE/fs/storage-service.js platform/fs/storage/ 2>/dev/null || true
  [ -d "$INFRA_BASE/backup" ] && mv $INFRA_BASE/backup/backup-archive.js platform/fs/backup-archive/ 2>/dev/null || true
  [ -d "$INFRA_BASE/logging" ] && mv $INFRA_BASE/logging/logger.js platform/observability/logging/ 2>/dev/null || true
  [ -d "$INFRA_BASE/telemetry" ] && mv $INFRA_BASE/telemetry/telemetry.js platform/observability/telemetry/ 2>/dev/null || true
  [ -d "$INFRA_BASE/queue" ] && mv $INFRA_BASE/queue/rate-limiter.js platform/queue/local-queue/ 2>/dev/null || true

  # Shared (De server/src/shared/ original)
  SHARED_BASE="server/src/shared"
  [ -d "$SHARED_BASE/errors" ] && mv $SHARED_BASE/errors/HttpError.js shared/kernel/errors/ 2>/dev/null || true
  [ -f $SHARED_BASE/parsers.js ] && mv $SHARED_BASE/parsers.js shared/config/ 2>/dev/null || true
  [ -f $SHARED_BASE/app-constants.js ] && mv $SHARED_BASE/app-constants.js shared/config/ 2>/dev/null || true
  [ -f $SHARED_BASE/model-recovery.js ] && mv $SHARED_BASE/model-recovery.js shared/kernel/ 2>/dev/null || true

  # Módulos (De server/src/modules/ original)
  MOD_BASE="server/src/modules"
  for mod in "${MODULES[@]}"; do
    [ -d "$MOD_BASE/$mod" ] && mv $MOD_BASE/$mod/*.js modules/$mod/application/ 2>/dev/null || true
  done

  # Documentação e Ops
  [ -d "scripts" ] && mv scripts/*.sh ops/scripts/local/ 2>/dev/null || true
  [ -d "scripts" ] && mv scripts/*.mjs ops/scripts/local/ 2>/dev/null || true
  [ -f "docker-compose.yml" ] && mv docker-compose.yml ops/docker/ 2>/dev/null || true
  [ -d ".github" ] && mv .github/* ops/github/ 2>/dev/null || true
fi

# 3. Mover Web
if [ -d "web" ]; then
  mv web/index.html apps/web/ 2>/dev/null || true
  mv web/script.js apps/web/ 2>/dev/null || true
  mv web/style.css apps/web/ 2>/dev/null || true
  mv web/package*.json apps/web/ 2>/dev/null || true
  mv web/app/* apps/web/src/app/ 2>/dev/null || true
  # ... mover o resto se necessário
fi

# 4. Limpeza de ORIGINAIS (Somente após mover tudo)
rm -rf server web scripts 2>/dev/null || true

echo "--- REORGANIZAÇÃO CONCLUÍDA ---"
