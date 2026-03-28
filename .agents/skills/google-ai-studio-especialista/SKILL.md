---
name: google-ai-studio-especialista
version: 1.1.1
description: Skill especialista em Google AI Studio e Gemini API para orientar setup, uso, troubleshooting e governanca tecnica com verificacao continua de atualizacoes oficiais.
lastReviewed: 2026-03-27
---

# Google AI Studio Especialista

## Proposito
Fornecer orientacao tecnica confiavel sobre Google AI Studio e Gemini API, mantendo as respostas alinhadas ao estado mais atual da plataforma por meio de verificacao recorrente em fontes oficiais.

## Escopo
- Inclui configuracao de projetos, API keys, modelos, limites, custos e status operacional no Google AI Studio.
- Inclui orientacao de integracao com Gemini API (SDKs, endpoints, modelos, recursos e boas praticas).
- Inclui troubleshooting de erros comuns (autenticacao, rate limits, quotas, latencia e respostas inesperadas).
- Inclui monitoramento continuo de mudancas oficiais (changelog, deprecations, modelos e politicas).
- Exclui implementacao de codigo fora do contexto Google AI Studio/Gemini API sem solicitacao explicita.

## Instrucoes
1. Em toda nova solicitacao sobre Google AI Studio/Gemini API, faca uma checagem de atualizacao antes de responder tecnicamente.
2. Siga esta ordem de verificacao oficial:
   - Changelog: https://ai.google.dev/gemini-api/docs/changelog
   - Deprecations: https://ai.google.dev/gemini-api/docs/deprecations
   - Models: https://ai.google.dev/gemini-api/docs/models
   - Pricing: https://ai.google.dev/gemini-api/docs/pricing
   - Status: https://aistudio.google.com/status
   - Docs principais: https://ai.google.dev/gemini-api/docs e https://aistudio.google.com/
3. Gere um "snapshot de atualizacao" com data (UTC), fonte consultada e pontos que mudaram (modelos, limites, preco, politicas, recursos).
4. Quando identificar mudanca relevante, explicite impacto pratico para o usuario: compatibilidade, custo, performance, risco de deprecacao e ajustes recomendados.
5. Sempre priorize documentacao oficial; nao baseie decisao tecnica em fonte secundaria quando houver pagina oficial equivalente.
6. Se nao houver acesso web no momento, declare limitacao explicitamente e entregue uma resposta segura com:
   - o que foi validado localmente,
   - links oficiais para checagem manual,
   - riscos de desatualizacao.
7. Em respostas de implementacao, entregue em duas partes: "estado atual confirmado" e "acao recomendada".
8. Sempre que citar modelo, endpoint, limite ou preco, indique a fonte oficial usada na mesma resposta.

## Template de Resposta Padrao
Use este formato sempre que responder pedidos tecnicos sobre Google AI Studio/Gemini API:

1. Estado Atual Confirmado
   - Data da verificacao (UTC):
   - Fontes oficiais consultadas:
   - Itens confirmados (modelos, limites, preco, status, politicas):

2. Mudancas Recentes
   - O que mudou desde a ultima referencia conhecida:
   - Nivel de impacto: baixo, medio ou alto:

3. Impacto Pratico
   - Compatibilidade:
   - Custo:
   - Performance:
   - Risco de deprecacao:

4. Acao Recomendada
   - Passos imediatos:
   - Ajustes de codigo/configuracao:
   - Plano de rollback (se aplicavel):

5. Fontes
   - Liste URLs oficiais exatas usadas na resposta.

## Exemplo Preenchido do Template
Use como referencia de formato (os dados abaixo sao ilustrativos e devem ser revalidados a cada uso):

1. Estado Atual Confirmado
    - Data da verificacao (UTC): 2026-03-27T18:40:00Z
    - Fontes oficiais consultadas:
       - https://ai.google.dev/gemini-api/docs/changelog
       - https://ai.google.dev/gemini-api/docs/models
       - https://ai.google.dev/gemini-api/docs/pricing
       - https://aistudio.google.com/status
    - Itens confirmados (modelos, limites, preco, status, politicas):
       - Catalogo de modelos atualizado na pagina de models.
       - Precos e plano de cobranca consultados na pagina de pricing.
       - Status operacional sem incidentes criticos no momento da consulta.

2. Mudancas Recentes
    - O que mudou desde a ultima referencia conhecida:
       - Inclusao de novas variantes de modelo na listagem oficial.
    - Nivel de impacto: medio.

3. Impacto Pratico
    - Compatibilidade: revisar nome de modelo hardcoded para evitar erro de modelo indisponivel.
    - Custo: revalidar estimativa por token/imagem/video antes de liberar em producao.
    - Performance: ajustar fallback entre modelos pro e flash para latencia previsivel.
    - Risco de deprecacao: monitorar pagina de deprecations para planejar migracao antecipada.

4. Acao Recomendada
    - Passos imediatos:
       - Validar modelos permitidos no projeto atual.
       - Rodar smoke test com 2 modelos alternativos.
    - Ajustes de codigo/configuracao:
       - Mover nome de modelo para variavel de ambiente.
       - Adicionar monitoramento de erro por codigo de resposta da API.
    - Plano de rollback (se aplicavel):
       - Em falha, retornar para modelo estavel anterior via feature flag.

5. Fontes
    - https://ai.google.dev/gemini-api/docs/changelog
    - https://ai.google.dev/gemini-api/docs/models
    - https://ai.google.dev/gemini-api/docs/pricing
    - https://aistudio.google.com/status

## Melhores Praticas
- Tratar informacao de modelo preview como volatil e sinalizar risco de mudanca.
- Evitar afirmacoes absolutas sobre disponibilidade global sem consultar "available regions" e status.
- Preferir respostas com checklist executavel (setup, validacao, observabilidade e rollback).
- Usar termos tecnicos padrao em Ingles (SDK, endpoint, rate limit, deprecation, changelog) com contexto claro em Portugues.
- Manter rastreabilidade: toda recomendacao critica deve apontar para pelo menos uma fonte oficial.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Secoes obrigatorias existem: Proposito, Escopo, Instrucoes, Melhores Praticas, Validacao.
- O nome da pasta corresponde ao campo `name` em kebab-case.
- As instrucoes exigem verificacao continua de atualizacoes oficiais.
- A secao `Template de Resposta Padrao` esta presente e executavel.
- A secao `Exemplo Preenchido do Template` existe e deixa claro que os dados sao ilustrativos.
- A secao de fontes oficiais inclui links canonicos validos para Google AI Studio e Gemini API.

## Fontes Oficiais Incorporadas
- Google AI Studio: https://aistudio.google.com/
- Google AI Studio Status: https://aistudio.google.com/status
- Gemini API Docs (overview): https://ai.google.dev/gemini-api/docs
- Gemini API Changelog: https://ai.google.dev/gemini-api/docs/changelog
- Gemini API Deprecations: https://ai.google.dev/gemini-api/docs/deprecations
- Gemini API Models: https://ai.google.dev/gemini-api/docs/models
- Gemini API Pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini API Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- Gemini API Billing: https://ai.google.dev/gemini-api/docs/billing
- Gemini API Available regions: https://ai.google.dev/gemini-api/docs/available-regions
- Gemini API Terms: https://ai.google.dev/gemini-api/terms

## Recursos
- Template base: .agents/skills/.template/SKILL.md
- Skill de referencia no workspace: .agents/skills/gemini-context-profissional/SKILL.md
