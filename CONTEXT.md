# CONTEXT

Este arquivo fornece contexto global do projeto para ferramentas de assistencia, incluindo Google AI Studio (Gemini).

## Visao Geral

O repositorio segue um modelo de monorepo com tres aplicacoes principais em `apps/`:

- `apps/api`: core backend em Node.js/Express, responsavel por API HTTP, roteamento, servico de arquivos estaticos e integracao com os modulos de dominio. Porta padrao: 4000.
- `apps/web`: frontend do usuario final. O build estatico e servido pela API principal.
- `apps/web-admin`: painel operacional/administrativo. Em producao local e deploy integrado, e servido pela API principal na rota `/admin`.

### Modo Servico de Rede Domestica

- O servidor `apps/api` e o host central para acesso via LAN/Wi-Fi e, quando configurado, acesso remoto seguro.
- O runtime deve escutar em `0.0.0.0` para aceitar conexoes de outros dispositivos da rede.
- O frontend principal e o painel admin devem consumir API por mesma origem (paths relativos), evitando dependencia de `localhost` no cliente.

## Mapa de Apps

### 1) apps/api

- Papel: runtime central da plataforma.
- Stack principal: Node.js + Express.
- Porta padrao: `4000`.
- Responsabilidades:
  - Expor endpoints da API.
  - Publicar frontend principal em `/` e `/app`.
  - Publicar painel operacional em `/admin` (rota centralizada no mesmo servidor).
  - Integrar modulos de negocio em `modules/`.

### 2) apps/web

- Papel: interface do usuario final.
- Distribuicao: frontend estatico servido pela API.
- Integracao: consome endpoints do backend para recursos de chat, dados e operacoes de usuario.

### 3) apps/web-admin

- Papel: interface operacional para manutencao e observabilidade.
- Desenvolvimento local: executado via Vite em modo dev.
- Integracao de runtime: build publicado sob `/admin` pelo backend (`apps/api`), no mesmo host do frontend principal.

## Estrutura Relacionada

- `modules/`: modulos de dominio e aplicacao (chat, backup, audit, capacity, resilience etc.).
- `platform/`: adaptadores e infraestrutura (persistencia sqlite, observabilidade, orquestracao, filas locais).
- `shared/`: utilitarios e configuracoes compartilhadas.
- `ops/`: scripts operacionais, docker/compose e pipelines locais de verificacao.
- `artifacts/`: saidas e diagnosticos locais (nao deve armazenar logs persistentes no repositorio).

## Fluxo de Execucao (resumo)

1. Usuario acessa frontend principal (`apps/web`) ou painel admin (`/admin`) no mesmo servidor central.
2. API em `apps/api` recebe requisicoes e encaminha para modulos em `modules/`.
3. Camada `platform/` provê persistencia, telemetria e integracoes locais.
4. Respostas retornam para os frontends via HTTP.

## Observacoes para Gemini

- Considere este repositorio como um sistema unico com tres apps especializadas e runtime unificado no servidor principal.
- Ao responder sobre UI principal, priorize `apps/web`.
- Ao responder sobre operacao/administracao, priorize `apps/web-admin` como origem de codigo e rota runtime `/admin`.
- Ao responder sobre backend e integracao, priorize `apps/api` na porta 4000.
