# CONTEXT

Este arquivo fornece contexto global do projeto para ferramentas de assistencia, incluindo Google AI Studio (Gemini).

## Visao Geral

O repositorio segue um modelo de monorepo com tres aplicacoes principais em `apps/`:

- `apps/api`: core backend em Node.js/Express, responsavel por API HTTP, roteamento, servico de arquivos estaticos e integracao com os modulos de dominio. Porta padrao: 4000.
- `apps/web`: frontend do usuario final. O build estatico e servido pela API principal.
- `apps/web-admin`: painel operacional/administrativo. Em producao local e deploy integrado, e servido pela API na rota `/admin`.

## Mapa de Apps

### 1) apps/api

- Papel: runtime central da plataforma.
- Stack principal: Node.js + Express.
- Porta padrao: `4000`.
- Responsabilidades:
  - Expor endpoints da API.
  - Publicar frontend principal em `/` e `/app`.
  - Publicar painel operacional em `/admin`.
  - Integrar modulos de negocio em `modules/`.

### 2) apps/web

- Papel: interface do usuario final.
- Distribuicao: frontend estatico servido pela API.
- Integracao: consome endpoints do backend para recursos de chat, dados e operacoes de usuario.

### 3) apps/web-admin

- Papel: interface operacional para manutencao e observabilidade.
- Desenvolvimento local: executado via Vite em modo dev.
- Integracao de runtime: build publicado sob `/admin` pelo backend (`apps/api`).

## Estrutura Relacionada

- `modules/`: modulos de dominio e aplicacao (chat, backup, audit, capacity, resilience etc.).
- `platform/`: adaptadores e infraestrutura (persistencia sqlite, observabilidade, orquestracao, filas locais).
- `shared/`: utilitarios e configuracoes compartilhadas.
- `ops/`: scripts operacionais, docker/compose e pipelines locais de verificacao.
- `artifacts/`: saidas e diagnosticos locais (nao deve armazenar logs persistentes no repositorio).

## Fluxo de Execucao (resumo)

1. Usuario acessa frontend principal (`apps/web`) ou painel admin (`apps/web-admin`).
2. API em `apps/api` recebe requisicoes e encaminha para modulos em `modules/`.
3. Camada `platform/` provê persistencia, telemetria e integracoes locais.
4. Respostas retornam para os frontends via HTTP.

## Observacoes para Gemini

- Considere este repositorio como um sistema unico com tres apps especializadas.
- Ao responder sobre UI principal, priorize `apps/web`.
- Ao responder sobre operacao/administracao, priorize `apps/web-admin` e rota `/admin`.
- Ao responder sobre backend e integracao, priorize `apps/api` na porta 4000.
