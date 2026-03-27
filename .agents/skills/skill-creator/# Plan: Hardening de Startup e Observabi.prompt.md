# Plan: Hardening de Startup e Observabilidade

Objetivo: consolidar a arquitetura do servidor para garantir boot determinístico, logs estruturados consistentes e healthcheck confiável, mantendo aderência ao ADR da camada Platform e sem quebra de contratos públicos.

## Steps

1. **Fase 1 — Baseline arquitetural**: mapear e congelar contratos atuais de startup (`startServer`, `startConfiguredServer`, `runAsMainModule`) e observabilidade (`logger`, `createHttpLogger`, `AppLifecycle`) para evitar regressão. *base para todas as fases*
2. **Fase 1 — Critérios de aceitação do ADR**: transformar as decisões do ADR Platform em checklist executável (boot com `PORT`, `traceId` em logs HTTP, shutdown gracioso LIFO, `/api/health` respondendo 200). *depends on 1*
3. **Fase 2 — Startup hardening**: ajustar robustez de boot para cenários de conflito de porta e falhas de inicialização, garantindo que o ciclo de vida encerre recursos sem erro cascata e sem processos órfãos. *depends on 1 e 2*
4. **Fase 2 — Logging hardening**: padronizar saída structured logging em JSON (produção) e pretty logs (desenvolvimento), com campos mínimos estáveis para observabilidade e troubleshooting (`traceId`, método, URL, status, duração). *parallel com passo 3*
5. **Fase 3 — Health path confiável**: validar wiring de serviços para que `/api/health` não degrade por caminhos legados/inválidos e mantenha resposta útil para operação local. *depends on 3*
6. **Fase 3 — Cobertura de testes**: adicionar/ajustar testes de integração e smoke para startup + lifecycle + logger + healthcheck, evitando dependência de `process.cwd()` quando executado por workspace. *depends on 3, 4 e 5*
7. **Fase 4 — Verificação operacional**: executar sequência de validação end-to-end (subida, request de health, shutdown por sinal) com evidência de logs limpos e status de saúde coerente. *depends on 6*

## Relevant files

- `apps/api/src/entrypoints/index.js` — contrato público de boot e leitura de `PORT`
- `apps/api/src/entrypoints/app-startup.js` — orquestração de inicialização e integração com lifecycle
- `apps/api/src/entrypoints/app-main-module.js` — execução segura como módulo principal
- `platform/orchestration/lifecycle.js` — shutdown gracioso, timeout e ordem de hooks
- `platform/observability/logging/logger.js` — logger base + middleware HTTP estruturado
- `apps/api/src/http/app-services-wiring.js` — resolução de paths canônicos usados por health
- `modules/health/application/register-health-routes.js` — contrato do endpoint `/api/health`
- `apps/api/tests/index.test.js` — testes de integração críticos do servidor
- `README.md` — ADR de referência e critérios arquiteturais oficiais

## Verification

1. Executar suíte API e confirmar 0 falhas no conjunto de testes de servidor e health
2. Subir API com `LOG_PRETTY=true` e `PORT` customizado, confirmar log de boot e request log estruturado
3. Fazer `GET /api/health` e validar HTTP 200 com corpo contendo `status` e `checks`
4. Enviar sinal de término (`SIGTERM`) e validar sequência de graceful shutdown sem erro de servidor não iniciado
5. Validar que execução via `npm --workspace apps/api test` e execução direta via `node --test` têm comportamento consistente

## Decisions

- Incluído: robustez de startup, lifecycle, logger e healthcheck
- Incluído: testes de confiabilidade operacional e estabilidade de caminhos
- Excluído: mudanças de negócio dos módulos de domínio (chat, users, backup etc.)
- Excluído: redesign de payload do `/api/health` além do necessário para conformidade do ADR

## Further Considerations

1. Definir se logs pretty devem ficar ativos por default apenas em `development` ou também em ambientes locais sem `NODE_ENV`
2. Definir se o healthcheck em ambiente exposto terá versão reduzida (sanitizada) além do endpoint completo atual
3. Avaliar incluir teste dedicado para ordem LIFO de hooks do lifecycle, separado dos testes HTTP gerais

## Status atual (2026-03-27)

- Hardening de startup/observabilidade concluído no escopo API/platform
- Cobertura dedicada adicionada em `apps/api/tests/platform.test.js` (lifecycle, logger, `/healthz`, `/readyz`)
- Verificação operacional executada com evidência em `artifacts/diagnostics/hardening-e2e.log`

## Próximos (Sprint seguinte)

1. Definir política final de `LOG_PRETTY` (somente `development` ou também ambiente local sem `NODE_ENV`) e documentar em `README.md`
2. Decidir estratégia de exposição de saúde: manter `/api/health` completo e adicionar endpoint sanitizado para cenários externos
3. Adicionar script operacional padronizado (`ops/scripts/local/verify-health.sh`) para automatizar boot + health + shutdown em uma execução
4. Preparar PR de hardening com evidências (trechos de log + resultado de testes) e labels de risco/SLA
