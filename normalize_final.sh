#!/bin/bash
set -x

echo "--- NORMALIZANDO CAMINHOS (PASSAGEM FINAL) ---"

# 1. Apps/api/src (Depth 4) - Requer ../../../../ para chegar à raiz
APPS_DIRS=("apps/api/src/http" "apps/api/src/bootstrap" "apps/api/src/entrypoints")
for d in "${APPS_DIRS[@]}"; do
  if [ -d "$d" ]; then
    echo "Limpando $d..."
    # Substituir qualquer sequencia de ../ (1 ou mais) seguida de platform/shared/modules por ../../../../
    find "$d" -name "*.js" -exec sed -i 's|\(\.\./\)\+platform/|../../../../platform/|g' {} +
    find "$d" -name "*.js" -exec sed -i 's|\(\.\./\)\+shared/|../../../../shared/|g' {} +
    find "$d" -name "*.js" -exec sed -i 's|\(\.\./\)\+modules/|../../../../modules/|g' {} +
  fi
done

# 2. Modules (Depth 3) - Requer ../../../ para chegar à raiz
# modules/chat/application/
find modules -name "*.js" -exec sed -i 's|\(\.\./\)\+platform/|../../../platform/|g' {} +
find modules -name "*.js" -exec sed -i 's|\(\.\./\)\+shared/|../../../shared/|g' {} +
find modules -name "*.js" -exec sed -i 's|\(\.\./\)\+modules/|../../../modules/|g' {} +

# 3. Platform (Depth 4 em persistence/sqlite) - Requer ../../../../ para root, ../../../ para platform/
find platform/persistence/sqlite -name "*.js" -exec sed -i 's|\(\.\./\)\+platform/|../../../platform/|g' {} +
find platform/persistence/sqlite -name "*.js" -exec sed -i 's|\(\.\./\)\+shared/|../../../../shared/|g' {} +
find platform/persistence/sqlite -name "*.js" -exec sed -i 's|\(\.\./\)\+modules/|../../../../modules/|g' {} +

# 4. Corrigir fiações locais (irmãos e adjacentes)
# Entrypoints -> http
sed -i 's|\(\.\./\)\+http/|../http/|g' apps/api/src/entrypoints/*.js
# Entrypoints -> bootstrap
sed -i 's|\(\.\./\)\+bootstrap/|../bootstrap/|g' apps/api/src/entrypoints/*.js

# Http -> bootstrap
sed -i 's|\(\.\./\)\+bootstrap/|../bootstrap/|g' apps/api/src/http/*.js

# Bootstrap -> http
sed -i 's|\(\.\./\)\+http/|../http/|g' apps/api/src/bootstrap/*.js

# 5. Fix manual index.js (Brother/Sibling)
sed -i 's|\.\./entrypoints/app-main-module\.js|./app-main-module.js|g' apps/api/src/entrypoints/index.js
sed -i 's|\.\./entrypoints/app-startup\.js|./app-startup.js|g' apps/api/src/entrypoints/index.js
# Se houver ../../../../platform/... no index.js, ele já foi corrigido pelo item 1.

echo "--- NORMALIZAÇÃO CONCLUÍDA ---"
