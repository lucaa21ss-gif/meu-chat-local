---
name: code-reviewer
version: 1.1.0
description: Realiza revisão de código analisando vulnerabilidades, performance e adequação às melhores práticas.
lastReviewed: 2026-03-27
---

# Revisor de Código (Code Reviewer)

## Propósito
Esta skill fornece as orientações para realizar revisão de código, sugerindo melhorias ativas relacionadas a segurança, gargalos de performance, e legibilidade do código.

## Escopo
- Inclui analise de vulnerabilidades e riscos de seguranca.
- Inclui avaliacao de gargalos de performance e oportunidades de melhoria.
- Inclui verificacao de legibilidade, modularidade e manutencao do codigo.
- Inclui revisao de cobertura de testes e risco de regressao.
- Exclui refatoracoes amplas sem relacao direta com os achados da revisao.

## Instruções
1. Identifique os arquivos modificados ou recém-adicionados que necessitam de revisão.
2. Analise cada um arquivo em busca de possíveis vulnerabilidades de segurança.
3. Busque eventuais gargalos de performance e sugira otimizações.
4. Verifique a modularização do código e o distanciamento de más práticas como "código espaguete" (spaghetti code).
5. Forneça um resumo detalhado categorizado por nível de severidade (Alta, Média, Baixa) com exemplos práticos de como consertar o código avaliado.

## Melhores Práticas
- Sempre sugira uma correção em formato de código (exemplo prático) ao invés de apenas apontar o problema.
- Valide se testes existem para a nova lógica ou se precisam ser inseridos.
- Seja amigável porém rigoroso quanto a qualidade.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Secoes obrigatorias (Proposito, Escopo, Instrucoes, Melhores Praticas, Validacao) estao presentes.
- Achados de revisao sao classificados por severidade (Alta, Media, Baixa).
- Cada achado relevante inclui recomendacao objetiva de correcao.

## Recursos
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Catalog: https://cwe.mitre.org/
