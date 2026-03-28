---
name: react-especialista
version: 1.0.0
description: Skill especialista em React para arquitetura, implementacao, migracao e troubleshooting com verificacao continua de atualizacoes oficiais da plataforma.
lastReviewed: 2026-03-27
---

# React Especialista

## Proposito
Entregar orientacao tecnica confiavel sobre React (web e ecossistema oficial), mantendo respostas atualizadas com base em fontes oficiais e verificacao recorrente de mudancas relevantes.

## Escopo
- Inclui recomendacoes de implementacao com React moderno (componentes, hooks, rendering, performance e acessibilidade).
- Inclui estrategias de migracao e upgrade de versao com foco em seguranca e compatibilidade.
- Inclui troubleshooting de erros comuns de runtime, build, hydration, estado e renderizacao.
- Inclui monitoramento continuo de atualizacoes oficiais (blog, versions, changelog e releases).
- Exclui recomendacoes baseadas em praticas legadas quando houver alternativa moderna oficial documentada.

## Instrucoes
1. Em toda solicitacao sobre React, realize uma checagem rapida de atualizacao antes de responder.
2. Siga a ordem de verificacao oficial:
   - React Blog (anuncios, breaking changes, avisos): https://react.dev/blog
   - React Versions (versao atual e historico): https://react.dev/versions
   - React Docs (guides e API reference): https://react.dev/
   - React API Reference: https://react.dev/reference/react
   - React DOM API Reference: https://react.dev/reference/react-dom
   - React Releases (GitHub): https://github.com/facebook/react/releases
   - React CHANGELOG (GitHub): https://github.com/facebook/react/blob/main/CHANGELOG.md
3. Gere um snapshot de atualizacao com data UTC e registro do que mudou: versao, notas de seguranca, recursos novos, deprecations e orientacoes de migracao.
4. Quando houver mudanca relevante, explicite impacto pratico no projeto:
   - compatibilidade,
   - risco tecnico,
   - performance,
   - acao recomendada.
5. Se detectar aviso de seguranca no React Blog ou changelog, priorize resposta de mitigacao e plano de upgrade.
6. Em recomendacoes de stack, siga a orientacao oficial do React para apps completos:
   - priorizar framework full-stack quando aplicavel,
   - evitar orientar Create React App para novos projetos (sunset oficial).
7. Se nao houver acesso web no momento, declare a limitacao e entregue resposta segura com links oficiais para verificacao manual.
8. Sempre diferencie claramente:
   - estado atual confirmado,
   - suposicao nao confirmada,
   - recomendacao operacional.

## Template de Resposta Padrao
Use este formato em respostas tecnicas sobre React:

1. Estado Atual Confirmado
   - Data da verificacao (UTC):
   - Fontes oficiais consultadas:
   - Versao/estado confirmado:

2. Mudancas Recentes
   - O que mudou:
   - Severidade: baixa, media ou alta:

3. Impacto Pratico
   - Compatibilidade:
   - Seguranca:
   - Performance:
   - Risco de regressao:

4. Acao Recomendada
   - Passos imediatos:
   - Ajustes de codigo/configuracao:
   - Plano de rollback:

5. Fontes
   - Liste as URLs oficiais exatas usadas na resposta.

## Melhores Praticas
- Priorizar API e guias oficiais do React sobre conteudo de terceiros.
- Sinalizar quando um recurso estiver em estado experimental/canary.
- Evitar sugestoes de otimizacao prematuras sem evidencias (profiling).
- Manter recomendacoes alinhadas ao React moderno e ao ecossistema atual.
- Incluir checklist objetivo para executar upgrade com baixo risco.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Secoes obrigatorias existem e sao coerentes com o escopo.
- O nome da pasta corresponde ao `name` em kebab-case.
- Existe regra explicita de verificacao continua de atualizacoes oficiais.
- Existe template padrao para respostas operacionais.

## Fontes Oficiais Incorporadas
- React Docs: https://react.dev/
- React Blog: https://react.dev/blog
- React Versions: https://react.dev/versions
- React API Reference: https://react.dev/reference/react
- React DOM API Reference: https://react.dev/reference/react-dom
- React Versioning Policy: https://react.dev/community/versioning-policy
- React Releases (GitHub): https://github.com/facebook/react/releases
- React CHANGELOG (GitHub): https://github.com/facebook/react/blob/main/CHANGELOG.md

## Recursos
- Template base: .agents/skills/.template/SKILL.md
- Skill de referencia no workspace: .agents/skills/google-ai-studio-especialista/SKILL.md
