# Plano de Re-arquitetura Modular

## Objetivo

Conduzir a transicao do backend para uma arquitetura modular, reduzindo acoplamento em server/index.js sem alterar contratos de API, regras de RBAC, formato de payloads ou comportamento observado pela UI e testes existentes.

## Principios

1. Zero big-bang: migracoes incrementais e validacao por etapa.
2. Compatibilidade total: endpoints, codigos HTTP e mensagens preservados.
3. Validacao continua: lint e testes backend em toda etapa.
4. Risco controlado: extrair primeiro guardas e registradores de rotas, depois servicos.
5. Rastreabilidade: cada etapa com checklist e criterio de pronto.

## Estado Atual

Etapas ja concluídas nesta frente:

1. Extracao de HttpError e asyncHandler para modulos dedicados.
2. Extracao de auth guards (resolveActor, requireMinimumRole, requireAdminOrSelf).
3. Extracao de operational guards (recordBlockedAttempt, requireOperationalApproval).
4. Extracao de rotas de users, approvals e incident para registradores dedicados.
5. Onda 1: Modularizacao de governanca operacional (auto-healing, integridade, disaster-recovery).

## Escopo da Proxima Onda

### Onda 2: Modularizacao de configuracao e storage

1. Extrair rotas de config versions e baseline.
2. Extrair rotas de storage usage/cleanup.
3. Extrair rotas de audit logs/export.

Criterio de pronto:

1. Lint verde.
2. npm test no backend com exit code 0.
3. Fluxos de rollback, baseline e cleanup validados por teste.

### Onda 3: Modularizacao do dominio de chat

1. Extrair rotas de chats (CRUD, filtros, busca, export/import).
2. Extrair rotas de chat-stream e chat sem streaming.
3. Extrair rotas de RAG (documents/search).

Criterio de pronto:

1. Lint verde.
2. npm test no backend com exit code 0.
3. Fluxos de export/import e RAG sem regressao.

### Onda 4: Servicos e contratos internos

1. Introduzir registrador de modulo por dominio.
2. Padronizar injecao de dependencias por modulo.
3. Reduzir responsabilidades remanescentes de server/index.js para bootstrap e wiring.

Criterio de pronto:

1. server/index.js atuando majoritariamente como composicao de modulos.
2. Testes mantidos em verde.
3. Sem quebra de contratos externos.

## Checklist Operacional por Etapa

1. Implementar extracao.
2. Rodar npm run lint na raiz.
3. Rodar npm test no backend.
4. Revisar git diff para confirmar ausencia de mudanca de contrato.
5. Commit pequeno e descritivo.

## Riscos e Mitigacoes

1. Risco: regressao de RBAC em rotas sensiveis.
   Mitigacao: manter guards injetados e testes de permissao como gate obrigatorio.
2. Risco: divergencia de payloads em endpoints administrativos.
   Mitigacao: nao alterar nomes de campos nem estrutura de resposta.
3. Risco: acoplamento oculto entre modulos.
   Mitigacao: extracoes por dominio com dependencias explicitadas no registrador.

## Definicao de Conclusao da Re-arquitetura

1. server/index.js restrito a bootstrap, middlewares globais e registro de modulos.
2. Rotas organizadas por dominio em arquivos dedicados.
3. Guards e politicas de acesso centralizados em modulos reutilizaveis.
4. Suite de testes verde durante toda a transicao.

## Proximo Passo Imediato

1. Executar Onda 1 (auto-healing, integridade e disaster-recovery) com commits incrementais.
