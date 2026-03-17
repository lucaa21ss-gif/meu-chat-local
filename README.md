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
- `POST /api/chat`: chat sem streaming
- `POST /api/chat-stream`: chat com streaming
- `POST /api/reset`: limpa chat padrao
- `GET /api/chats`: lista abas
- `POST /api/chats`: cria aba
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

## Como usar

1. Crie uma nova aba em `+ Nova aba`
2. Opcional: duplique uma aba existente por `Duplicar aba` usando o modal visual para escolher entre conversa completa ou apenas mensagens do usuario
3. Ajuste:

- temperatura
- modelo
- contexto

4. Opcional:

- anexe uma ou mais imagens para modelos multimodais (ex.: `llava`)
- use `Iniciar ditado` para preencher a mensagem por voz

5. Envie a mensagem e acompanhe o streaming
6. Copie respostas pelo botao `Copiar resposta` ou escute com `Ouvir resposta` (TTS)
7. Exporte a conversa por `Exportar Markdown`
8. Use `Renomear aba` e `Excluir aba` para organizar suas conversas

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
- executa testes do backend com Node 20
- valida build do frontend (`npm run build:css`)
- valida `docker compose config`
- builda a imagem Docker do servidor sem publicar

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
