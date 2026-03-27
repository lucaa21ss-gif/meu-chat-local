#!/bin/bash
set -x

echo "--- INICIANDO FINAL FIX DE IMPORTS ---"

# Camada 4: Apps (src/http, src/bootstrap, src/entrypoints)
APPS_DIRS=("apps/api/src/http" "apps/api/src/bootstrap" "apps/api/src/entrypoints")
for d in "${APPS_DIRS[@]}"; do
  if [ -d "$d" ]; then
    # Fix infra/shared/modules to platform/shared/modules at root (../../../../)
    find "$d" -name "*.js" -exec sed -i 's|\.\./infra/|../../../../platform/|g' {} +
    find "$d" -name "*.js" -exec sed -i 's|\.\./platform/|../../../../platform/|g' {} +
    find "$d" -name "*.js" -exec sed -i 's|\.\./shared/|../../../../shared/|g' {} +
    find "$d" -name "*.js" -exec sed -i 's|\.\./modules/|../../../../modules/|g' {} +
  fi
done

# Camada 3: Modules/application
find modules -name "*.js" -exec sed -i 's|\.\./infra/|../../../platform/|g' {} +
find modules -name "*.js" -exec sed -i 's|\.\./platform/|../../../platform/|g' {} +
find modules -name "*.js" -exec sed -i 's|\.\./shared/|../../../shared/|g' {} +
find modules -name "*.js" -exec sed -i 's|\.\./modules/|../../../modules/|g' {} +

# Granularidade Platform (Platform Nível 3)
PLATFORM_MAP=(
  "platform/db/db.js:platform/persistence/sqlite/db.js"
  "platform/ollama/ollama-client.js:platform/llm/ollama/ollama-client.js"
  "platform/logging/logger.js:platform/observability/logging/logger.js"
  "platform/telemetry/telemetry.js:platform/observability/telemetry/telemetry.js"
  "platform/fs/storage-service.js:platform/fs/storage/storage-service.js"
  "platform/backup/backup-archive.js:platform/fs/backup-archive/backup-archive.js"
  "platform/queue/rate-limiter.js:platform/queue/local-queue/rate-limiter.js"
  "shared/errors/HttpError.js:shared/kernel/errors/HttpError.js"
)

for m in "${PLATFORM_MAP[@]}"; do
  OLD="${m%%:*}"
  NEW="${m##*:}"
  find apps modules platform shared -name "*.js" -exec sed -i "s|$OLD|$NEW|g" {} +
done

# Módulos /application/ (apenas se for o arquivo original)
MODULES=(chat users backup health audit config-governance resilience approvals capacity incident storage)
for mod in "${MODULES[@]}"; do
  find apps modules platform shared -name "*.js" -exec sed -i "s|modules/$mod/\([a-zA-Z0-9-]\+\)\.js|modules/$mod/application/\1.js|g" {} +
done

# Corrigir Entrypoints (irmãos e fiação)
# index.js
sed -i 's|\.\./http/app-startup\.js|./app-startup.js|g' apps/api/src/entrypoints/index.js
sed -i 's|\.\./http/app-main-module\.js|./app-main-module.js|g' apps/api/src/entrypoints/index.js

# app-startup.js
sed -i 's|\./app-create\.js|\.\./http/app-create.js|g' apps/api/src/entrypoints/app-startup.js
sed -i 's|\./app-store\.js|\.\./http/app-store.js|g' apps/api/src/entrypoints/app-startup.js
sed -i 's|\./app-backup-scheduler\.js|\.\./http/app-backup-scheduler.js|g' apps/api/src/entrypoints/app-startup.js
sed -i 's|\./app-startup-wiring\.js|\.\./bootstrap/app-startup-wiring.js|g' apps/api/src/entrypoints/app-startup.js

# app-create.js
sed -i 's|\./app-create-wiring\.js|\.\./bootstrap/app-create-wiring.js|g' apps/api/src/http/app-create.js

# Wiring (Bootstrap - dependências reversas)
find apps/api/src/bootstrap -name "*.js" -exec sed -i 's|\./app-create\.js|\.\./http/app-create.js|g' {} +
find apps/api/src/bootstrap -name "*.js" -exec sed -i 's|\./app-context\.js|\.\./http/app-context.js|g' {} +
find apps/api/src/bootstrap -name "*.js" -exec sed -i 's|\./app-services\.js|\.\./http/app-services.js|g' {} +

echo "--- FINAL FIX CONCLUÍDO ---"
