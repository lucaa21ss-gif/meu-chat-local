#!/usr/bin/env bash

set -euo pipefail

cat <<'EOF'

[dist-menu] Comandos principais (Docker)

Fluxo rapido
 - npm run dist:dev            # Comando unico: sobe ambiente DEV com hot reload
 - npm run dist:dev:down       # Para ambiente DEV
 - npm run dist:dev:logs       # Logs do ambiente DEV
 - npm run dist:doctor         # Diagnostica Docker CLI/Compose/daemon
 - npm run dist:install        # Build + up + validacao API/web
 - npm run dist:rebuild        # Rebuild completo + smoke
 - npm run dist:health         # Checa endpoints HTTP rapidamente
 - npm run dist:smoke          # Smoke da stack (API + web + proxy)
 - npm run dist:status         # Estado de containers e endpoints
 - npm run dist:url            # Mostra URLs da stack
 - npm run dist:open           # Abre frontend no navegador
 - npm run dist:restart        # Reinicia stack (stop + start)

Logs
 - npm run dist:logs           # Ultimas 200 linhas (todos os servicos)
 - npm run dist:logs:follow    # Follow em todos os servicos
 - npm run dist:logs:server    # Logs do backend
 - npm run dist:logs:web       # Logs do frontend nginx
 - npm run dist:logs:ollama    # Logs do modelo

Controle
 - npm run dist:start          # Sobe stack existente
 - npm run dist:stop           # Pausa stack
 - npm run dist:uninstall      # Remove containers/rede (preserva volumes)

EOF
