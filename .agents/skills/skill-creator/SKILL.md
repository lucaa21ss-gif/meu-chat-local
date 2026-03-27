---
name: skill-creator
version: 2.1.0
description: Meta-skill profissional para criar, atualizar, revisar, melhorar e migrar skills do workspace com padrao unico, SemVer, validacao e incorporacao de fontes oficiais.
lastReviewed: 2026-03-27
---

# Skill Creator Profissional

## Proposito
Esta meta-skill governa o ciclo de vida completo de skills no repositorio: create, update, review, improve e migrate.

## Escopo
- Inclui criacao de novas skills em `.agents/skills/<nome>/SKILL.md`.
- Inclui atualizacao de skills existentes sem perder contexto funcional.
- Inclui revisao de qualidade estrutural e semantica de skills.
- Inclui melhoria incremental com controle por SemVer.
- Inclui migracao faseada de skills legadas para o padrao profissional.
- Inclui incorporacao de fontes oficiais de referencia em skills tecnicas.
- Exclui mudancas de runtime de aplicacao que nao sejam sobre customizacao de agentes.

## Instrucoes
1. Identifique a operacao solicitada: `create`, `update`, `review`, `improve` ou `migrate`.
2. Se a solicitacao for ambigua, assuma `review` primeiro e proponha o fluxo seguinte.
3. Ao criar skill nova:
   - Crie pasta em kebab-case.
   - Gere `SKILL.md` usando o template canonico em `.agents/skills/.template/SKILL.md`.
   - Preencha frontmatter obrigatorio: `name`, `version`, `description`, `lastReviewed`.
4. Ao atualizar skill existente:
   - Preserve intencao original e contratos da skill.
   - Reestruture para o padrao profissional sem remover utilidade existente.
   - Atualize `lastReviewed` e aplique bump de versao conforme SemVer.
5. Em skills tecnicas (ex.: Docker, segurança, framework, linguagem):
   - Consulte documentacao oficial do dominio antes de finalizar a resposta.
   - Incorpore no `SKILL.md` uma secao de fontes oficiais com links canônicos.
   - Priorize sempre documentacao oficial sobre blog posts ou fontes nao verificadas.
6. Ao revisar skill:
   - Verifique se possui secoes obrigatorias: Proposito, Escopo, Instrucoes, Melhores Praticas.
   - Verifique se o frontmatter esta valido e consistente com o nome da pasta.
7. Ao melhorar skill:
   - Aplique melhorias incrementais guiadas por lacunas observadas.
   - Registre claramente o que mudou e por que melhorou.
8. Ao migrar skills legadas:
   - Migre em lotes pequenos (2-3 skills por ciclo).
   - Priorize skills mais usadas pelo projeto.
9. Sempre executar guardrails antes de concluir:
   - Nao editar arquivos fora de customizacoes sem solicitacao explicita.
   - Nao usar nomes fora de kebab-case.
   - Nao publicar skill sem frontmatter obrigatorio.
   - Nao citar fonte oficial sem verificar link e relevancia para o dominio da skill.

## Politica SemVer
- `patch`: ajustes textuais, clarificacao de instrucoes, correcoes sem mudar comportamento principal.
- `minor`: nova capacidade sem quebrar comportamento existente.
- `major`: alteracao de comportamento, escopo ou contrato que impacta uso anterior.

## Melhores Praticas
- Usar linguagem literal e orientada a execucao para facilitar entendimento por IA.
- Manter descricao com gatilhos de descoberta (Use quando: ...).
- Evitar escopo amplo demais; declarar o que a skill faz e o que nao faz.
- Manter consistencia entre nome da pasta e campo `name` no frontmatter.
- Em mudancas arquiteturais de contexto, alinhar tambem `CONTEXT.md`, `README.md` e `GEMINI.md`.
- Em skills tecnicas, manter uma secao dedicada de `Fontes Oficiais Incorporadas`.

## Validacao
- Checklist minimo:
  - Frontmatter valido com `name`, `version`, `description`, `lastReviewed`.
  - Secoes obrigatorias presentes e coerentes.
  - Nome da skill em kebab-case.
  - Sem contradicoes entre escopo e instrucoes.
   - Para skills tecnicas, secao de fontes oficiais presente com links validos.

## Recursos
- Template canonico: `.agents/skills/.template/SKILL.md`
- Skills existentes para referencia: `.agents/skills/`
