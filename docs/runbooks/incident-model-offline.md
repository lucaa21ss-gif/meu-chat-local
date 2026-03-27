# Runbook — Incident Model Offline

> **Baseado em**: [docs/architecture/runbook-template.md](../architecture/runbook-template.md)  
> **ADR relacionado**: [docs/architecture/adr-index.md](../architecture/adr-index.md) — secoes Chat streaming, Chat sincrono, Health / Observability e Shared / kernel  
> **Ultima atualizacao**: 2026-03-26

Este runbook cobre o cenario `model-offline`, quando o Ollama ou o modelo principal de inferencia fica indisponivel ou degradado. O sistema ja possui mitigacao parcial na camada de resiliencia:

- `checkModel()` em `health-providers` marca `ollama: offline` e status degradado quando `chatClient.list()` nao responde;
- `executeWithModelRecovery()` tenta retry e fallback antes de devolver erro final;
- o runbook de incident suporta `dry-run`, `execute` e `rollback` para o tipo `model-offline`.

O objetivo aqui e transformar esses sinais em acao operacional previsivel, sem assumir que retry/fallback resolveu sozinho o problema.

## Cobertura de approval e bypass

| Item | Estado atual |
|------|--------------|
| `dry-run` util | Sim. Pode ser executado sem approval e gera plano/evidencias sem alterar estado operacional |
| `execute` exige approval | Sim. Usa a acao `incident.runbook.execute` |
| `rollback` exige approval | Sim. Tambem depende de `incident.runbook.execute` |
| Bypass tecnico implementado | Nao |
| Procedimento alternativo atual | Migrar para [emergency-approval-outage.md](emergency-approval-outage.md) quando approvals estiver offline |

---

## Cabecalho

| Campo | Valor |
|-------|-------|
| **ID do runbook** | `rb-incident-model-offline-001` |
| **Modulo** | `incident` + `chat` + `health` |
| **Cenario** | `model-offline` |
| **Severidade** | `P2 — Alto` |
| **Owner** | `@meu-chat-local/platform` |
| **Times acionados** | `@meu-chat-local/platform` + `@meu-chat-local/backend` |
| **Modo de execucao** | `dry-run` → `execute` → `rollback` |
| **Data/hora de inicio** | Preencher no acionamento |
| **Proxima atualizacao em** | Preencher no acionamento |
| **Label do PR/issue** | `risk/medium` ou `risk/high` · `sla/hotfix` |

---

## 1. Quando usar

Acione este runbook quando houver pelo menos um dos sinais abaixo:

- `/api/health` com `checks.model.status != healthy`;
- alerta `Modelo Ollama em degradacao/offline`;
- aumento de timeout ou falha de inferencia em `/api/chat` ou `/api/chat-stream`;
- logs repetidos de tentativa de inferencia falha, mesmo com retry/fallback;
- indisponibilidade direta do host do Ollama.

### 1.1 Impacto esperado

| Dimensao | Impacto |
|----------|---------|
| Usuarios afetados | Usuarios de chat sincrono e streaming |
| Funcionalidades afetadas | Inferencia, respostas de chat, possivel degradacao de RAG |
| Dados em risco | Historico pode registrar mensagens de usuario sem resposta final |
| SLO afetado | Latencia e taxa de erro de inferencia |

---

## 2. Diagnostico e simulacao

### 2.1 Preparar variaveis

```bash
export SERVER_URL="${SERVER_URL:-http://localhost:3001}"
export ADMIN_USER_ID="${ADMIN_USER_ID:-user-default}"
export OPERATOR_USER_ID="${OPERATOR_USER_ID:-user-default}"
export INCIDENT_OWNER="${INCIDENT_OWNER:-$ADMIN_USER_ID}"
export OLLAMA_HOST="${OLLAMA_HOST:-http://127.0.0.1:11434}"
export NEXT_UPDATE_AT="${NEXT_UPDATE_AT:-$(date -u -d '+15 minutes' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(minutes=15)).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)}"
```

### 2.2 Confirmar degradacao do modelo pela API

