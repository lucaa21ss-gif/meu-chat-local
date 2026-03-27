---
name: docker-especialista
version: 1.0.0
description: Skill especialista em Docker para build, runtime, compose e troubleshooting do projeto meu-chat-local. Use quando: ajustar Dockerfile, otimizar imagem, validar healthcheck, resolver erro de container e padronizar deploy local.
lastReviewed: 2026-03-27
---

# Docker Especialista

## Proposito
Orientar e executar tarefas de conteinerizacao no monorepo com foco em seguranca, reproducibilidade, performance de build e operacao local estavel.

## Escopo
- Inclui manutencao do Dockerfile da API e compose local.
- Inclui diagnostico de falhas de build, startup e healthcheck.
- Inclui otimizacao de camadas, cache e tamanho de imagem.
- Inclui alinhamento de portas, variaveis e dependencias entre containers.
- Exclui alteracoes de regra de negocio que nao sejam necessarias para runtime Docker.

## Instrucoes
1. Antes de editar, leia o baseline Docker do projeto:
   - `apps/api/Dockerfile`
   - `ops/docker/docker-compose.yml`
   - `package.json` (scripts de validacao)
2. Se houver duvida tecnica ou comportamento inesperado, consulte a documentacao oficial Docker antes de propor mudanca:
   - Docker Build best practices
   - Dockerfile reference
   - Docker Compose docs e Compose file reference
3. Ao alterar build da API:
   - Preserve estrategia multi-stage.
   - Priorize cache de dependencias por manifests (`package*.json`).
   - Evite instalar dependencias de desenvolvimento no runtime final.
4. Ao alterar compose:
   - Preserve mapeamento de portas e healthcheck funcional.
   - Verifique dependencia entre `server` e `ollama`.
   - Garanta restart policy consistente.
5. Em troubleshooting:
   - Validar build: `docker compose -f ops/docker/docker-compose.yml build`
   - Validar subida: `docker compose -f ops/docker/docker-compose.yml up -d`
   - Validar saude: `curl http://localhost:4000/healthz`
   - Inspecionar logs: `docker compose -f ops/docker/docker-compose.yml logs --tail=200 server`
6. Sempre aplicar guardrails:
   - Nao expor segredos em Dockerfile/compose.
   - Nao quebrar porta padrao da API (4000) sem alinhamento global.
   - Nao remover healthcheck sem substituto equivalente.

## Melhores Praticas
- Usar imagens base enxutas e previsiveis.
- Minimizar invalidacao de cache com ordem correta de COPY/RUN.
- Manter runtime com superficie minima (somente o necessario).
- Tratar warnings de build como sinal de melhoria, nao ignorar silenciosamente.
- Sempre validar endpoint de saude apos mudancas em container.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Build Docker conclui sem erro no compose do projeto.
- Container `server` responde 200 em `/healthz` na porta 4000.
- Nao ha regressao em `npm run verify:health` e `npm run verify:routes`.

## Recursos
- `apps/api/Dockerfile`
- `ops/docker/docker-compose.yml`
- `README.md` (secao de operacao local)
- `ops/scripts/local/verify-health.sh`
- `ops/scripts/local/verify-routes.sh`
- Oficial Docker: https://www.docker.com/
- Docker Build best practices: https://docs.docker.com/build/building/best-practices/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Compose docs: https://docs.docker.com/compose/
- Compose file reference: https://docs.docker.com/reference/compose-file/
