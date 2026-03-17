# Chat Local com Ollama + Streaming

![CI](https://github.com/lucaa21ss-gif/meu-chat-local/actions/workflows/ci.yml/badge.svg)
![Release Please](https://github.com/lucaa21ss-gif/meu-chat-local/actions/workflows/release-please.yml/badge.svg)

Projeto de chat local com frontend moderno, streaming em tempo real, persistencia de conversas em SQLite e controle avancado de inferencia (modelo, temperatura e contexto).

## Visao geral

- Backend Node.js/Express integrado com Ollama
- Frontend em HTML + Tailwind CSS
- Resposta em streaming token a token
- Historico persistente por aba em SQLite
- Exportacao de conversa em Markdown
- Recursos extras: voz (Web Speech API), anexo de imagem para modelos multimodais, copiar resposta

Pontos de entrada para usuario final:

- `/`: aplicacao de chat
- `/produto`: pagina de produto com proposta de valor e recursos
- `/guia`: guia rapido com setup, primeiros passos e troubleshooting enxuto

## Arquitetura

Fluxo principal da aplicacao:

1. O frontend envia mensagens para a API (`/api/chat` ou `/api/chat-stream`)
2. O backend valida o payload, registra logs e encaminha para o Ollama
3. As respostas podem retornar completas ou em streaming token a token
4. Conversas e mensagens sao persistidas em SQLite por aba (`chatId`)
5. A UI atualiza historico, permite exportacao Markdown e acoes de organizacao

Camadas por responsabilidade:

- Interface (`web/`): renderizacao da UI, eventos, streaming no cliente, estilos
- Aplicacao (`server/index.js`): rotas HTTP, middlewares, regras de API
- Integracao de modelo (`server/ollama.js`): comunicacao com Ollama
- Persistencia (`server/db.js`): armazenamento e recuperacao em SQLite
- Observabilidade (`server/logger.js`): logs estruturados e correlacao por `traceId`
- Infra local (`docker-compose.yml` + `ollama/Modelfile`): orquestracao e modelo base

## Estrutura fisica

```text
.
├── docker-compose.yml
├── ollama/
│   └── Modelfile
├── server/
│   ├── index.js
│   ├── ollama.js
│   ├── db.js
│   ├── logger.js
│   ├── package.json
│   └── Dockerfile
└── web/
    ├── index.html
    ├── script.js
    ├── styles.css
    ├── tailwind.config.js
    └── package.json
```

Arquivos-chave para comecar rapido:

- `server/index.js`: ponto de entrada da API e middlewares
- `server/db.js`: camada de persistencia SQLite
- `web/index.html`: estrutura da UI
- `web/script.js`: logica de chat e streaming no cliente
- `web/styles.css`: estilos Tailwind + customizacoes

## Requisitos

- Docker e Docker Compose
- Node.js 20+ (para rodar localmente sem Docker)
- Ollama instalado localmente apenas se nao usar Docker para o servico Ollama

## Setup rapido (Docker)

1. Build e subida dos servicos:

```bash
docker compose up --build
```

2. Abra a UI:

- [http://localhost:3001](http://localhost:3001) para acessar a interface web
- [http://localhost:3001/produto](http://localhost:3001/produto) para a pagina de produto
- [http://localhost:3001/guia](http://localhost:3001/guia) para o guia rapido do usuario
- [http://localhost:3001/api/chats](http://localhost:3001/api/chats) para validar a API

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

### Backend

```bash
cd server
npm install
npm start
```

API em `http://localhost:3001`.

Com o backend em execucao, a interface tambem fica disponivel em `http://localhost:3001`.

### Frontend

```bash
cd web
npm install
npm run build:css
```

Para desenvolvimento com recompilacao de CSS:

```bash
npm run watch:css
```

Se preferir teste sem backend, voce pode abrir `web/index.html` diretamente,
mas o fluxo recomendado e usar `http://localhost:3001` para manter API e UI na mesma origem.

## Endpoints principais

- `GET /healthz`: liveness check do servidor
- `GET /readyz`: readiness check (valida acesso ao store)
- `GET /api/health`: saude expandida (checks + telemetria + status SLO)
- `GET /api/slo`: snapshot de confiabilidade por rotas criticas (operator/admin)
- `POST /api/chat`: chat sem streaming
- `POST /api/chat-stream`: chat com streaming
- `POST /api/reset`: limpa chat padrao
- `GET /api/chats`: lista abas
- `POST /api/chats`: cria aba
- `GET /api/users`: lista perfis locais
- `POST /api/users`: cria perfil local
- `PATCH /api/users/:userId`: renomeia perfil local
- `DELETE /api/users/:userId`: exclui perfil e seus dados
- `POST /api/chats/:chatId/duplicate`: duplica aba com historico (suporta `userOnly: true`)
- `PATCH /api/chats/:chatId`: renomeia aba
- `DELETE /api/chats/:chatId`: exclui aba
- `GET /api/chats/:chatId/messages`: carrega mensagens da aba
- `GET /api/chats/:chatId/search?q=termo&role=all&page=1&limit=20&from=<iso>&to=<iso>`: busca textual no historico da aba com filtros
- `POST /api/chats/:chatId/rag/documents`: indexa documentos locais (nome + conteudo)
- `GET /api/chats/:chatId/rag/documents`: lista documentos indexados da aba
- `GET /api/chats/:chatId/rag/search?q=termo&limit=4`: busca trechos relevantes da base documental
- `POST /api/chats/:chatId/reset`: limpa uma aba
- `GET /api/chats/:chatId/export`: exporta conversa em Markdown
- `GET /api/backup/export`: exporta backup completo (`.tgz` legado ou `.tgz.enc` protegido por passphrase)
- `POST /api/backup/restore`: restaura backup completo com deteccao automatica de formato legado/criptografado
- `GET /api/backup/validate?limit=3`: valida os ultimos backups e retorna status operacional (`ok|alerta|falha`)
- `POST /api/storage/cleanup`: executa simulacao (`dry-run`) ou limpeza real (`execute`) com retencao inteligente para backups
- `GET /api/diagnostics/export`: exporta pacote de diagnostico forense (somente admin); inclui estado de saude, SLO, storage, erros recentes, checklist de triagem e audit logs

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

| Campo                  | Descricao                                                    |
| ---------------------- | ------------------------------------------------------------ |
| `version`              | Versao do schema do pacote (atualmente `2`)                  |
| `generatedAt`          | Timestamp ISO 8601 de geracao                                |
| `traceId`              | ID de rastreamento correlacionavel com logs do servidor      |
| `app`                  | Versao do Node.js, plataforma, uptime, consumo de memoria    |
| `health`               | Status geral e checks individuais (db, model, disk)          |
| `rateLimiter`          | Metricas de rate limiting por perfil                         |
| `telemetry`            | Status de telemetria e top rotas por latencia/erros          |
| `storage`              | Consumo atual por tipo (db, uploads, documents, backups)     |
| `backupValidation`     | Validacao recente de backups com status operacional          |
| `slo`                  | Snapshot de SLO com avaliacao por rota critica               |
| `recentErrors`         | Ultimos eventos bloqueados ou de erro dos audit logs         |
| `recentAuditLogs`      | Ultimos 50 eventos de auditoria                              |
| `recentConfigVersions` | Ultimas 50 versoes de configuracao                           |
| `environment`          | Dados nao-sensiveis do processo (NODE_ENV, pid, arch)        |
| `triageChecklist`      | Checklist versionado com passos recomendados para o operador |
| `securityNote`         | Declaracao explicita do que foi excluido do pacote           |

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
8. Copie respostas pelo botao `Copiar resposta` ou escute com `Ouvir resposta` (TTS)
9. Exporte a conversa por `Exportar Markdown`
10. Use `Renomear aba` e `Excluir aba` para organizar suas conversas

## Perfis multiusuario locais

- Cada perfil local possui isolamento de abas, historico e documentos RAG.
- O perfil ativo fica salvo no navegador via `localStorage` (`chatUserId`).
- O perfil `padrao` existe por default e nao pode ser excluido.
- A listagem de abas usa `GET /api/chats?userId=<perfil>`.

Exemplos de uso da API:

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

Execute no backend:

```bash
cd server
npm test
```

Cobertura atual da suite:

- criacao/listagem de abas
- duplicacao completa e duplicacao apenas de mensagens do usuario
- renomeacao/exclusao de abas
- streaming e exportacao de conversa

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

## Hardening (Sprint 1)

- Security headers via `helmet`
- Rate limit por IP nas rotas `/api`, `/api/chat` e `/api/chat-stream`
- Validacao de payload no backend (chatId, titulo, mensagem, imagens, opcoes)
- Tratamento global de erros com respostas JSON padronizadas para API

Variaveis de ambiente opcionais no backend:

- `FRONTEND_ORIGIN`: origem permitida no CORS
- `JSON_LIMIT`: limite de payload JSON (padrao: `8mb`)
- `RATE_LIMIT_WINDOW_MS`: janela do rate limit geral (padrao: `900000`)
- `RATE_LIMIT_MAX`: limite geral de requests na janela (padrao: `400`)
- `RATE_LIMIT_CHAT_MAX`: limite de requests de chat na janela (padrao: `80`)
- `OLLAMA_TIMEOUT_MS`: timeout por tentativa de inferencia em milissegundos (padrao: `45000`)
- `OLLAMA_MAX_ATTEMPTS`: numero maximo de tentativas por requisicao de chat (padrao: `2`, maximo `3`)
- `OLLAMA_FALLBACK_MODEL`: modelo de fallback quando o principal falha (ex.: `mistral`)
- `CHAT_DB_PATH`: caminho customizado para o arquivo SQLite (opcional)
- `LOG_LEVEL`: nivel de log (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) (padrao: `info`)
- `NODE_ENV`: quando `production`, usa logs JSON em vez de formato colorido de desenvolvimento
- `LOG_PRETTY`: quando `true`, habilita logs legiveis via `pino-pretty` (recomendado apenas para desenvolvimento local)

Notas sobre CORS:

- Sem `FRONTEND_ORIGIN`, o backend aceita por padrao apenas `http://localhost:3001` e `http://127.0.0.1:3001` (alem de requests sem header `Origin`, como health checks e curl)
- Para liberar outras origens, defina `FRONTEND_ORIGIN` com uma ou mais URLs separadas por virgula

## Observabilidade e performance (Sprint 4 e 5)

- Logging estruturado com `pino` + `pino-http`
- `traceId` por request (header `x-trace-id`) para correlacao ponta a ponta
- Compressao gzip de respostas HTTP via middleware `compression`
- Cache de assets estaticos com `max-age=1d`
- `/readyz` inclui tempo de resposta para diagnostico rapido

## Migrations de banco (Sprint 6)

- Schema versionado em `schema_migrations` (SQLite)
- Migracoes executadas automaticamente no startup
- Execucao idempotente para suportar upgrades sem reset de dados

## Upgrades futuros sugeridos

- Autenticacao e perfis
- Busca full-text no historico
- RAG com base local (arquivos/PDF)
- TTS para leitura da resposta
- Upload multiplo de imagens
- Modo colaborativo em tempo real

## Licenca

Uso educacional e local. Ajuste para sua politica de distribuicao conforme necessario.
