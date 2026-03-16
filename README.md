# Chat Local com Ollama + Streaming

Projeto de chat local com frontend moderno, streaming em tempo real, persistencia de conversas em SQLite e controle avancado de inferencia (modelo, temperatura e contexto).

## Visao geral

- Backend Node.js/Express integrado com Ollama
- Frontend em HTML + Tailwind CSS
- Resposta em streaming token a token
- Historico persistente por aba em SQLite
- Exportacao de conversa em Markdown
- Recursos extras: voz (Web Speech API), anexo de imagem para modelos multimodais, copiar resposta

## Estrutura

- `docker-compose.yml`: sobe Ollama e API
- `ollama/Modelfile`: modelo customizavel
- `server/index.js`: API REST/streaming
- `server/db.js`: persistencia SQLite
- `web/index.html`: interface do chat
- `web/script.js`: logica de UI e streaming
- `web/styles.css`: Tailwind + customizacoes

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
- [http://localhost:3001/api/chats](http://localhost:3001/api/chats) para validar a API

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
- anexe imagem para modelos multimodais (ex.: `llava`)
- use `Iniciar ditado` para preencher a mensagem por voz
5. Envie a mensagem e acompanhe o streaming
6. Copie respostas pelo botao `Copiar resposta`
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

## Personalizacao de modelos

No frontend, voce pode trocar o modelo no seletor. No backend, o fallback padrao e `meu-llama3`.

Para adicionar novos modelos, inclua novas opcoes no seletor em `web/index.html` e garanta que o modelo esteja disponivel no Ollama.

## Observacoes sobre multimodal

O envio de imagem e opcional e depende do modelo escolhido suportar imagens.

- Modelos apenas de texto vao ignorar imagem ou responder com limitacoes.
- Modelos multimodais (como `llava`) aproveitam o anexo de imagem.

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

## Upgrades futuros sugeridos

- Autenticacao e perfis
- Busca full-text no historico
- RAG com base local (arquivos/PDF)
- TTS para leitura da resposta
- Upload multiplo de imagens
- Modo colaborativo em tempo real

## Licenca

Uso educacional e local. Ajuste para sua politica de distribuicao conforme necessario.
