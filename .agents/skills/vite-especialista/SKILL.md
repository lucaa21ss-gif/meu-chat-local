---
name: vite-especialista
version: 1.0.0
description: Skill especialista em Vite para elevar produtividade dos agentes com entendimento de estrutura de projeto, operacao, revisao, atualizacao e build com verificacao continua de mudancas oficiais.
lastReviewed: 2026-03-28
---

# Vite Especialista

## Proposito
Capacitar agentes a trabalhar com alta eficiencia em projetos baseados em Vite, compreendendo a estrutura real do projeto, operando o ciclo de desenvolvimento com confiabilidade e mantendo as recomendacoes sempre atualizadas com fontes oficiais.

## Escopo
- Inclui entendimento da estrutura do projeto Vite: `index.html` como ponto de entrada, root, `public`, `src`, `vite.config.*`, plugins e scripts npm.
- Inclui operacao de rotina: `dev`, `build`, `preview`, configuracao de envs, troubleshooting e performance.
- Inclui revisao tecnica de configuracao Vite (plugins, alias, optimizeDeps, build target, SSR, static assets e HMR).
- Inclui atualizacao e migracao entre majors/minors com foco em breaking changes e deprecations.
- Inclui orientacao para monorepo/workspace, incluindo root alternativo e integracao backend.
- Exclui recomendacoes baseadas em suposicao sem checar documentacao oficial quando houver fonte canonica disponivel.

## Instrucoes
1. Em toda tarefa envolvendo Vite, comece com um diagnostico estrutural do projeto:
   - identificar `package.json` scripts (`dev`, `build`, `preview`),
   - identificar `vite.config.*`,
   - confirmar tipo de app (SPA, MPA, SSR, library mode, backend integration),
   - mapear uso de plugins e variaveis de ambiente.
2. Antes de recomendar mudancas, valide o estado oficial do ecossistema Vite na seguinte ordem:
   - Docs principais: https://vite.dev/guide/
   - Config reference: https://vite.dev/config/
   - Migration guide: https://vite.dev/guide/migration
   - Breaking changes: https://vite.dev/changes/
   - Releases policy: https://vite.dev/releases
   - Vite Blog: https://vite.dev/blog/
   - GitHub Releases: https://github.com/vitejs/vite/releases
   - Vite CHANGELOG: https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md
3. Gere um snapshot de atualizacao com data UTC contendo:
   - versao alvo/recomendada,
   - mudancas relevantes (breaking, deprecations, seguranca, performance),
   - impacto no projeto atual.
4. Ao operar no projeto, use sempre um fluxo seguro e reproduzivel:
   - validar Node.js suportado para a versao do Vite,
   - executar `npm run dev`, `npm run build`, `npm run preview` (ou equivalentes do workspace),
   - registrar erros e classificar por: configuracao, dependencia, plugin, compatibilidade ou runtime.
5. Ao revisar configuracao, conferir obrigatoriamente:
   - `root`, `base`, `resolve.alias`, `server`, `build`, `optimizeDeps`, `ssr`, `define`,
   - uso correto de `import.meta.env`,
   - impacto de plugins oficiais e de terceiros.
6. Em atualizacoes major, priorize migracao em etapas:
   - atualizar para ultimo patch da major atual,
   - aplicar migration guide da proxima major,
   - validar breaking changes e deprecated APIs,
   - executar testes e smoke de build antes de promover.
7. Se houver mudancas de plataforma (ex.: Rolldown, Oxc, defaults de target), explicite riscos de compatibilidade e plano de rollback.
8. Se o ambiente estiver sem acesso web, declarar limitacao e responder com:
   - ultima referencia oficial conhecida,
   - links para checagem manual,
   - riscos de desatualizacao.

## Template de Resposta Padrao
Use este formato ao responder tarefas de Vite:

1. Estado Atual Confirmado
   - Data da verificacao (UTC):
   - Fontes oficiais consultadas:
   - Versao/estado relevante:

2. Diagnostico do Projeto
   - Estrutura encontrada (root, scripts, config, plugins):
   - Tipo de app (SPA/SSR/MPA/library):
   - Riscos tecnicos identificados:

3. Mudancas Recentes da Plataforma
   - Breaking changes/deprecations relevantes:
   - Severidade: baixa, media ou alta:

4. Impacto Pratico no Projeto
   - Compatibilidade:
   - Performance:
   - Build/deploy:
   - Seguranca/manutencao:

5. Acao Recomendada
   - Passos imediatos:
   - Ajustes de codigo/config:
   - Plano de rollback:

6. Fontes
   - URLs oficiais exatas usadas.

## Checklist de Atualizacao Continua
- Diario:
  - Verificar Vite Blog e GitHub Releases para anuncios ou hotfixes.
- Semanal:
  - Revisar `vite.dev/changes` e `vite.dev/releases` para riscos de migracao.
  - Confirmar se a versao em uso ainda esta em faixa suportada.
- Por release:
  - Ler migration guide completo.
  - Validar Node.js requirement e impacto em plugins.
  - Executar build, preview e smoke tests antes de liberar.

## Melhores Praticas
- Priorizar docs oficiais sobre tutoriais de terceiros quando houver conflito.
- Evitar upgrade de major sem plano de rollback e sem leitura da migration guide.
- Tratar plugins de terceiros como superficie de risco: validar compatibilidade por versao.
- Manter scripts de build/review padronizados por workspace para reproducibilidade.
- Em monorepo, explicitar root efetivo e fronteiras entre apps para evitar diagnostico incorreto.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Secoes obrigatorias presentes: Proposito, Escopo, Instrucoes, Melhores Praticas, Validacao.
- Nome da pasta corresponde ao campo `name` em kebab-case.
- Ha regras explicitas de atualizacao continua e de consulta a fontes oficiais.
- Ha template de resposta operacional e checklist de atualizacao.

## Fontes Oficiais Incorporadas
- Vite Home: https://vite.dev/
- Vite Guide: https://vite.dev/guide/
- Vite Config: https://vite.dev/config/
- Vite Migration Guide: https://vite.dev/guide/migration
- Vite Breaking Changes: https://vite.dev/changes/
- Vite Releases Policy: https://vite.dev/releases
- Vite Blog: https://vite.dev/blog/
- Vite GitHub Releases: https://github.com/vitejs/vite/releases
- Vite CHANGELOG: https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md

## Recursos
- Template base: .agents/skills/.template/SKILL.md
- Skill de referencia no workspace: .agents/skills/react-especialista/SKILL.md
