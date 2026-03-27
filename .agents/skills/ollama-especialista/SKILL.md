---
name: ollama-especialista
version: 1.0.0
description: Skill especialista em Ollama para configurar, operar, depurar e otimizar inferencia local no projeto meu-chat-local. Use quando: ajustar Modelfile, validar conectividade do modelo, resolver falhas de inferencia e calibrar parametros.
lastReviewed: 2026-03-27
---

# Ollama Especialista

## Proposito
Padronizar a operacao do Ollama no projeto, com foco em estabilidade local, previsibilidade de inferencia e troubleshooting rapido em incidentes de modelo offline/degradado.

## Escopo
- Inclui configuracao de cliente Ollama no backend e conectividade por `OLLAMA_HOST`.
- Inclui ajustes em `Modelfile` e parametros de inferencia para uso local.
- Inclui diagnostico de indisponibilidade do Ollama, timeout e falhas de stream/chat.
- Inclui validacao de saude do modelo no fluxo de healthcheck da API.
- Inclui alinhamento entre execucao local nativa e execucao via Docker Compose.
- Exclui mudancas de regra de negocio fora do dominio LLM/inferencia.

## Instrucoes
1. Antes de qualquer alteracao, leia os pontos reais de integracao do repositorio:
   - `platform/llm/ollama/ollama-client.js`
   - `ollama/Modelfile`
   - `ops/docker/docker-compose.yml`
   - `modules/health/application/health-providers.js`
   - `docs/runbooks/incident-model-offline.md`
2. Se a solicitacao envolver API, payloads, formato de resposta ou parametros de geracao, consulte primeiro a documentacao oficial do Ollama:
   - API (`/api/chat`, `/api/generate`, `/api/embed`, `/api/tags`, `/api/ps`, `/api/version`)
   - Modelfile reference (parametros validos)
3. Ao ajustar conectividade do cliente:
   - Preserve fallback local para `http://127.0.0.1:11434` quando aplicavel.
   - Evite hardcode de host em camadas de negocio; prefira variavel de ambiente.
   - Valide impacto em healthcheck e rotas de chat.
4. Ao ajustar Modelfile:
   - Altere parametros de forma incremental (um bloco por vez).
   - Documente trade-offs de `temperature`, `top_p`, `num_ctx` e `repeat_penalty`.
   - Evite mudancas simultaneas amplas que dificultem rollback.
5. Em troubleshooting de Ollama offline/degradado:
   - Verifique versao: `curl http://127.0.0.1:11434/api/version`
   - Verifique modelos locais: `curl http://127.0.0.1:11434/api/tags`
   - Verifique modelos carregados: `curl http://127.0.0.1:11434/api/ps`
   - Execute smoke da API do projeto (`/healthz` e endpoints de chat) apos correcoes.
6. Em ambiente Docker:
   - Confirme a relacao `server -> OLLAMA_HOST=http://ollama:11434`.
   - Garanta que o servico `ollama` esteja saudavel antes de diagnosticar erro de aplicacao.
7. Guardrails obrigatorios:
   - Nao expor segredos/chaves em prompts, logs ou Modelfile.
   - Nao alterar porta da API do projeto (4000) sem alinhamento global.
   - Nao remover validacoes de resiliencia sem substituto equivalente.

## Melhores Praticas
- Priorizar diagnostico por evidencias: endpoint do Ollama, logs da API e health report.
- Separar erro de conectividade, erro de modelo ausente e erro de timeout.
- Usar `stream: false` em reproducoes curtas de bug para facilitar comparacao de resposta.
- Controlar variabilidade para teste com `options.seed` e temperatura baixa quando necessario.
- Tratar o Ollama como dependencia local critica e validar fallback configurado na aplicacao.

## Validacao
- Frontmatter contem `name`, `version`, `description`, `lastReviewed`.
- Secoes obrigatorias estao presentes e coerentes com dominio Ollama.
- Registry referencia o caminho correto desta skill.
- Fluxo minimo validado apos mudancas:
  - `curl http://localhost:4000/healthz`
  - `curl http://127.0.0.1:11434/api/version`

## Fontes Oficiais Incorporadas
- Ollama Docs (home): https://docs.ollama.com/
- Ollama API reference: https://docs.ollama.com/api
- Ollama Modelfile reference: https://docs.ollama.com/modelfile
- Ollama CLI reference: https://docs.ollama.com/cli
- Ollama GitHub (referencia oficial): https://github.com/ollama/ollama

## Recursos
- `platform/llm/ollama/ollama-client.js`
- `ollama/Modelfile`
- `ops/docker/docker-compose.yml`
- `modules/health/application/health-providers.js`
- `modules/chat/application/register-chat-routes.js`
- `docs/runbooks/incident-model-offline.md`
