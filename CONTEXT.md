# CONTEXT

Este arquivo fornece as balizas arquiteturais estritas e atualizadas do projeto `@meu-chat-local` para ferramentas de assistência artificial, em especial Google AI Studio (Gemini).

## 🚀 Visão Geral e Paradigma

O repositório opera em um modelo **Local-First** rigoroso através de monorepo. O uso do motor **Ollama** garante inferências independentes e seguras (offgrid).

A aplicação foi inteiramente consolidada para operar num ecossistema unificado onde o **Backend é o maestro nativo (ESM)** em conjunto com o aplicativo cliente **React+Vite**. 

*Nota:* O repositório **NÃO DEVE** retroceder ou tentar implementar o antigo e descontinuado `apps/web-admin`. Toda parte operacional e analítica agora pertence ao painel UI do React na rota estática `/admin`.

### Modo de Serviço Bounding
- Os pacotes rodam prioritariamente na rede (LAN/Wi-Fi) expostos na porta principal de backend `4000`.
- O Frontend e o fluxo Admin consumem da mesma origem via rotas relativas.
- Jamais crie dependências de `localhost` hardcoded do lado do cliente.
- Exclusivamente implementado em **Domain-Driven Design (DDD)** para estabilização de regras de negócio.

---

## 🗺️ Mapa Topológico e Stack

### 1) Backend: `apps/api`
- **Papel:** Máquina de Inteligência e Orquestrador Central.
- **Stack:** Node.js (ECMAScript ESM) + Express + SQLite WAL.
- **Arquitetura de Limites:**
  - `entrypoints/` & `bootstrap/`: Único ponto de ligação de módulos e wiring (Injeção de Dependências Manual). Onde subimos o servidor.
  - `modules/`: Camada de domínio agnóstica de hardware. Onde vivem regras do chat, permissões (`users`) e métricas (`capacity`).
  - `platform/`: Adaptadores técnicos pesados (Rate Limiting via Memory, Client LLM e persistência relacional unificada do SQLite).
- **Trilha de Segurança:** Todas as mutações do backend precisam respeitar o Hub de Auditoria (`recordAudit`) antes de finalizar HTTP. Casos sensíveis (deleções) acionam proteção double-lock via `requireOperationalApproval`.

### 2) Cliente Dinâmico: `apps/web`
- **Papel:** SPA Front-End Principal & Admin Panel unificado.
- **Stack:** React + Vite.
- **Identidade e AI Design System:**
  - O visual do sistema é pautado no princípio de *Premium Glassmorphism*.
  - Utilizamos tokens baseados no arquivo `styles.css` customizado com fundos neurais (`ai-bg-neural`), gradientes fluídos, caixas interativas (`ai-panel`) e animações dinâmicas de chat e typing. Toda e qualquer nova tela desenhada deve ser renderizada usando estas classes nativas de imersão; fuja de marcações UI primitivas ou brancas por padrão.
- **Rotas Globais:**
  - `/`, `/app`: Imersão do Chat.
  - `/admin`: Onde visualizamos scorecard, memory-leaks, telemetria analítica e operamos os usuários.
  - `/produto`, `/guia`.

---

## ⚡ Real-Time Inferencia & Streaming

A comunicação primária entre `UI` -> `API` -> `LLM` ocorre através do padrão **Transfer-Encoding Chunked (Server-Sent Events)** para prover respostas "token-by-token" como ditam os maiores chats premium com IA.
Neste fluxo:
1. Nenhuma nova requisição de chat deve bloquear o Node (`Async`);
2. Requests passam por filas com regras de `Rate-Limiting` para segurança de saturação.
3. Se Ollama cair, o Backend possui resiliência de recovery e timeout. O fallback em inferência retenta contornar as quedas de forma silenciosa para prover o melhor User Experience antes de acusar o estresse `HttpError(504)`.

---

## 🤖 Diretrizes de Manutenção (Gemini e Cia.)

Ao propor qualquer código, certifique-se que:
- Você manteve o **ESM puro** resolvendo caminhos de maneira absoluta com as respectivas tags de extensão JavaScript (ex: `import { x } from "../../../platform/foo.js";`). Não ignore as extensões!
- Ao sugerir layout para React, empreste as paletas neons `var(--ai-accent-primary)` e classes como `ai-panel` com blur de fundo. Mantenha as sombras tecnológicas pulsantes.
- Respeite as fronteiras do DDD (Domain-Driven Design): NUNCA conecte o frontend direto contra o banco `db.js`. O caminho sempre atravessará `HTTP > Modules (Use Case) > Platform`.
