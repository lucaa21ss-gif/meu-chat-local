#!/bin/bash
set -x

echo "--- INICIANDO SUPER FIX DE IMPORTS ---"

# 1. Corrigir profundidade para Nível 4 (Apps)
DIRS_N4=("apps/api/src/http" "apps/api/src/bootstrap" "apps/api/src/entrypoints")
for d in "${DIRS_N4[@]}"; do
  [ -d "$d" ] && find "$d" -name "*.js" -exec sed -i 's|\.\./\.\./modules/|../../../../modules/|g' {} +
  [ -d "$d" ] && find "$d" -name "*.js" -exec sed -i 's|\.\./\.\./shared/|../../../../shared/|g' {} +
  [ -d "$d" ] && find "$d" -name "*.js" -exec sed -i 's|\.\./\.\./infra/|../../../../platform/|g' {} +
  [ -d "$d" ] && find "$d" -name "*.js" -exec sed -i 's|\.\./\.\./platform/|../../../../platform/|g' {} +
done

# 2. Corrigir profundidade para Nível 3 (Modules e Platform base)
DIRS_N3=("modules/*/application" "modules/*/domain" "platform/persistence/sqlite" "platform/llm/ollama" "platform/fs/storage" "platform/fs/backup-archive" "platform/observability/logging" "platform/observability/telemetry" "platform/queue/local-queue")
for d in "${DIRS_N3[@]}"; do
  [ -d "$d" ] && find $d -name "*.js" -exec sed -i 's|\.\./\.\./infra/|../../../platform/|g' {} +
  [ -d "$d" ] && find $d -name "*.js" -exec sed -i 's|\.\./\.\./platform/|../../../platform/|g' {} +
  [ -d "$d" ] && find $d -name "*.js" -exec sed -i 's|\.\./\.\./shared/|../../../shared/|g' {} +
  [ -d "$d" ] && find $d -name "*.js" -exec sed -i 's|\.\./\.\./modules/|../../../modules/|g' {} +
done

# 3. Mapeamento de Arquivos Granulares
REPLACEMENTS=(
  "platform/db/db.js:platform/persistence/sqlite/db.js"
  "platform/ollama/ollama-client.js:platform/llm/ollama/ollama-client.js"
  "platform/logging/logger.js:platform/observability/logging/logger.js"
  "platform/telemetry/telemetry.js:platform/observability/telemetry/telemetry.js"
  "platform/fs/storage-service.js:platform/fs/storage/storage-service.js"
  "platform/backup/backup-archive.js:platform/fs/backup-archive/backup-archive.js"
  "platform/queue/rate-limiter.js:platform/queue/local-queue/rate-limiter.js"
  "shared/errors/HttpError.js:shared/kernel/errors/HttpError.js"
)

for r in "${REPLACEMENTS[@]}"; do
  OLD="${r%%:*}"
  NEW="${r##*:}"
  find apps modules platform shared -name "*.js" -exec sed -i "s|$OLD|$NEW|g" {} +
done

# 4. Módulos /application/
MODULES=(chat users backup health audit config-governance resilience approvals capacity incident storage)
for mod in "${MODULES[@]}"; do
  # Somente se o import NÃO tiver application/ ainda
  find apps modules platform shared -name "*.js" -exec sed -i "s|modules/$mod/\([a-zA-Z0-9-]\+\)\.js|modules/$mod/application/\1.js|g" {} +
done

# 5. Fix Entrypoints sibling imports
# Em index.js, app-startup.js, etc.
sed -i 's|./app-main-module.js|./app-main-module.js|g' apps/api/src/entrypoints/*.js # Just to be sure
# Se houver ../http/app-create.js (é correto)
# Se houver ./app-create.js -> ../http/app-create.js
sed -i 's|\./app-create\.js|\.\./http/app-create.js|g' apps/api/src/entrypoints/app-startup.js 2>/dev/null || true

# 6. Fix Wiring (Bootstrap)
find apps/api/src/http -name "*.js" -exec sed -i 's|\./app-create-wiring.js|../bootstrap/app-create-wiring.js|g' {} +
find apps/api/src/http -name "*.js" -exec sed -i 's|\./app-startup-wiring.js|../bootstrap/app-startup-wiring.js|g' {} +
find apps/api/src/bootstrap -name "*.js" -exec sed -i 's|\./app-create\.js|\.\./http/app-create.js|g' {} +

echo "--- SUPER FIX CONCLUÍDO ---"
