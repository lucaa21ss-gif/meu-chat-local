# Indice de ADRs Arquiteturais — meu-chat-local

> **Fonte de verdade dos blocos completos**: `README.md` (secao "Arquitetura")  
> **Ownership**: ver [`docs/architecture/teams.md`](teams.md) e `.github/CODEOWNERS`  
> **Ultima atualizacao**: 2026-03-26

Este documento e um indice de navegacao rapida para todos os Mini-ADRs inline documentados no README. Use os links para acessar diretamente o bloco de cada modulo sem percorrer o arquivo completo.

---

## Visao geral consolidada

| # | Modulo / Camada | Tipo | Decisoes | Gaps | Severidade max | Owner | Link README |
|---|----------------|------|----------|------|----------------|-------|-------------|
| 1 | Chat streaming | Dominio | 3 | 0 | — | Backend (chat) | [↗ README](../../README.md#mini-adr-inline---decisoes-de-arquitetura-do-chat-stream) |
| 2 | Chat sincrono | Dominio | 3 | 0 | — | Backend (chat) | [↗ README](../../README.md#mini-adr-inline---decisoes-de-arquitetura-do-chat-sincrono-post-apichat) |
| 3 | Backup | Dominio | 5 | 1 | Media | Backend (backup) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-backup) |
| 4 | Approvals | Dominio | 5 | 0 | — | Backend (governance) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-approvals) |
| 5 | Config Governance | Dominio | 5 | 1 | Media | Backend (governance) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-config-governance) |
| 6 | Incident | Dominio | 5 | 0 | — | Backend (incident) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-incident) |
| 7 | Resilience | Dominio | 5 | 0 | — | Backend (resilience) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-resilience) |
| 8 | Health / Observability | Dominio | 5 | 2 | Media | Backend (observability) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-health--observability) |
| 9 | Storage / Capacity | Dominio | 5 | 2 | Baixa | Backend (storage/capacity) | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-storage--capacity) |
| 10 | Users | Dominio | 5 | 4 | Alta | Backend (users) + Governance | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-modulo-users) |
| 11 | Platform (infra) | Infraestrutura | 5 | 0 | — | Plataforma | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-da-camada-platform) |
| 12 | Bootstrap / shared/config | Transversal | 5 | 0 | — | Plataforma + Backend | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-do-bootstrap-e-sharedconfig) |
| 13 | Shared / kernel | Transversal | 5 | 0 | — | Plataforma + Backend | [↗ README](../../README.md#mini-adr-inline--decisoes-de-arquitetura-da-camada-sharedkernel) |

**Total: 13 ADRs · 61 decisoes documentadas · 12 gaps de compliance rastreados**

---

## Resumos por ADR

### 1 — Chat streaming (`POST /api/chat-stream`)

**Arquivo**: [`modules/chat/application/register-chat-routes.js`](../../modules/chat/application/register-chat-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| Enfileirar com prioridade e limite — retorna `429` em saturacao | Degradacao de UX sob pico prolongado |
| Persistir mensagem do usuario *antes* da inferencia | Mensagens sem resposta em falha dura de modelo |
| Encapsular retry/fallback em `executeWithModelRecovery` | Latencia adicional quando retries sao consumidos |

**Checklist**: rate limiter ativo · fila com tratamento de `Queue full` · `executeWithModelRecovery` envolvendo inferencia

---

### 2 — Chat sincrono (`POST /api/chat`)

**Arquivo**: [`modules/chat/application/register-chat-routes.js`](../../modules/chat/application/register-chat-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| Rejeitar payload invalido e registrar `upload.blocked` | Falsos positivos em cargas limítrofes |
| Persistir entrada e saida no ciclo sincrono | Mensagem de usuario sem resposta em falha de modelo |
| Aplicar `executeWithModelRecovery` no caminho sincrono | Variacao de latencia em degradacao de LLM |

**Checklist**: payload validado antes da persistencia · fluxo `appendMessage(user)` → infer → `appendMessage(assistant)` mantido

---

### 3 — Backup

**Rotas**: `GET /api/backup/export` · `POST /api/backup/restore` · `GET /api/backup/validate`  
**Arquivo**: [`modules/backup/application/register-backup-routes.js`](../../modules/backup/application/register-backup-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| Todas as rotas exigem `admin` via `requireMinimumRole` | Configuracao incorreta rebaixa restricao |
| Restore exige `requireOperationalApproval` | Falha no servico de aprovacoes bloqueia restore em emergencia |
| Passphrase via header HTTP, nao query nem body | Backup sem passphrase nao e cifrado (**Gap #11 — Media**) |
| `recordAudit` em todas as operacoes | Crash pos-operacao gera estado sem trilha |

**Gaps**: #11 (Backup sem passphrase gera arquivo nao cifrado — Media)

---

### 4 — Approvals

**Rotas**: `GET /api/approvals` · `POST /api/approvals` · `POST /api/approvals/:id/decision`  
**Arquivo**: [`modules/approvals/application/register-approval-routes.js`](../../modules/approvals/application/register-approval-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| `operator` em listagem/criacao; `admin` em decisao | Configuracao incorreta de role |
| `reason` obrigatoria na criacao, opcional na decisao | Reason vazia na decisao reduz valor auditavel |
| `windowMinutes` default 30 min | Janela expirada antes de execucao em operacoes longas |
| `resolveActor` determina identidade — nao via body | Falha silenciosa em `resolveActor` registra auditoria com userId invalido |

**Gaps**: nenhum gap identificado  
> Hub de acoplamento: consumido por `backup`, `incident`, `storage`, `resilience` via `requireOperationalApproval`

---

### 5 — Config Governance

**Rotas**: `GET /api/config/versions` · `POST /api/config/versions/:id/rollback` · `GET/POST /api/config/baseline`  
**Arquivo**: [`modules/config-governance/application/register-config-routes.js`](../../modules/config-governance/application/register-config-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| Rollback exige `admin`; leitura de baseline permite `operator` | Nivelacao acidental de rollback para `operator` |
| Rollback idempotente via `areConfigValuesEqual` | Implementacao incorreta causa rollback silencioso (**Gap #7 — Media**) |
| `recordConfigVersion` + `recordAudit` separados em toda escrita | Crash entre os dois gera versao sem trilha |
| `baseline.saved` vs `baseline.reconciled` distinguidos na auditoria | Race condition em ambiente concorrente |

**Gaps**: #7 (`areConfigValuesEqual` heuristica — Media)

---

### 6 — Incident

**Rotas**: `GET /api/incident/status` · `PATCH /api/incident/status` · `POST /api/incident/runbook/execute`  
**Arquivo**: [`modules/incident/application/register-incident-routes.js`](../../modules/incident/application/register-incident-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| Leitura permite `operator`; mutacoes exigem `admin` | Rebaixar PATCH para `operator` expoe transicoes criticas |
| `dry-run` isento de `requireOperationalApproval`; outros modos nao | Novo modo sem revisao do condicional cria execucao nao autorizada |
| Modo `execute`: `investigating` → `mitigating` (duas transicoes) | Falha entre estados deixa incidente em estado intermediario |
| Modo `rollback`: passa por `monitoring` antes de `normal` | Normalizacao abrupta mascara incidente ainda ativo |

**Gaps**: nenhum gap identificado (Gap #12 — `collectIncidentRunbookSignals` falha silenciosa — e Baixa, registrado na tabela de gaps gerais)

---

### 7 — Resilience

**Rotas**: `GET/PATCH /api/auto-healing/status` · `POST /api/auto-healing/execute` · `POST /api/disaster-recovery/test` · `GET /api/integrity/status` · `POST /api/integrity/verify`  
**Arquivos**: [`modules/resilience/application/`](../../modules/resilience/application/)

| Decisao chave | Risco residual |
|---------------|----------------|
| Leitura: `operator`; mutacoes: `admin` | Rebaixar endpoint de mutacao para `operator` |
| DR test exige `requireOperationalApproval` | Falha no servico de aprovacoes bloqueia DR em emergencia (**Gap #9**) |
| `auto-healing.execute` retorna `ok` derivado de `outcome` | Clientes que consumirem apenas `ok` ignoram `reason` |
| `integrity.status` com `refresh` opcional; `verify` sempre `force: true` | Uso excessivo de `refresh=true` eleva carga em ambiente degradado |

**Gaps**: #9 (compartilhado com backup/incident/storage — `requireOperationalApproval` pode bloquear DR em emergencia — Alta)

---

### 8 — Health / Observability

**Rotas**: `/readyz` · `GET /api/health` · `GET /api/slo` · `GET/PATCH /api/telemetry` · `GET /api/diagnostics/export` · `POST /api/observability/gc`  
**Arquivos**: [`modules/health/application/`](../../modules/health/application/) · [`modules/observability/`](../../modules/observability/)

| Decisao chave | Risco residual |
|---------------|----------------|
| `/readyz` e `/api/health` sem autenticacao | `/api/health` expo dados de fila/drift sem RBAC (**Gap #5 — Media**) |
| Auto-healing avaliado automaticamente em `/api/health` | Auditoria condicional: so registra se `executed === true` |
| `PATCH /api/telemetry` com `enabled=false` reseta stats | Perda de dados ao desativar acidentalmente |
| `/api/diagnostics/export` filtra ENV por lista de permissao + termos sensiveis | Variavel mal nomeada com credencial pode escapar (**Gap #6 — Baixa**) |

**Gaps**: #5 (`GET /api/health` sem auth — Media), #6 (`scorecard` com fallbacks silenciosos — Baixa)

---

### 9 — Storage / Capacity

**Rotas**: `GET /api/storage/usage` · `POST /api/storage/cleanup` · `GET /api/scorecard` · `GET /api/capacity/latest`  
**Arquivos**: [`modules/storage/application/`](../../modules/storage/application/) · [`modules/observability/`](../../modules/observability/)

| Decisao chave | Risco residual |
|---------------|----------------|
| `GET /api/storage/usage` sem auth; cleanup exige `admin` | Expos `totalBytes`/`usagePercent` sem RBAC (**Gap #4 — Baixa**) |
| Cleanup em `execute` exige `requireOperationalApproval`; `dry-run` isento | Novo modo sem revisao do condicional |
| Scorecard agrega 10 fontes em `Promise.all` com fallbacks | Falhas de infra mascaradas no payload (**Gap #6 — Baixa**) |
| `GET /api/capacity/latest` registra auditoria em toda leitura | Volume excessivo em ambiente com polling frequente |

**Gaps**: #4 (`GET /api/storage/usage` sem auth — Baixa), #6 (scorecard — Baixa)

---

### 10 — Users

**Rotas**: `GET /api/users` · `POST /api/users` · `PATCH /api/users/:id` e sub-rotas · `DELETE /api/users/:id` · `POST /api/audit/profile-switch`  
**Arquivo**: [`modules/users/application/register-users-routes.js`](../../modules/users/application/register-users-routes.js)

| Decisao chave | Risco residual |
|---------------|----------------|
| `GET /api/users` sem auth para selector de perfil pre-login | Expos lista de perfis e roles (**Gap #3 — Media**) |
| Mutacoes de configs registram `recordConfigVersion` | Falha na versao apos mutacao gera estado sem historico |
| `PATCH /api/users/:id/role` **sem** `recordAudit` | Elevacao de privilegio sem trilha (**Gap #1 — Alta**) |
| `user-default` protegido contra exclusao com 403 | ID hardcoded fragil (**Gap #10 — Baixa**) |
| `POST /api/audit/profile-switch` sem autenticacao | `userId` fornecido pelo frontend sem validacao (**Gap #2 — Media**) |

**Gaps**: #1 (role sem auditoria — **Alta**), #2 (profile-switch sem auth — Media), #3 (GET /api/users sem auth — Media), #10 (user-default hardcoded — Baixa)

---

### 11 — Platform (infraestrutura)

**Cobre**: `platform/persistence/sqlite` · `platform/queue/local-queue` · `platform/llm/ollama` · `platform/orchestration`

| Decisao chave | Risco residual |
|---------------|----------------|
| SQLite arquivo unico com WAL | Arquivo corrompido em crash sem WAL checkpointing |
| Schema migrations com versao monotonica (`DB_SCHEMA_VERSION=11`) | Migracoes irreversiveis — rollback requer restore |
| Rate limiter em memoria com janela deslizante por papel | Estado perdido em restart; sem distribuicao |
| Ollama client sem retry/circuit breaker (resiliencia na app-layer) | Toda rota de chat falha se Ollama estiver offline |
| `AppLifecycle` com shutdown hooks LIFO e timeout de 8s | Hook malformado pode deixar DB sem fechar |

**Gaps**: nenhum gap identificado nesta camada

---

### 12 — Bootstrap / shared/config

**Cobre**: `apps/api/src/bootstrap/*` · `shared/config/app-constants.js` · `shared/config/parsers.js`

| Decisao chave | Risco residual |
|---------------|----------------|
| Bootstrap em 8 funcoes puras de wiring | `undefined` silencioso se ordem de inicializacao errada |
| DI manual via parametros de funcao — sem container | Dependencia omitida gera `undefined` em runtime |
| `createAppContextValue` com namespace flat | Colisao silenciosa de chaves entre grupos de wiring |
| `shared/config/app-constants.js` como fonte de enums imutaveis | Novo role sem `ROLE_LEVEL` correspondente causa `undefined` |
| `shared/config/parsers.js` como unica camada de validacao | Limites hardcoded — sem configuracao dinamica sem redeploy |

**Gaps**: nenhum gap identificado nesta camada

---

### 13 — Shared / kernel

**Cobre**: `shared/kernel/errors/HttpError.js` · `shared/kernel/model-recovery.js`

| Decisao chave | Risco residual |
|---------------|----------------|
| `HttpError` centralizado com `toJSON()` e `traceId` | `HttpError.internal` sem `details` — perda de contexto em 500 |
| `instanceof HttpError` no error boundary HTTP | `instanceof` pode falhar em erro cross-realm e retornar 500 indevido |
| `withTimeout` por `Promise.race` gerando `HttpError(504)` | Processamento continua no provider apos timeout |
| Plano de tentativa com fallback deterministico (`buildModelAttemptPlan`) | Sem circuit breaker global — pressao continua em falha persistente |
| `run(model)` injetado como callback para desacoplar resiliencia do SDK | Callback pode lancar erro nao padronizado caindo em 500 |

**Gaps**: nenhum gap identificado nesta camada

---

## Mapa de gaps por severidade

### Severidade Alta (2 gaps)

| Gap | Modulo | Acao imediata |
|-----|--------|---------------|
| #1 — `PATCH /api/users/:id/role` sem `recordAudit` | `users` | Adicionar `recordAudit("user.role.updated", ...)` |
| #8 — Crash entre operacao critica e `recordAudit` | Todos | Avaliar outbox pattern ou transacao atomica |
| #9 — `requireOperationalApproval` pode bloquear DR em emergencia | `backup`, `incident`, `storage`, `resilience` | Modo de emergencia com bypass auditado |

### Severidade Media (5 gaps)

| Gap | Modulo | Plano |
|-----|--------|-------|
| #2 — `POST /api/audit/profile-switch` sem auth | `users` | Aceitar como intencional; documentar dado como nao confiavel |
| #3 — `GET /api/users` sem auth | `users` | Avaliar `requireMinimumRole("user")` |
| #5 — `GET /api/health` sem auth | `health` | Avaliar protecao em redes expostas |
| #7 — `areConfigValuesEqual` heuristica | `config-governance` | Testes unitarios por tipo de valor |
| #11 — Backup sem passphrase nao cifrado | `backup` | Documentar no runbook e na UI |

### Severidade Baixa (4 gaps)

| Gap | Modulo | Plano |
|-----|--------|-------|
| #4 — `GET /api/storage/usage` sem auth | `storage` | Avaliar adicao de RBAC minimo |
| #6 — Scorecard com fallbacks silenciosos | `observability` | Adicionar campo `degradedSources` no payload |
| #10 — `user-default` hardcoded | `users` | Extrair para constante em `app-constants.js` |
| #12 — `collectIncidentRunbookSignals` falha silenciosa | `incident` | Adicionar campo `signalsError` no payload de auditoria |

---

## Hubs de acoplamento

Os dois contratos com maior fan-in do sistema:

| Hub | Dependentes | Regra de mudanca segura |
|-----|------------|-------------------------|
| `audit.recordAudit(eventName, actorUserId, payload)` | 10 modulos | Busca global por `recordAudit(` apos qualquer mudanca de assinatura |
| `approvals.requireOperationalApproval(req, { action, actorUserId })` | 4 modulos | Validar os 4 call sites: `backup.restore`, `incident.runbook.execute`, `storage.cleanup`, `disaster-recovery.test` |

---

## Referencias cruzadas

| Documento | Conteudo relacionado |
|-----------|----------------------|
| `README.md` — secao Arquitetura | Blocos completos de cada ADR com tabelas de decisao e checklists |
| `README.md` — Gaps de compliance | Tabela consolidada de todos os 12 gaps com severidade e plano |
| [`docs/architecture/teams.md`](teams.md) | Times responsaveis por camada, checklists de revisao e criterios de escalonamento |
| [`docs/architecture/runbook-template.md`](runbook-template.md) | Template padronizado para runbooks de incidente — base para `docs/runbooks/<modulo>-<cenario>.md` |
| `.github/CODEOWNERS` | Reviewers obrigatorios derivados da Matriz RACI por caminho de arquivo |
| `.github/PULL_REQUEST_TEMPLATE.md` | Template de PR com secao de impacto arquitetural obrigatoria |
| `.github/labels.yml` | Labels `governance/adr-update` e `governance/compliance-gap` usadas em PRs que afetam ADRs |
