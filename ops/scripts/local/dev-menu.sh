#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'

[dev-menu] Comandos principais (local)

Fluxo rapido
 - npm run dev:start           # Preflight + clean + sobe API e WEB
 - npm run dev:open            # Descobre URL e abre frontend
 - npm run dev:stop            # Para ambiente e limpa portas

Diagnostico
 - npm run dev:status          # Resumo de portas, endpoints e ultimo log
 - npm run dev:doctor          # Diagnostico de ambiente (nao estrito)
 - npm run dev:doctor:strict   # Falha com warnings/issues
 - npm run dev:ports:doctor    # Donos de portas ocupadas

Validacao
 - npm run dev:smoke           # Sobe, valida API/WEB e para
 - npm run dev:smoke:strict    # Mesmo fluxo com preflight estrito

Logs
 - npm run dev:logs:list       # Lista logs em artifacts/diagnostics
 - npm run dev:logs            # Mostra o log mais recente
 - npm run dev:logs:follow     # Segue o log mais recente

EOF