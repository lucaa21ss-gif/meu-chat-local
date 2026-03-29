# Runbook: Teste de Stress do "Botão de Pânico" (AbortController)

## Objetivo

Confirmar que o Graceful Shutdown cancela cirurgicamente as requisições ativas
no Ollama antes de fechar o processo, garantindo que nenhum ciclo de GPU/CPU
continue rodando após o `docker compose stop`.

## Pré-Requisitos

```bash
# Backend rodando em modo Docker ou direto:
docker compose --profile dev up
# ou:
node apps/api/src/entrypoints/index.js
```

## Passo 1: Disparar uma geração LONGA no chat

Envie o seguinte prompt para a IA (via interface ou curl), que forçará o modelo
a gerar centenas de tokens (~2-5 minutos de streaming):

```bash
curl -X POST http://localhost:4000/api/chat-stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Escreva um livro completo sobre Docker, Kubernetes e DevOps moderno, com exemplos práticos detalhados em cada capítulo."}'
```

*Deixe esse terminal aberto e gerando tokens.*

## Passo 2: Disparar o "Botão de Pânico"

Em outro terminal, enquanto a geração estiver ativa:

```bash
# Via Docker:
docker compose stop server

# Ou via Node direto (Ctrl+C no terminal do servidor):
# Pressione Ctrl+C no processo node
```

## Passo 3: Validar os logs do Servidor

**✅ SUCESSO** — Você deve ver esta sequência exata nos logs:

```
[Lifecycle] Sinal recebido: SIGTERM. Iniciando Graceful Shutdown...
[Lifecycle] Encerrando HTTP Server...
[Lifecycle] HTTP Server encerrado.
[Lifecycle] Executando hook de shutdown: "ai-provider-streams"...
[OllamaProvider] Abortados 1 stream(s) ativos no motor do LLM.
[Lifecycle] Hook "ai-provider-streams" concluído.
[Lifecycle] Executando hook de shutdown: "sqlite-db"...
[Lifecycle] Hook "sqlite-db" concluído.
[Lifecycle] Graceful Shutdown concluído. Sistema encerrado com segurança.
```

**❌ FALHA** — Se você não vir `ai-provider-streams` nos logs, significa que
o `app.locals.chatClient` não foi propagado corretamente pelo wiring. Verifique
`apps/api/src/bootstrap/app-create-wiring.js`.

## Passo 4: Confirmar na GPU (Opcional, NVIDIA)

```bash
# Antes do stop: utilização alta
nvidia-smi

# Após o stop: utilização deve cair a 0%
nvidia-smi

# Watch contínuo:
watch -n 1 nvidia-smi
```

## Por que este teste importa?

Sem o AbortController, o processo Node ficaria **bloqueado esperando a resposta
completa do Ollama** antes de realmente fechar. Em servidores com pouca VRAM
(ex: 8GB), isso pode causar:
- Degradação de performance nas próximas requisições
- OOM (Out of Memory) em situações de alta carga
- Containers que demoram 30+ segundos para reiniciar no Docker

Com o `cancelInFlightRequests()` ativo, o servidor responde ao SIGTERM em
**menos de 2 segundos**, liberando todos os recursos imediatamente.
