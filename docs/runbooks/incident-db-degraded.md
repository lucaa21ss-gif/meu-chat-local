# Runbook — Incident DB Degraded

> **Baseado em**: [docs/architecture/runbook-template.md](../architecture/runbook-template.md)  
> **ADR relacionado**: [docs/architecture/adr-index.md](../architecture/adr-index.md) — secao Incident  
> **Ultima atualizacao**: 2026-03-26

Este runbook cobre o cenario `db-degraded`, usado quando o banco SQLite ou o acesso a ele esta degradado, mas ainda existe capacidade de executar triagem e mitigacao via API. O comportamento real do endpoint `/api/incident/runbook/execute` e:

- `dry-run`: simula o plano sem alterar estado operacional;
- `execute`: move o incidente para `investigating` e depois `mitigating`;
- `rollback`: passa por `monitoring` e finaliza em `normal`.

Qualquer modo diferente de `dry-run` exige `requireOperationalApproval` com a acao `incident.runbook.execute`.

## Cobertura de approval e bypass

| Item | Estado atual |
|------|--------------|
| `dry-run` util | Sim. Permite validar sinais e plano sem alterar o estado do incidente |
| `execute` exige approval | Sim. Usa a acao `incident.runbook.execute` |
| `rollback` exige approval | Sim. Tambem depende de `incident.runbook.execute` |
| Bypass tecnico implementado | Nao |
| Procedimento alternativo atual | Migrar para [emergency-approval-outage.md](emergency-approval-outage.md) quando approvals estiver offline |

---

## Cabecalho

| Campo | Valor |
|-------|-------|
| **ID do runbook** | `rb-incident-db-degraded-001` |
| **Modulo** | `incident` |
| **Cenario** | `db-degraded` |
| **Severidade** | `P1 — Critico` |
| **Owner** | `@meu-chat-local/platform` |
| **Time acionado** | `@meu-chat-local/platform` + `@meu-chat-local/backend` + `@meu-chat-local/governance` |
| **Modo de execucao** | `dry-run` → `execute` → `rollback` |
| **Data/hora de inicio** | Preencher no acionamento |
| **Proxima atualizacao em** | Preencher no acionamento |
| **ADR relacionado** | Incident / Health / Approvals |
| **Label do PR/issue** | `risk/high` · `sla/hotfix` |

---

## 1. Contexto do incidente

### 1.1 Quando usar este runbook

Use este runbook quando houver sinais como:

- `health.checks.db` degradado ou indisponivel;
- falhas de leitura/escrita no SQLite;
- erros recorrentes em rotas que dependem de persistencia;
- aumento rapido de erros operacionais e degradacao de SLO;
- recomendacao de triagem apontando para banco como causa principal.

### 1.2 Impacto esperado

| Dimensao | Impacto |
|----------|---------|
| Usuarios afetados | Potencialmente todos os usuarios |
| Funcionalidades afetadas | Chat, usuarios, approvals, auditoria, configuracao |
| Dados em risco | Persistencia recente, trilha de auditoria e consistencia operacional |
| SLO afetado | Disponibilidade e latencia geral da API |

### 1.3 Riscos conhecidos

| Risco | Origem | Mitigacao |
|------|--------|-----------|
| Modo `execute` altera estado do incidente em duas transicoes | ADR de Incident | Sempre rodar `dry-run` antes e registrar evidencias |
| Falha no modulo de approvals bloqueia `execute` e `rollback` | contrato `requireOperationalApproval` | Escalar governance + platform antes de qualquer bypass formal |
| Falha entre `investigating` e `mitigating` deixa estado intermediario | implementacao de incident | Monitorar `incidentAfter.status` e usar rollback controlado se necessario |
| Coleta de sinais pode retornar `backupValidation.status = falha` | incident-runbook-signals | Tratar como evidencia adicional, nao como causa unica |

---

## 2. Diagnostico e pre-checks

### 2.1 Preparar variaveis de execucao

```bash
export SERVER_URL="${SERVER_URL:-http://localhost:3001}"
export ADMIN_USER_ID="${ADMIN_USER_ID:-user-default}"
export OPERATOR_USER_ID="${OPERATOR_USER_ID:-user-default}"
export INCIDENT_OWNER="${INCIDENT_OWNER:-$ADMIN_USER_ID}"
export NEXT_UPDATE_AT="${NEXT_UPDATE_AT:-$(date -u -d '+15 minutes' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(minutes=15)).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)}"
```

### 2.2 Confirmar degradacao do banco

```bash
curl -s "$SERVER_URL/readyz" | jq .

curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'

curl -s "$SERVER_URL/api/incident/status" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .

curl -s "$SERVER_URL/api/slo" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

Indicadores para seguir com o runbook:

- `checks.db` diferente de `ok`, ou erro recorrente de banco nos logs recentes;
- `status` geral diferente de `healthy`, ou alertas coerentes com degradacao de persistencia;
- impacto operacional confirmado por falhas em rotas dependentes de banco.

### 2.3 Rodar simulacao (`dry-run`) antes de alterar estado

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type db-degraded \
  --mode dry-run \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --next-update-at "$NEXT_UPDATE_AT"
```

