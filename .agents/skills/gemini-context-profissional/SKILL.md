---
name: gemini-context-profissional
description: Skill para orientar agentes na leitura do CONTEXT.md e na explicacao arquitetural profissional do monorepo meu-chat-local para Google AI Studio (Gemini).
---

# Gemini Contexto Profissional

## Instruções
Esta skill deve ser usada sempre que o usuario pedir analise de arquitetura, onboarding tecnico, mapeamento de pastas, ou explicacoes para Google AI Studio (Gemini).

1. Leia primeiro o arquivo `CONTEXT.md` na raiz do projeto.
2. Trate o repositorio como um unico sistema local-first em modelo monorepo.
3. Use como baseline arquitetural obrigatoria:
   - `apps/api`: backend Node.js/Express na porta 4000.
   - `apps/web`: frontend do usuario servido pela API.
   - `apps/web-admin`: painel operacional servido em `/admin`.
4. Ao explicar estrutura, sempre mapeie tambem os dominios de suporte:
   - `modules/`: regras de negocio por dominio.
   - `platform/`: infraestrutura e adaptadores tecnicos.
   - `shared/`: contratos e utilitarios compartilhados.
   - `ops/`: scripts de operacao, validacao e distribuicao.
5. Quando houver duvida na pergunta do usuario, priorize a interpretacao abaixo:
   - Tema de interface principal -> `apps/web`.
   - Tema de administracao/operacao -> `apps/web-admin`.
   - Tema de API, integracao e runtime -> `apps/api`.
6. Em respostas tecnicas, use termos padrao da industria em Ingles (`backend`, `frontend`, `runtime`, `endpoint`, `build`, `deploy`) com explicacao breve em Portugues na primeira ocorrencia.
7. Ao sugerir alteracoes de codigo, mantenha separacao de responsabilidades e indique exatamente os arquivos a editar.
8. Antes de concluir, valide consistencia entre explicacao textual e estrutura real do repositorio.

## Melhores Práticas
- Sempre confirmar primeiro se `CONTEXT.md` esta atualizado com o estado real do projeto.
- Nao inventar componentes, rotas ou tecnologias que nao existam no repositorio.
- Nao misturar papeis entre `apps/web` e `apps/web-admin`.
- Nao assumir cloud obrigatoria: preservar o direcionamento local-first do projeto.
- Em mudancas arquiteturais relevantes, recomendar atualizacao conjunta de `CONTEXT.md`, `README.md` e `GEMINI.md`.
- Quando a tarefa envolver operacao local, lembrar checks minimos: `release:local`, `verify:health` e `verify:routes`.
- Evitar alteracoes de estilo global fora do escopo da solicitacao.

## Recursos
- Contexto principal: `CONTEXT.md`
- Guia para Gemini: `GEMINI.md`
- Arquitetura e operacao: `README.md`
- Referencia de organizacao por dominio: `modules/`, `platform/`, `shared/`, `ops/`