```bash
curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'

curl -s "$SERVER_URL/api/slo" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .

curl -s "$SERVER_URL/api/incident/status" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

Validar principalmente:

- `checks.model.status` degradado ou equivalente;
- alerta de modelo offline presente;
- degradacao de SLO coerente com falha de inferencia.

### 2.3 Confirmar indisponibilidade direta do Ollama

```bash
curl -sS "$OLLAMA_HOST/api/tags" | jq .
```

Se esse comando falhar por conexao recusada, timeout ou erro de transporte, trate como forte evidencia de `model-offline`.

### 2.4 Executar simulacao do incidente

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type model-offline \
  --mode dry-run \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER"
```

Se o `dry-run` falhar, nao prossiga para `execute`.

---

## 3. Approval e janela de mitigacao

O `execute` do runbook de incident exige a acao `incident.runbook.execute`.

### 3.1 Criar approval como `operator`

```bash
curl -sS -X POST "$SERVER_URL/api/approvals" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OPERATOR_USER_ID" \
  -d '{
    "action": "incident.runbook.execute",
    "reason": "Acionar runbook model-offline para estabilizar degradacao do modelo",
    "windowMinutes": 30
  }' | tee /tmp/model-offline-approval-create.json

export APPROVAL_ID="$(jq -r '.approval.id' /tmp/model-offline-approval-create.json)"
```

### 3.2 Aprovar como `admin`

```bash
curl -sS -X POST "$SERVER_URL/api/approvals/$APPROVAL_ID/decision" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "decision": "approved",
    "reason": "Mitigacao de model-offline autorizada para proteger disponibilidade do chat"
  }' | jq .
```

Se approvals estiver offline, migrar imediatamente para [emergency-approval-outage.md](emergency-approval-outage.md).

---

## 4. Execucao controlada

### 4.1 Executar runbook em modo `execute`

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type model-offline \
  --mode execute \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --summary "Modelo principal indisponivel; mitigacao aplicada para fallback/retry" \
  --next-update-at "$NEXT_UPDATE_AT"
```

Resultado esperado:

```json
{
  "ok": true,
  "runbook": {
    "mode": "execute",
    "incidentAfter": {
      "status": "mitigating",
      "severity": "high"
    }
  }
}
```

### 4.2 Validar evidencias e comportamento do chat

```bash
LATEST_ARTIFACT="$(ls -1t artifacts/runbooks/runbook-model-offline-*.json 2>/dev/null | head -n 1)"
jq '{incidentAfter: .runbook.incidentAfter, evidence: .runbook.evidence}' "$LATEST_ARTIFACT"

curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'
```

### 4.3 Smoke test funcional do chat

Se houver modelo secundario funcional ou recuperacao parcial, validar uma chamada simples ao endpoint de chat:

```bash
curl -sS -X POST "$SERVER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "message": "teste operacional de disponibilidade do modelo",
    "chatId": "ops-model-offline-check"
  }' | jq .
```

Se o chat continuar indisponivel, manter o incidente ativo e seguir com diagnostico de infraestrutura do Ollama.

---

## 5. Rollback e normalizacao

### 5.1 Quando executar rollback

Execute rollback quando:

- o modelo voltar a responder de forma estavel;
- os testes de chat deixarem de falhar;
- o `health.checks.model` voltar a estado saudavel;
- o incidente puder sair de `mitigating` sem risco imediato de regressao.

### 5.2 Executar rollback controlado

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type model-offline \
  --mode rollback \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --summary "Rollback concluido para model-offline"
```

Resultado esperado: passagem por `monitoring` antes de `normal`, como nos demais runbooks de incident.

---

## 6. Evidencias minimas

- JSON de `/api/health` antes e depois;
- resultado do `curl` direto em `$OLLAMA_HOST/api/tags`;
- JSON do `dry-run`;
- approval de `incident.runbook.execute`;
- artefato `artifacts/runbooks/runbook-model-offline-*.json`;
- smoke test de `/api/chat` apos mitigacao.

---

## 7. Referencias

| Documento | Conteudo |
|-----------|----------|
| [README.md](../../README.md) | Tipos de runbook suportados e trilha operacional |
| [docs/runbooks/README.md](README.md) | Indice dos runbooks concretos |
| [docs/runbooks/emergency-approval-outage.md](emergency-approval-outage.md) | Excecao operacional se approvals estiver offline |
| [ops/scripts/local/runbook-incident.sh](../../ops/scripts/local/runbook-incident.sh) | Execucao do runbook de incidente |