Resultado esperado:

```json
{
  "ok": true,
  "runbook": {
    "type": "db-degraded",
    "mode": "dry-run",
    "steps": [
      {
        "step": "plan",
        "status": "simulated"
      }
    ],
    "evidence": {
      "health": { "status": "..." },
      "slo": { "status": "..." },
      "backupValidation": { "status": "..." }
    }
  }
}
```

Se o `dry-run` falhar, nao prossiga para `execute`.

---

## 3. Aprovacao operacional

O modo `execute` exige approval previa com a acao `incident.runbook.execute`.

### 3.1 Criar approval como `operator`

```bash
curl -sS -X POST "$SERVER_URL/api/approvals" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OPERATOR_USER_ID" \
  -d '{
    "action": "incident.runbook.execute",
    "reason": "Acionar runbook db-degraded para mitigar degradacao de banco",
    "windowMinutes": 30
  }' | tee /tmp/db-degraded-approval-create.json
```

### 3.2 Aprovar como `admin`

```bash
export APPROVAL_ID="$(jq -r '.approval.id' /tmp/db-degraded-approval-create.json)"

curl -sS -X POST "$SERVER_URL/api/approvals/$APPROVAL_ID/decision" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "decision": "approved",
    "reason": "Runbook db-degraded autorizado para restaurar estabilidade operacional"
  }' | jq .
```

Se approvals estiver indisponivel, interrompa aqui e escale imediatamente para `@meu-chat-local/governance` e `@meu-chat-local/platform`.

---

## 4. Execucao do runbook

### 4.1 Executar modo `execute`

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type db-degraded \
  --mode execute \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --summary "Banco degradado; mitigacao aplicada para degradacao de banco" \
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
      "severity": "critical"
    },
    "steps": [
      { "step": "triage", "status": "completed" },
      { "step": "mitigation", "status": "completed" }
    ]
  }
}
```

O artefato JSON gerado pelo script fica em `artifacts/runbooks/runbook-db-degraded-<timestamp>.json`.

### 4.2 Verificar estado do incidente e evidencias coletadas

```bash
curl -s "$SERVER_URL/api/incident/status" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .

LATEST_ARTIFACT="$(ls -1t artifacts/runbooks/runbook-db-degraded-*.json 2>/dev/null | head -n 1)"
jq '{incidentAfter: .runbook.incidentAfter, evidence: .runbook.evidence}' "$LATEST_ARTIFACT"
```

Validar especialmente:

- `incidentAfter.status = mitigating`;
- `runbook.evidence.health.status` coerente com o estado atual;
- `runbook.evidence.recommendations` sem sinal de agravamento critico nao tratado;
- `backupValidation.status` usado apenas como sinal auxiliar.

### 4.3 Confirmar melhora operacional

```bash
curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'

curl -s "$SERVER_URL/api/slo" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

Critero minimo de sucesso:

- o banco deixa de aparecer como indisponivel total;
- o incidente permanece controlado em `mitigating` sem piora dos alerts;
- a coleta de evidencias foi registrada sem erro HTTP.

---

## 5. Rollback e normalizacao

### 5.1 Quando executar rollback

Execute rollback se:

- o `execute` piorar o estado do sistema;
- `incidentAfter.status` nao chegar a `mitigating`;
- houver erro 5xx recorrente apos a mitigacao;
- a janela operacional exigir retorno ao estado normal apos a mitigacao concluida.

### 5.2 Executar rollback controlado

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type db-degraded \
  --mode rollback \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --summary "Rollback concluido para db-degraded"
```

Resultado esperado:

```json
{
  "ok": true,
  "runbook": {
    "mode": "rollback",
    "incidentAfter": {
      "status": "normal",
      "severity": "info"
    },
    "steps": [
      { "step": "rollback-monitoring", "status": "completed" },
      { "step": "rollback-finalize", "status": "completed" }
    ]
  }
}
```

O rollback sempre deve passar por `monitoring` antes de `normal`.

---

## 6. Comunicacao e pos-incidente

### 6.1 Atualizacoes obrigatorias

- T+0: abrir issue/PR operacional com `risk/high` e `sla/hotfix`;
- T+15min: atualizar `nextUpdateAt` se o incidente permanecer ativo;
- apos `execute`: anexar o artefato JSON do runbook;
- apos `rollback`: registrar o estado final e confirmar retorno a `normal`.

### 6.2 Campos que devem ir para o pos-mortem

- `incidentBefore` e `incidentAfter` do artefato do runbook;
- `healthStatus`, `sloStatus` e `backupStatus` auditados em `incident.runbook.execute`;
- qualquer falha ou atraso no fluxo de approval;
- necessidade de atualizar ADR, gap ou checklist operacional.

---

## 7. Evidencias minimas esperadas

- JSON do `dry-run` com `step = plan`;
- JSON da criacao e decisao de approval;
- artefato `artifacts/runbooks/runbook-db-degraded-*.json` do `execute`;
- resposta de `/api/incident/status` apos `execute`;
- artefato do `rollback`, se houve reversao.

Esse conjunto prova simulacao, autorizacao, execucao, coleta de evidencias e retorno controlado ao estado normal.