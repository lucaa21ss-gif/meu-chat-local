# Chat Local com Ollama + Streaming

![CI](https://github.com/lucaa21ss-gif/meu-chat-local/actions/workflows/ci.yml/badge.svg)
![Release Please](https://github.com/lucaa21ss-gif/meu-chat-local/actions/workflows/release-please.yml/badge.svg)

Projeto de chat local com frontend moderno, streaming em tempo real, persistencia de conversas em SQLite e controle avancado de inferencia (modelo, temperatura e contexto).

## Visao geral

- Aplicacao local completa com backend Node.js/Express, frontend web e persistencia SQLite
- Integracao com Ollama para chat sincrono e streaming token a token
- Experiencia multimodal com voz, imagens, RAG local por aba e exportacao de conversas
- Operacao assistida com health checks, SLO, auto-healing, scorecard, diagnostico e auditoria local
- Automacoes operacionais para canary, DR test, perfil de capacidade, backup e distribuicao
- Suite de testes backend/frontend e pipeline CI para validar regressao, seguranca e qualidade

Pontos de entrada para usuario final:

- `/`: aplicacao de chat
- `/produto`: pagina de produto com proposta de valor e recursos
- `/guia`: guia rapido com setup, primeiros passos e troubleshooting enxuto

## Arquitetura

Fluxo principal da aplicacao:

1. O frontend envia mensagens para a API (`/api/chat` ou `/api/chat-stream`)
2. O backend aplica validacao, RBAC, rate limiting, auditoria e controles operacionais
3. A camada de aplicacao encaminha inferencia para o Ollama e integra recursos locais como RAG, backup e diagnostico
4. Conversas, mensagens, configuracoes e trilhas operacionais sao persistidas em SQLite e artefatos locais
5. A UI atualiza historico, status de saude, acoes administrativas e exportacoes sem depender de servicos externos

Camadas por responsabilidade:

- Interface (`web/`): paginas do produto/chat/guia, eventos, streaming no cliente, atalhos e indicadores de health
- Entrypoint e bootstrap (`server/index.js`, `server/src/http/app-startup.js`, `server/src/http/app-main-module.js`): inicializacao do servidor, modo main e agendamento operacional
- HTTP e composicao (`server/src/http/`): montagem da aplicacao Express, middlewares, wiring de rotas e contexto de dependencias
- Modulos de dominio (`server/src/modules/`): registro de rotas por dominio e servicos de governanca/saude/chat/usuarios
- Infraestrutura (`server/src/infra/`): SQLite, backup, storage local, fila/rate limiting, integracao com Ollama, logs e telemetria
- Automacao operacional (`scripts/`): empacotamento, instalacao, canary, DR test, runbook de incidente e capacity profile
- Infra local (`docker-compose.yml`, `server/Dockerfile`, `ollama/Modelfile`): orquestracao, build e modelo base

## Estrutura fisica

Visao resumida dos diretorios e arquivos principais (nao exaustiva):

- A arvore abaixo prioriza pontos de entrada e componentes de manutencao.
- Arquivos gerados em runtime (ex.: `server/chat.db*` e conteudos de `server/artifacts/`) podem variar por ambiente.
- Arquivos ocultos relevantes na raiz: `.dockerignore`, `.prettierignore`, `.release-please-config.json`, `.release-please-manifest.json`.
- Em `docs/`, o arquivo `docs/plano-rearquitetura-modular.md` descreve a evolucao da modularizacao do backend.

```text
.
├── CHANGELOG.md
├── .github/
│   └── workflows/
├── docs/
│   └── plano-rearquitetura-modular.md
├── dist/
├── docker-compose.yml
├── eslint.config.mjs
├── ollama/
│   └── Modelfile
├── package-lock.json
├── package.json
├── scripts/
│   ├── capacity-profile.mjs
│   ├── disaster-recovery-test.sh
│   ├── install.sh
│   ├── package-dist.sh
│   ├── release-canary.mjs
│   ├── runbook-incident.sh
│   ├── start.sh
│   ├── stop.sh
│   └── uninstall.sh
├── server/
│   ├── artifacts/
│   ├── backup.test.js
│   ├── chaos.test.js
│   ├── db.migrations.test.js
│   ├── Dockerfile
│   ├── index.js
│   ├── index.test.js
│   ├── integrity.test.js
│   ├── package-lock.json
│   ├── package.json
│   ├── src/
│   │   ├── http/
│   │   ├── infra/
│   │   ├── modules/
│   │   └── shared/
│   ├── storage.test.js
│   └── chat.db*
└── web/
    ├── assets/
    ├── guia.html
    ├── health-indicators.js
    ├── health-indicators.test.cjs
    ├── index.html
    ├── output.css
    ├── package-lock.json
    ├── package.json
    ├── produto.html
    ├── script.js
    ├── style.css
    ├── styles.css
    └── tailwind.config.js
```

Mapa rapido do backend modular:

- `server/src/http/`: bootstrap HTTP, middlewares, composicao do app e wiring de rotas
- `server/src/infra/`: adaptadores locais de banco, backup, filesystem, logging, Ollama, fila e telemetria
- `server/src/modules/approvals/`: fluxo de approvals operacionais
- `server/src/modules/audit/`: exportacao e consulta de trilhas de auditoria
- `server/src/modules/backup/`: exportacao, restauracao e validacao de backups
- `server/src/modules/capacity/`: perfil de capacidade, fila local e scorecard operacional
- `server/src/modules/chat/`: rotas de chat, chats e RAG
- `server/src/modules/config-governance/`: baseline, rollback e rotas de configuracao
- `server/src/modules/health/`: health checks e agregadores de saude/SLO
- `server/src/modules/incident/`: status de incidentes e sinais para runbooks
- `server/src/modules/observability/`: rotas de diagnostico, health expandido e observabilidade
- `server/src/modules/resilience/`: auto-healing, disaster recovery e integridade
- `server/src/modules/storage/`: uso e limpeza de armazenamento local
- `server/src/modules/users/`: rotas de usuarios, perfis e preferencias
- `server/src/shared/`: constantes, parsers, tratamento de erro e model-recovery

Arquivos-chave para comecar rapido:

- `server/index.js`: ponto de entrada da API (bootstrap/main)
- `server/src/http/app-create.js`: composicao principal da aplicacao Express
- `server/src/http/app-context.js`: montagem de contexto, servicos e dependencias de rota
- `server/src/http/app-route-registrars.js`: mapa centralizado dos registradores de rota
- `server/src/infra/db/db.js`: persistencia SQLite, historico de chats e configuracoes
- `server/src/infra/backup/backup-archive.js`: exportacao/restauracao e validacao de backups
- `server/src/infra/fs/storage-service.js`: uso e limpeza de armazenamento local
- `server/src/infra/ollama/ollama-client.js`: integracao local com Ollama
- `server/src/infra/queue/rate-limiter.js`: fila local e rate limiting por papel
- `server/src/infra/telemetry/telemetry.js`: metricas por endpoint e middleware de telemetria
- `server/src/modules/`: modulos de dominio (chat, approvals, backup, capacity, config-governance, incident, observability, resilience, storage, health e users)
- `web/index.html`: estrutura da UI
- `web/script.js`: logica de chat, streaming, filtros, health e acoes operacionais no cliente
- `web/health-indicators.js`: utilitarios de renderizacao e polling de status de saude
- `scripts/capacity-profile.mjs`: runner operacional de capacidade

## Requisitos

- Docker e Docker Compose para o fluxo empacotado/recomendado
- Node.js 20+ e npm para execucao local, testes e automacoes
- Ollama instalado localmente apenas se nao usar Docker para o servico de modelo
- Ambiente Linux/macOS ou Windows com shell compativel para os scripts em `scripts/`
- OpenSSL e `sha256sum` para verificacao manual de integridade do pacote de distribuicao

## Setup rapido (Docker)

Fluxo recomendado para subir a stack completa localmente:

1. Build e subida dos servicos:

```bash
docker compose up --build
```

2. Aguarde o backend expor a interface e a API em `http://localhost:3001`.

3. Abra a UI:

- [http://localhost:3001](http://localhost:3001) para acessar a interface web
- [http://localhost:3001/produto](http://localhost:3001/produto) para a pagina de produto
- [http://localhost:3001/guia](http://localhost:3001/guia) para o guia rapido do usuario
- [http://localhost:3001/healthz](http://localhost:3001/healthz) para validar liveness
- [http://localhost:3001/api/health](http://localhost:3001/api/health) para validar health operacional

## Distribuicao para usuario final

Fluxo recomendado para empacotar e distribuir:

```bash
npm run dist:package
```

Isso gera um pacote em `dist/meu-chat-local-<versao>.tar.gz`.

No ambiente de destino:

```bash
tar -xzf meu-chat-local-<versao>.tar.gz
cd meu-chat-local
bash scripts/install.sh
```

Verificacao manual de integridade (recomendada antes do `tar -xzf`):

```bash
sha256sum -c CHECKSUMS.txt
openssl dgst -sha256 -verify CHECKSUMS.txt.pub -signature CHECKSUMS.txt.sig CHECKSUMS.txt
```

Observacoes de supply chain:

- O CI publica SBOM para `root`, `server` e `web` como artifacts.
- O CI publica `CHECKSUMS.txt`, `CHECKSUMS.txt.sig` e `CHECKSUMS.txt.pub` junto do pacote de distribuicao.
- O `scripts/install.sh` valida assinatura e checksums locais do manifesto de integridade antes de subir os servicos.

Comandos operacionais do pacote:

- `bash scripts/start.sh`: inicia servicos
- `bash scripts/stop.sh`: pausa servicos
- `bash scripts/uninstall.sh`: remove containers/rede e preserva dados
- `bash scripts/uninstall.sh --purge`: remove containers/rede e volumes

Tambem disponivel via npm na raiz do projeto:

- `npm run dist:install`
- `npm run dist:start`
- `npm run dist:stop`
- `npm run dist:uninstall`

## Setup local (sem Docker para frontend/server)

Fluxo util para desenvolvimento, troubleshooting e execucao das automacoes locais.

### Backend

```bash
cd server
npm install
npm start
```

API em `http://localhost:3001`.

Com o backend em execucao, a interface tambem fica disponivel em `http://localhost:3001`.

Checks uteis no backend:

```bash
npm test
```

### Frontend

```bash
cd web
npm install
npm run build:css
```

Teste unitario atual do frontend:

```bash
npm test
```

Para desenvolvimento com recompilacao de CSS:

```bash
npm run watch:css
```

Se preferir teste sem backend, voce pode abrir `web/index.html` diretamente,
mas o fluxo recomendado e usar `http://localhost:3001` para manter API e UI na mesma origem.

## Endpoints principais

Saude e operacao:

- `GET /healthz`: liveness check do servidor
- `GET /readyz`: readiness check do backend
- `GET /api/health`: saude expandida (checks, alerts, baseline, fila, telemetry e snapshots)
- `GET /api/slo`: snapshot de confiabilidade por rotas criticas (`operator|admin`)
- `GET /api/scorecard`: scorecard operacional consolidado (`operator|admin`)

Chat e historico:

- `POST /api/chat`: chat sem streaming
- `POST /api/chat-stream`: chat com streaming
- `POST /api/reset`: limpa o chat padrao
- `GET /api/chats`: lista abas com filtros, busca e paginacao
- `POST /api/chats`: cria aba
- `POST /api/chats/:chatId/duplicate`: duplica aba com historico (`userOnly: true` opcional)
- `PATCH /api/chats/:chatId`: renomeia aba
- `DELETE /api/chats/:chatId`: exclui aba
- `GET /api/chats/:chatId/messages`: carrega mensagens da aba
- `GET /api/chats/:chatId/search?q=termo&role=all&page=1&limit=20&from=<iso>&to=<iso>`: busca textual no historico da aba
- `POST /api/chats/:chatId/reset`: limpa uma aba
- `GET /api/chats/:chatId/export?format=markdown|json`: exporta uma conversa
- `GET /api/chats/export?userId=<perfil>&favorites=true&format=markdown`: exporta conversas em lote

Prompts, perfis e preferencias:

- `GET /api/users`: lista perfis locais
- `POST /api/users`: cria perfil local
- `PATCH /api/users/:userId`: renomeia perfil local
- `PATCH /api/users/:userId/role`: altera o papel do perfil (`admin|operator|viewer`) (somente `admin`)
- `DELETE /api/users/:userId`: exclui perfil e dados vinculados
- `GET /api/users/:userId/ui-preferences`: consulta preferencias de UI do perfil
- `PATCH /api/users/:userId/ui-preferences`: persiste preferencias de UI do perfil
- `PATCH /api/users/:userId/system-prompt-default`: define prompt padrao do perfil
- `GET /api/chats/:chatId/system-prompt`: consulta prompt da conversa
- `PATCH /api/chats/:chatId/system-prompt`: atualiza prompt da conversa

RAG local:

- `POST /api/chats/:chatId/rag/documents`: indexa documentos locais
- `GET /api/chats/:chatId/rag/documents`: lista documentos indexados
- `GET /api/chats/:chatId/rag/search?q=termo&limit=4`: busca trechos relevantes da base documental

Backup, storage e diagnostico:

- `GET /api/backup/export`: exporta backup completo (`.tgz` ou `.tgz.enc`)
- `POST /api/backup/restore`: restaura backup com deteccao automatica de formato
- `GET /api/backup/validate?limit=3`: valida backups recentes
- `GET /api/storage/usage`: consulta uso de armazenamento (`operator|admin`)
- `POST /api/storage/cleanup`: executa simulacao ou limpeza real
- `GET /api/diagnostics/export`: exporta pacote de diagnostico forense (`admin`)
- `GET /api/capacity/latest`: consulta o ultimo snapshot de capacidade (`operator|admin`)
- `GET /api/integrity/status`: consulta integridade em runtime (`operator|admin`)
- `POST /api/integrity/verify`: forca verificacao de integridade (`admin`)

Governanca e operacao segura:

- `GET /api/telemetry`: consulta status e metricas da telemetria
- `PATCH /api/telemetry`: ativa/desativa telemetria local
- `GET /api/config/versions`: lista versoes de configuracao (`operator|admin`)
- `POST /api/config/versions/:versionId/rollback`: executa rollback de configuracao (`admin`)
- `GET /api/config/baseline`: consulta baseline e drift atual (`operator|admin`)
- `POST /api/config/baseline`: salva baseline aprovado (`operator|admin`)
- `GET /api/approvals`: lista solicitacoes de aprovacao (`operator|admin`)
- `POST /api/approvals`: cria solicitacao de aprovacao (`operator|admin`)
- `POST /api/approvals/:approvalId/decision`: aprova ou rejeita solicitacao (`admin`)
- `GET /api/audit/export`: exporta auditoria em JSON (`operator|admin`)
- `GET /api/incident/status`: consulta estado operacional do incidente (`operator|admin`)
- `PATCH /api/incident/status`: atualiza estado operacional do incidente (`admin`)
- `POST /api/incident/runbook/execute`: executa runbook operacional (`admin`)
- `GET /api/auto-healing/status`: consulta politicas de auto-healing (`operator|admin`)
- `PATCH /api/auto-healing/status`: atualiza limites/modo de auto-healing (`admin`)
- `POST /api/auto-healing/execute`: executa politica de auto-healing sob demanda (`admin`)
- `POST /api/disaster-recovery/test`: executa cenário automatizado de DR (`admin`)

Preparo rapido para testar endpoints protegidos:

```bash
# 1) Garanta um perfil operador
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{"name":"operador-local"}'

# 2) Ajuste o papel do perfil criado para operator (somente admin)
curl -X PATCH http://localhost:3001/api/users/<userId-criado>/role \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{"role":"operator"}'

# 3) Use o operador para consultar rotas operator/admin
curl -H "x-user-id: <userId-criado>" http://localhost:3001/api/slo
```

Observacao: o perfil `user-default` nasce com papel `admin` e e o mais indicado para bootstrap local.

## Backup criptografado opcional

Fluxo de exportacao:

1. Clique em `Backup completo` na UI.
2. Informe passphrase opcional (minimo 8 caracteres) para gerar arquivo protegido.
3. Sem passphrase, o sistema gera backup legado em `application/gzip`.
4. Com passphrase, o sistema gera arquivo com envelope autenticado (`AES-256-GCM` + `scrypt`) e extensao `.tgz.enc`.

Fluxo de restauracao:

1. Clique em `Restaurar backup` e escolha arquivo `.tgz`, `.tar.gz` ou `.enc`.
2. Informe passphrase apenas se o backup estiver protegido.
3. O backend detecta o formato automaticamente e valida autenticidade.
4. Chave incorreta ou ausente para arquivo protegido retorna erro de validacao.

Compatibilidade:

- Backups legados nao criptografados continuam suportados sem alteracoes.
- Backups protegidos exigem a mesma passphrase utilizada na exportacao.

## Pacote de diagnostico forense e triagem

O endpoint `GET /api/diagnostics/export` (somente `admin`) gera um pacote JSON versionado com todas as informacoes necessarias para investigacao e triagem de incidentes.

Campos do pacote (versao 2):

| Campo                  | Descricao                                                             |
| ---------------------- | --------------------------------------------------------------------- |
| `version`              | Versao do schema do pacote (atualmente `2`)                           |
| `generatedAt`          | Timestamp ISO 8601 de geracao                                         |
| `traceId`              | ID de rastreamento correlacionavel com logs do servidor               |
| `app`                  | Versao do Node.js, plataforma, uptime, consumo de memoria             |
| `health`               | Status geral e checks individuais (db, model, disk)                   |
| `integrity`            | Integridade de artefatos críticos em runtime (mismatches/missing)     |
| `capacity`             | Último resumo local de throughput, latência e erro por endpoint       |
| `rateLimiter`          | Metricas de rate limiting por perfil                                  |
| `telemetry`            | Status de telemetria e top rotas por latencia/erros                   |
| `autoHealing`          | Estado do auto-healing (modo, limites, circuito e ultimo resultado)   |
| `storage`              | Consumo atual por tipo (db, uploads, documents, backups)              |
| `backupValidation`     | Validacao recente de backups com status operacional                   |
| `slo`                  | Snapshot de SLO com avaliacao por rota critica                        |
| `incidentStatus`       | Estado operacional atual do incidente (status, severidade, historico) |
| `recentErrors`         | Ultimos eventos bloqueados ou de erro dos audit logs                  |
| `recentAuditLogs`      | Ultimos 50 eventos de auditoria                                       |
| `recentConfigVersions` | Ultimas 50 versoes de configuracao                                    |
| `environment`          | Dados nao-sensiveis do processo (NODE_ENV, pid, arch)                 |
| `triageChecklist`      | Checklist versionado com passos recomendados para o operador          |
| `securityNote`         | Declaracao explicita do que foi excluido do pacote                    |

Garantias de privacidade e seguranca:

- Nenhuma variavel de ambiente sensivel (segredos, tokens, senhas) e incluida.
- Mensagens de chat e conteudo de documentos nao aparecem no pacote.
- Passphrases de backup nao sao registradas em audit logs nem exportadas.

## Validacao continua de backups

Use o endpoint administrativo para validar periodicamente os arquivos mais recentes:

```bash
curl -H "x-user-id: user-default" "http://localhost:3001/api/backup/validate?limit=3"
```

Resposta esperada:

- `ok`: todos os backups analisados estao integros.
- `alerta`: ha condicao de atencao (ex.: backup criptografado sem passphrase na validacao).
- `falha`: pelo menos um backup invalido/corrompido.

## Retencao inteligente de backups

A limpeza de `backups` em `POST /api/storage/cleanup` usa politica versionada `backup-layered-v1`:

- curto prazo (`shortTermDays=7`): preserva todos os backups recentes.
- medio prazo (`mediumTermDays=30`): preserva 1 backup por dia.
- longo prazo (acima de 30 dias): preserva 1 backup por semana.
- protecao adicional: preserva os ultimos `N` backups validados (`preserveValidatedBackups`, padrao `2`).

Exemplo de simulacao (dry-run):

```bash
curl -X POST http://localhost:3001/api/storage/cleanup \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{
    "mode": "dry-run",
    "target": "backups",
    "olderThanDays": 30,
    "maxDeleteMb": 1024,
    "preserveValidatedBackups": 3,
    "backupPassphrase": "senha-opcional-para-validar-.enc"
  }'
```

O retorno inclui previsao de impacto (`estimatedFreedBytes`), lista de candidatos (`files`) e arquivos preservados (`skipped`) com o motivo da preservacao.

## Runbook de resposta a incidentes

Fluxo operacional padrao para resposta local:

1. Classificar severidade inicial.
2. Abrir estado de incidente em `investigating`.
3. Aplicar mitigacao e mover para `mitigating`.
4. Confirmar estabilidade em `monitoring`.
5. Encerrar em `resolved` e retornar para `normal`.

Niveis de severidade recomendados:

- `info`: observacao sem impacto direto no uso.
- `low`: degradacao leve com workaround disponivel.
- `medium`: degradacao relevante para parte dos fluxos.
- `high`: impacto forte em funcionalidades principais.
- `critical`: indisponibilidade ou risco operacional elevado.

Transicoes de estado suportadas:

- `normal -> investigating`
- `investigating -> mitigating|monitoring|resolved`
- `mitigating -> investigating|monitoring|resolved`
- `monitoring -> normal|investigating|resolved`
- `resolved -> normal|monitoring|investigating`

Consulta do estado atual:

```bash
curl -H "x-user-id: user-operator" http://localhost:3001/api/incident/status
```

Atualizacao do estado (admin):

```bash
curl -X PATCH http://localhost:3001/api/incident/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{
    "status": "investigating",
    "severity": "high",
    "summary": "Latencia elevada em /api/chat",
    "owner": "oncall-local",
    "recommendationType": "slo"
  }'
```

Execucao automatizada por comando unico (triagem + mitigacao):

```bash
npm run incident:runbook -- --type model-offline --mode execute
```

Tipos de runbook suportados:

- `model-offline`
- `db-degraded`
- `disk-pressure`
- `backup-alert`

Cada execucao gera um artefato JSON em `artifacts/runbooks/` e registra evidencias no audit log local (`eventType=incident.runbook.execute`).

Rollback operacional para retornar ao estado normal:

```bash
npm run incident:runbook -- --type model-offline --mode rollback
```

## Auto-healing local para falhas transitorias

Politicas disponiveis:

- `model-offline`: tenta recuperar indisponibilidade momentanea do modelo usando fallback/retry seguro.
- `db-lock`: executa sonda de banco para falhas transitorias de acesso.

Regras de seguranca operacional:

- cooldown configuravel entre tentativas (`cooldownMs`)
- limite de tentativas em janela (`maxAttempts` + `windowMs`)
- circuito aberto automatico para evitar loops infinitos

Consultar estado atual:

```bash
curl -H "x-user-id: user-operator" http://localhost:3001/api/auto-healing/status
```

Habilitar e ajustar limites (admin):

```bash
curl -X PATCH http://localhost:3001/api/auto-healing/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{
    "enabled": true,
    "cooldownMs": 30000,
    "maxAttempts": 3,
    "windowMs": 300000
  }'
```

Executar politica manualmente (admin):

```bash
curl -X POST http://localhost:3001/api/auto-healing/execute \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{"policy":"model-offline"}'
```

Eventos de auditoria gerados:

- `autohealing.config.update`
- `autohealing.execute`
- `autohealing.auto.execute`

## Canary local de release

Gate operacional antes de promover release para uso local critico.

Execucao por comando unico:

```bash
npm run release:canary
```

Smoke checks executados:

- `GET /api/health` (exige status `healthy`)
- `GET /api/diagnostics/export` (exige pacote valido)
- `POST /api/chat` (exige fluxo basico de resposta)

Regras de gate:

- `approved`: todos os checks essenciais aprovados
- `blocked`: qualquer check essencial falhou (processo retorna exit code 1)

Relatorio de gate:

- JSON em `server/artifacts/canary/canary-report.json`
- inclui status final, motivos de bloqueio/aprovacao e detalhes de cada check

Opcionalmente, customize a execucao:

```bash
npm run release:canary -- --base-url http://localhost:3001 --actor user-default --timeout-ms 15000
```

Procedimento de promocao recomendado:

1. Empacotar release (`npm run dist:package`).
2. Subir ambiente local (`npm run dist:install` ou stack equivalente).
3. Executar canary (`npm run release:canary`).
4. Promover somente com gate `approved`.
5. Em `blocked`, revisar o relatorio JSON e corrigir antes de nova tentativa.

## Perfil local de capacidade

Execução por comando único:

```bash
npm run capacity:profile
```

O runner exercita os endpoints críticos abaixo com carga controlada:

- `GET /api/health`
- `GET /api/diagnostics/export`
- `POST /api/chat`

Métricas e gate operacional:

- latência `p50`, `p95` e `p99`
- `throughputRps` por endpoint e total
- `errorRate` por endpoint e total
- status final `approved|blocked` com exit code `1` quando o orçamento falha

Evidências e consulta operacional:

- relatório JSON em `server/artifacts/capacity/capacity-report.json`
- resumo disponível em `GET /api/capacity/latest`
- `GET /api/health` e `GET /api/diagnostics/export` passam a incluir o último snapshot de capacidade

Exemplo com parâmetros opcionais:

```bash
npm run capacity:profile -- --iterations 20 --concurrency 4 --max-p95-ms 1200 --min-throughput-rps 1.5
```

## Backpressure e fila local para operacoes custosas

O servidor protege os endpoints criticos contra sobrecarga com uma fila interna de execucao concorrente. Novas requisicoes sao enfileiradas e processadas com controle de concorrencia; quando a fila atinge o limite, o servidor responde com **HTTP 429** em vez de degradar silenciosamente.

Endpoints protegidos pela fila:

- `POST /api/chat-stream`

Variaveis de ambiente de ajuste:

| Variavel                | Padrao   | Descricao                                       |
| ----------------------- | -------- | ----------------------------------------------- |
| `QUEUE_MAX_CONCURRENCY` | `4`      | Maximo de tarefas em execucao simultanea (1-32) |
| `QUEUE_MAX_SIZE`        | `100`    | Tamanho maximo da fila de espera (1-500)        |
| `QUEUE_TASK_TIMEOUT_MS` | `30000`  | Timeout por tarefa em ms (5000-120000)          |
| `QUEUE_REJECT_POLICY`   | `reject` | Politica quando a fila esta cheia (`reject`)    |

Observabilidade:

- `GET /api/health` inclui o campo `queue` com metricas em tempo real:
  - `activeCount`, `queuedCount`, `completedCount`, `rejectedCount`, `failedCount`
  - `averageWaitTimeMs`, `maxConcurrency`, `maxQueueSize`, `utilizationPercent`
  - alerta automatico quando `rejectedCount > 0` ou utilizacao esta alta
- `GET /api/diagnostics/export` inclui o mesmo snapshot `queue` no pacote forense

Resposta de saturacao:

```json
{
  "error": "Servidor saturado: fila cheia (100/100)",
  "retryAfter": 5
}
```

HTTP 429 com header `Retry-After: 5`.

## Baseline de configuracao e deteccao de drift

Governanca de configuracao com baseline versionado e deteccao automatica de drift operacional. Permite ao operador registrar o estado esperado da configuracao e ser alertado quando o runtime diverge.

### Endpoints

| Metodo | Rota                   | Role minima | Descricao                                   |
| ------ | ---------------------- | ----------- | ------------------------------------------- |
| GET    | `/api/config/baseline` | operator    | Retorna baseline salvo + drift atual        |
| POST   | `/api/config/baseline` | operator    | Salva configuracao atual como novo baseline |

### Fluxo de revisao

1. **Estabelecer baseline**: Apos configurar o servidor com os valores aprovados, chame `POST /api/config/baseline`. O estado atual sera salvo em `server/artifacts/baseline/config-baseline.json`.

2. **Detectar drift**: `GET /api/config/baseline` compara o baseline salvo com a configuracao em execucao. O campo `driftedKeys` lista quais chaves divergiram.

3. **Alerta automatico**: `GET /api/health` inclui `baseline.status` e emite um alerta em `alerts[]` quando `status === "drift"`.

4. **Reconciliar**: Para aceitar o estado atual como novo baseline aprovado, chame novamente `POST /api/config/baseline`. O evento `config.baseline.reconciled` e registrado no audit log com as chaves reconciliadas.

### Configuracoes monitoradas

```json
{
  "telemetryEnabled": true,
  "queue": {
    "maxConcurrency": 4,
    "maxSize": 100,
    "taskTimeoutMs": 30000,
    "rejectPolicy": "reject"
  },
  "autoHealing": {
    "enabled": false,
    "cooldownMs": 30000,
    "maxAttempts": 3
  }
}
```

### Observabilidade

- `GET /api/health` — campo `baseline.status` (`ok|drift|not-configured`) com `driftedKeys` e alerta automatico quando `status === "drift"`
- `GET /api/diagnostics/export` — snapshot completo de baseline em `payload.baseline`
- Audit log — eventos `config.baseline.saved` e `config.baseline.reconciled` com `driftedKeys` e `actorUserId`

## Scorecard Operacional Consolidado

Visao executiva local do estado operacional do sistema. Consolida 10 dimensoes em um status unico (`ok`, `alerta`, `critico`) com recomendacoes objetivas. Cada geracao persiste o snapshot em `server/artifacts/scorecard/scorecard-latest.json` para rastreamento historico.

### Endpoint

| Metodo | Rota             | Role minima | Descricao                                       |
| ------ | ---------------- | ----------- | ----------------------------------------------- |
| GET    | `/api/scorecard` | operator    | Retorna scorecard consolidado com recomendacoes |

### Dimensoes avaliadas

| Dimensao       | Fonte de dados                        | critico        | alerta                   |
| -------------- | ------------------------------------- | -------------- | ------------------------ |
| `health`       | `/api/health` (checkDb/Model/Disk)    | unhealthy      | degraded                 |
| `slo`          | Telemetria (p95/errorRate)            | —              | status=alerta            |
| `backup`       | `backupService.validateRecentBackups` | status=falha   | status=alerta            |
| `integrity`    | `integrityService.getOrRefresh`       | status=failed  | —                        |
| `capacity`     | `capacityService.getLatestSummary`    | status=blocked | status=alerta            |
| `auto-healing` | `autoHealingService.getStatus`        | —              | disabled ou circuit=open |
| `incident`     | `incidentService.getStatus`           | —              | investigating/mitigating |
| `baseline`     | `baselineService.check`               | —              | status=drift             |
| `approvals`    | Aprovacoes com status=pending         | —              | pendingCount > 0         |
| `queue`        | `queueService.getMetrics`             | —              | rejections ou saturacao  |

### Logica de status geral

- `critico`: ao menos uma dimensao em critico
- `alerta`: ao menos uma dimensao em alerta (sem critico)
- `ok`: todas as dimensoes em ok

### Exemplo de resposta

```json
{
  "scorecard": {
    "version": 1,
    "generatedAt": "2026-03-17T12:00:00.000Z",
    "status": "alerta",
    "dimensions": [
      {
        "name": "health",
        "label": "Saude do sistema",
        "status": "ok",
        "detail": { "status": "healthy" }
      },
      {
        "name": "baseline",
        "label": "Drift de configuracao",
        "status": "alerta",
        "detail": { "driftedKeys": ["telemetryEnabled"] }
      }
    ],
    "recommendations": [
      {
        "dimension": "baseline",
        "severity": "medium",
        "action": "Dimensao Drift de configuracao em alerta — revisar e planejar correcao"
      }
    ]
  }
}
```

## Aprovacao auditavel para acoes operacionais criticas

Mecanismo de aprovacao previa para acoes de alto impacto. Exige que um administrador crie e aprove uma solicitacao antes de executar operacoes criticas, com janela de tempo controlada e evidencia completa no audit log.

### Acoes protegidas

| Acao                       | Endpoint protegido                    |
| -------------------------- | ------------------------------------- |
| `backup.restore`           | `POST /api/backup/restore`            |
| `disaster-recovery.test`   | `POST /api/disaster-recovery/test`    |
| `incident.runbook.execute` | `POST /api/incident/runbook/execute`  |
| `storage.cleanup.execute`  | `POST /api/storage/cleanup` (execute) |

### Endpoints de aprovacao

| Metodo | Rota                                  | Role minima | Descricao                                         |
| ------ | ------------------------------------- | ----------- | ------------------------------------------------- |
| GET    | `/api/approvals`                      | operator    | Lista solicitacoes (filtros: status, page, limit) |
| POST   | `/api/approvals`                      | operator    | Cria solicitacao de aprovacao                     |
| POST   | `/api/approvals/:approvalId/decision` | admin       | Aprova ou nega solicitacao                        |

### Fluxo de uso

1. **Solicitar aprovacao**: `POST /api/approvals` com `action`, `reason` e `windowMinutes` (1-1440).
2. **Aprovar**: `POST /api/approvals/:id/decision` com `decision: "approve"`. O aprovador registra `approverNote` opcional.
3. **Executar**: Envie `approvalId` no body do endpoint protegido. A aprovacao e consumida uma unica vez.
4. **Auditoria**: Cada etapa (criacao, decisao, consumo, bloqueio) gera entrada no audit log com `requestedBy`, `approvedBy`, `action`, `windowEndAt`.

### Exemplo

```bash
# Criar solicitacao
curl -s -X POST http://localhost:3001/api/approvals \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-operator" \
  -d '{"action":"backup.restore","reason":"Restauracao de emergencia apos falha","windowMinutes":30}'

# Aprovar (como admin)
curl -s -X POST http://localhost:3001/api/approvals/<approvalId>/decision \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-default" \
  -d '{"decision":"approve","approverNote":"Confirmado com oncall"}'

# Executar acao protegida
curl -s -X POST http://localhost:3001/api/backup/restore \
  -H "Content-Type: application/json" \
  -d '{"archiveBase64":"...","passphrase":"...","approvalId":"<approvalId>"}'
```

### Regras de negocio

- Aprovacao deve estar com `status === "approved"` e dentro da janela de tempo (`windowEndAt`)
- Aprovacao e consumida atomicamente — nao pode ser reutilizada
- Rejeicao ou expiracao retorna HTTP 403/410 e registra `approval.blocked` no audit log
- O solicitante nao pode ser o mesmo que aprova
- Aprovacoes ficam persistidas em `server/artifacts/approvals/operational-approvals.json`

## Teste automatizado de restauração de desastre (DR)

Execucao por comando unico:

```bash
npm run dr:test
```

O cenário automatizado executa:

1. Cria estado sentinela mínimo.
2. Gera backup operacional.
3. Simula perda de estado.
4. Executa restauração automática.
5. Valida integridade mínima (health + recuperação do estado sentinela).

Indicadores e evidências:

- `status` final: `passed|failed`
- indicador de RTO local em milissegundos (`rtoMs`)
- relatório JSON persistido em `server/artifacts/dr/<scenarioId>.json`

Exemplo com parâmetros opcionais:

```bash
npm run dr:test -- --scenario dr-release-01 --server http://localhost:3001 --actor user-default
```

Evento de auditoria gerado:

- `disaster.recovery.test`

## Observabilidade de integridade em runtime

Consultar snapshot atual:

```bash
curl -H "x-user-id: user-operator" http://localhost:3001/api/integrity/status
```

Forçar verificação manual e registrar auditoria (admin):

```bash
curl -X POST http://localhost:3001/api/integrity/verify \
  -H "x-user-id: user-default"
```

Comportamento operacional:

- O `GET /api/health` inclui o campo `integrity`.
- Divergências de hash ou arquivos críticos ausentes geram alerta no `health`.
- O pacote `GET /api/diagnostics/export` inclui snapshot de `integrity`.

Evento de auditoria gerado:

- `integrity.verify`

## Suite de caos local e recuperacao

Execucao por comando unico:

```bash
cd server
npm run test:chaos
```

Cenarios cobertos na suite `chaos-local-v1`:

- disco cheio (impacto em `health` e `diagnostics`)
- modelo indisponivel (alerta em `SLO` e recomendacoes no `diagnostics`)
- DB degradado + recuperacao (transicao de `unhealthy` para `healthy`)

Evidencias automaticas por execucao:

- arquivo JSON em `server/artifacts/chaos/chaos-report.json`
- resultado por cenario (`passed|failed`) e evidencias coletadas

## Governanca de dependencias

O pipeline de CI executa verificacao de cadeia de dependencias em tres alvos:

- raiz do repositorio (`package-lock.json`)
- backend (`server/package-lock.json`)
- frontend (`web/package-lock.json`)

Politica aplicada:

- `npm audit --audit-level=high`
- falha de pipeline para vulnerabilidades `high` ou `critical`
- relatorio JSON publicado como artifact em cada alvo

Checklist de atualizacao segura:

1. Executar auditoria local por alvo:

- `npm audit --audit-level=high`
- `cd server && npm audit --audit-level=high`
- `cd web && npm audit --audit-level=high`

2. Priorizar atualizacoes `patch` e `minor` antes de `major`.
3. Para atualizacoes com breaking change, abrir PR dedicado com plano de rollback.
4. Reexecutar suite completa (`npm test` no backend + checks de CI locais).
5. Registrar no changelog qualquer excecao aceita temporariamente.

## Como usar

1. Crie uma nova aba em `+ Nova aba`
2. Opcional: escolha ou crie um perfil no seletor `Perfil ativo`; cada perfil enxerga apenas suas proprias abas e documentos locais
3. Opcional: renomeie ou exclua o perfil atual pelos botoes ao lado do seletor
4. Opcional: duplique uma aba existente por `Duplicar aba` usando o modal visual para escolher entre conversa completa ou apenas mensagens do usuario
5. Ajuste:

- temperatura
- modelo
- contexto

6. Opcional:

- anexe uma ou mais imagens para modelos multimodais (ex.: `llava`)
- use `Iniciar ditado` para preencher a mensagem por voz

7. Envie a mensagem e acompanhe o streaming
8. Copie qualquer mensagem pelo botao `Copiar mensagem`; para respostas da IA, use tambem `Ouvir resposta` (TTS)
9. Exporte a conversa por `Exportar Markdown`
10. Use `Renomear aba`, `Duplicar aba`, `Favoritar` e `Excluir aba` para organizar suas conversas
11. Acompanhe o badge de saude no header para checar status do sistema e latencia do modelo

## Atalhos de teclado

- `Shift+?`: abre o painel de ajuda de atalhos.
- `Alt+Shift+N`: cria uma nova conversa.
- `Alt+Shift+F`: foca a busca no historico.
- `Alt+Shift+M`: foca a caixa de mensagem.
- `Alt+Shift+ArrowUp`: navega para a aba anterior.
- `Alt+Shift+ArrowDown`: navega para a proxima aba.
- `Alt+Shift+D`: duplica a aba ativa.
- `Esc`: fecha o modal aberto.

Observacoes:

- Os atalhos globais ficam desativados quando um `input`, `textarea` ou area editavel esta em foco.
- O modal `Atalhos ?` usa o mesmo mapa centralizado de atalhos do frontend para evitar divergencia entre UI e comportamento.

## Historico de chats

- A coluna lateral carrega conversas em paginas de 20 itens.
- Use o campo `Buscar conversas` para filtrar por titulo da aba ou conteudo das mensagens.
- A busca do sidebar usa debounce de `300ms` para evitar requisicoes excessivas.
- Quando houver mais resultados, use `Carregar mais` para trazer a proxima pagina sem perder o estado atual da lista.
- A posicao de scroll do sidebar e preservada ao navegar entre conversas.

## Perfis multiusuario locais

- Cada perfil local possui isolamento de abas, historico e documentos RAG.
- O perfil ativo fica salvo no navegador via `localStorage` (`chatUserId`).
- O tema da interface tambem pode ser persistido por perfil via `GET/PATCH /api/users/:userId/ui-preferences`.
- O perfil `padrao` existe por default e nao pode ser excluido.
- A listagem de abas usa `GET /api/chats?userId=<perfil>`.

## SLO local de confiabilidade

Objetivos aplicados automaticamente pelo backend com base na telemetria:

- Disponibilidade: taxa de erro maxima de `5%` por rota critica.
- Latencia p95 para rotas de leitura (`GET`): ate `400ms`.
- Latencia p95 para rotas de escrita (`POST`): ate `1200ms`.
- Minimo de amostras para avaliacao: `5` requests por rota.

Status possiveis no snapshot SLO:

- `ok`: objetivos atendidos.
- `alerta`: algum limiar excedido.
- `insuficiente`: amostragem abaixo do minimo.

```bash
curl http://localhost:3001/api/users

curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"alice"}'

curl -X PATCH http://localhost:3001/api/users/user-123 \
  -H "Content-Type: application/json" \
  -d '{"name":"alice-dev"}'

curl "http://localhost:3001/api/chats?userId=user-default"

curl -X POST http://localhost:3001/api/chats \
  -H "Content-Type: application/json" \
  -d '{"id":"chat-alice-1","title":"Inbox Alice","userId":"user-123"}'
```

## Testes automatizados

Backend:

```bash
cd server
npm test
```

Frontend:

```bash
cd web
npm test
```

Checks de apoio na raiz:

```bash
npm run lint
npm run format:check
```

Cobertura atual da suite:

- fluxos de chat, streaming, exportacao e busca
- perfis, prompts e preferencias de UI
- backup, restore, storage e validacao operacional
- diagnostico, integridade, capacity profile, scorecard e approvals
- caos local, DR test e governanca operacional
- utilitarios de health no frontend

## CI

Pipeline automatizado em [ .github/workflows/ci.yml ](.github/workflows/ci.yml):

- executa quality gate com lint e format check
- executa auditoria de dependencias (`npm audit --audit-level=high`) em raiz, backend e frontend
- publica reports JSON de auditoria como artifacts do workflow
- executa testes do backend com Node 20
- valida checks basicos de frontend (`npm run build:css` + sintaxe de `web/script.js` + validacao de IDs essenciais da UI)
- valida `docker compose config`
- builda a imagem Docker do servidor sem publicar

### Troubleshooting de CI

Falhas comuns e como reproduzir localmente:

- `Lint JavaScript` falhou:

```bash
npm ci
npm run lint
```

- `Check formatting` falhou:

```bash
npm ci
npm run format:check
```

- `Backend Tests` falhou:

```bash
cd server
npm ci
npm test
```

- `Dependency Audit` falhou:

```bash
npm ci && npm audit --audit-level=high
cd server && npm ci && npm audit --audit-level=high
cd ../web && npm ci && npm audit --audit-level=high
```

- `Frontend Checks` falhou:

```bash
cd web
npm ci
npm run build:css
cd ..
node --check web/script.js
grep -q 'id="msg"' web/index.html && grep -q 'id="sendBtn"' web/index.html && grep -q 'id="chat"' web/index.html
```

- `Docker Build` falhou:

```bash
docker compose config -q
docker build -f server/Dockerfile .
```

## Release e versao

Automacao de release semantico:

- [ .github/workflows/release-please.yml ](.github/workflows/release-please.yml) cria PRs/releases com versionamento semantico
- [ .release-please-manifest.json ](.release-please-manifest.json) define a versao base do repositorio
- commits no padrao convencional (`feat`, `fix`, `chore`, `ci`) alimentam o bump de versao

Publicacao de imagem Docker:

- [ .github/workflows/docker-publish.yml ](.github/workflows/docker-publish.yml) publica a imagem no GitHub Container Registry
- imagem alvo: `ghcr.io/lucaa21ss-gif/meu-chat-local-server`
- publicacao acontece quando uma tag semantica `v*.*.*` ou `meu-chat-local-v*.*.*` e criada

## Personalizacao de modelos

No frontend, voce pode trocar o modelo no seletor. No backend, o fallback padrao e `meu-llama3`.

Para adicionar novos modelos, inclua novas opcoes no seletor em `web/index.html` e garanta que o modelo esteja disponivel no Ollama.

## Observacoes sobre multimodal

O envio de imagem e opcional e depende do modelo escolhido suportar imagens.

- Modelos apenas de texto vao ignorar imagem ou responder com limitacoes.
- Modelos multimodais (como `llava`) aproveitam o anexo de uma ou mais imagens (ate 4 por mensagem).

## Busca no historico

- Endpoint: `GET /api/chats/:chatId/search?q=termo&role=all&page=1&limit=20&from=<iso>&to=<iso>`
- `q` e obrigatorio (minimo de 2 caracteres)
- `role` e opcional: `all`, `user`, `assistant`
- `page` e opcional (padrao 1)
- `limit` e opcional (1 a 100, padrao 20)
- `from` e `to` sao opcionais (ISO datetime) para filtro por periodo
- Resposta inclui `matches` e objeto `pagination` (`page`, `limit`, `total`, `totalPages`)

## RAG local (documentos com citacoes)

- Upload/indexacao: `POST /api/chats/:chatId/rag/documents`
- Listagem da base: `GET /api/chats/:chatId/rag/documents`
- Busca de trechos: `GET /api/chats/:chatId/rag/search?q=termo&limit=4`
- O frontend permite anexar arquivos texto por aba e ativar `RAG` no envio da mensagem.
- Quando ativo, o endpoint `/api/chat` retorna `citations` com os trechos usados.

## Troubleshooting

- CSS nao atualiza:
  - execute `npm run build:css` em `web`
- Erro de conexao com API:
  - verifique se o servidor esta em `http://localhost:3001`
- UI sem estilo no Docker:
  - refaca a imagem com `docker compose up --build`
- Sem resposta do modelo:
  - confirme que o Ollama esta ativo e com modelo instalado
- Voz indisponivel:
  - o navegador pode nao suportar Web Speech API

## Seguranca e configuracao do backend

- Security headers via `helmet`
- Rate limit por IP nas rotas `/api`, `/api/chat` e `/api/chat-stream`
- Validacao de payload no backend (chatId, titulo, mensagem, imagens, opcoes)
- Tratamento global de erros com respostas JSON padronizadas para API

Variaveis de ambiente opcionais no backend:

- `FRONTEND_ORIGIN`: origem permitida no CORS
- `JSON_LIMIT`: limite de payload JSON (padrao atual: `32mb`)
- `RATE_LIMIT_WINDOW_MS`: janela do rate limit geral (padrao: `900000`)
- `RATE_LIMIT_MAX`: limite geral de requests na janela (padrao: `400`)
- `OLLAMA_TIMEOUT_MS`: timeout por tentativa de inferencia em milissegundos (padrao: `45000`)
- `OLLAMA_MAX_ATTEMPTS`: numero maximo de tentativas por requisicao de chat (padrao: `2`, maximo `3`)
- `OLLAMA_FALLBACK_MODEL`: modelo de fallback quando o principal falha (ex.: `mistral`)
- `CHAT_DB_PATH`: caminho customizado para o arquivo SQLite (opcional)
- `LOG_LEVEL`: nivel de log (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) (padrao: `info`)
- `NODE_ENV`: quando `production`, usa logs JSON em vez de formato colorido de desenvolvimento
- `LOG_PRETTY`: quando `true`, habilita logs legiveis via `pino-pretty` (recomendado apenas para desenvolvimento local)
- `QUEUE_MAX_CONCURRENCY`: concorrencia maxima da fila local de chat-stream (padrao: `4`)
- `QUEUE_MAX_SIZE`: tamanho maximo da fila local (padrao: `100`)
- `QUEUE_TASK_TIMEOUT_MS`: timeout por tarefa da fila (padrao: `30000`)
- `QUEUE_REJECT_POLICY`: politica quando a fila satura (padrao: `reject`)

Notas sobre CORS:

- Sem `FRONTEND_ORIGIN`, o backend aceita por padrao apenas `http://localhost:3001` e `http://127.0.0.1:3001` (alem de requests sem header `Origin`, como health checks e curl)
- Para liberar outras origens, defina `FRONTEND_ORIGIN` com uma ou mais URLs separadas por virgula

## Observabilidade e performance

- Logging estruturado com `pino` + `pino-http`
- `traceId` por request (header `x-trace-id`) para correlacao ponta a ponta
- Compressao gzip de respostas HTTP via middleware `compression`
- Cache de assets estaticos com `max-age=1d`
- `/readyz` inclui tempo de resposta para diagnostico rapido

## Migrations de banco

- Schema versionado em `schema_migrations` (SQLite)
- Migracoes executadas automaticamente no startup
- Execucao idempotente para suportar upgrades sem reset de dados

## Upgrades futuros sugeridos

- Autenticacao local com login por senha ou chave do dispositivo
- Busca full-text indexada para historicos extensos
- Importacao de documentos binarios adicionais no RAG local (ex.: PDF com parsing dedicado)
- Dashboard operacional dedicado para scorecard, fila e approvals
- Empacotamento multiplataforma com instalador nativo
- Modo colaborativo ou compartilhamento controlado entre perfis locais

## Licenca

Uso educacional e local. Ajuste para sua politica de distribuicao conforme necessario.
