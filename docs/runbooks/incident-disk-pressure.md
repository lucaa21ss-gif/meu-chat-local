# Runbook — Incident Disk Pressure

> **Baseado em**: [docs/architecture/runbook-template.md](../architecture/runbook-template.md)  
> **ADR relacionado**: [docs/architecture/adr-index.md](../architecture/adr-index.md) — secoes Incident, Storage / Capacity e Health / Observability  
> **Ultima atualizacao**: 2026-03-26

Este runbook cobre o cenario `disk-pressure`, quando o sistema detecta espaco em disco baixo ou crescimento anormal de artefatos locais. O objetivo e reduzir risco de indisponibilidade sem remover dados necessarios para recuperacao ou compliance.

O comportamento relevante do sistema hoje e:

- `/api/health` gera alerta `Espaco em disco baixo` quando `checkDisk()` nao estiver em estado saudavel;
- `runbook-incident.sh --type disk-pressure` suporta `dry-run`, `execute` e `rollback`;
- `POST /api/storage/cleanup` so executa delecao real com `mode=execute`, e isso exige `requireOperationalApproval`;
- a limpeza de backups deve respeitar politica de retencao e `preserveValidatedBackups`.

## Cobertura de approval e bypass

| Item | Estado atual |
|------|--------------|
| `dry-run` util | Sim. Ha `dry-run` no runbook de incidente e no endpoint de cleanup |
| `execute` do runbook de incidente exige approval | Sim. Usa `incident.runbook.execute` |
| `execute` do cleanup exige approval | Sim. Usa `storage.cleanup.execute` |
| Bypass tecnico implementado | Nao |
| Procedimento alternativo atual | Migrar para [emergency-approval-outage.md](emergency-approval-outage.md) quando approvals estiver offline |

---

## Cabecalho

| Campo | Valor |
|-------|-------|
| **ID do runbook** | `rb-incident-disk-pressure-001` |
| **Modulo** | `incident` + `storage` |
| **Cenario** | `disk-pressure` |
| **Severidade** | `P1 — Critico` |
| **Owner** | `@meu-chat-local/platform` |
| **Times acionados** | `@meu-chat-local/platform` + `@meu-chat-local/backend` |
| **Modo de execucao** | `dry-run` → `execute` → `rollback` |
| **Data/hora de inicio** | Preencher no acionamento |
| **Proxima atualizacao em** | Preencher no acionamento |
| **Label do PR/issue** | `risk/high` · `sla/hotfix` |

---

## 1. Quando usar

Acione este runbook quando houver pelo menos um dos sinais abaixo:

- `/api/health` com alerta `Espaco em disco baixo`;
- `usagePercent` alto em `/api/storage/usage`;
- diretório de backups crescendo mais rapido que a politica de retencao prevista;
- uploads, documents ou banco pressionando o limite operacional do host;
- runbook de triagem recomendando acao de storage para estabilizar o sistema.

### 1.1 Impacto esperado

| Dimensao | Impacto |
|----------|---------|
| Usuarios afetados | Todos os usuarios se o disco saturar |
| Funcionalidades afetadas | Persistencia, uploads, backups, chat, auditoria |
| Dados em risco | Arquivos locais, snapshots e integridade de persistencia |
| SLO afetado | Disponibilidade geral e estabilidade de escrita |

---

## 2. Diagnostico e simulacao

### 2.1 Preparar variaveis

```bash
export SERVER_URL="${SERVER_URL:-http://localhost:3001}"
export ADMIN_USER_ID="${ADMIN_USER_ID:-user-default}"
export OPERATOR_USER_ID="${OPERATOR_USER_ID:-user-default}"
export INCIDENT_OWNER="${INCIDENT_OWNER:-$ADMIN_USER_ID}"
export BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"
export NEXT_UPDATE_AT="${NEXT_UPDATE_AT:-$(date -u -d '+15 minutes' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || python - <<'PY'
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc)+timedelta(minutes=15)).strftime('%Y-%m-%dT%H:%M:%SZ'))
PY
)}"
```

### 2.2 Coletar sinais de health e uso de storage

```bash
curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'

curl -s "$SERVER_URL/api/storage/usage" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .

curl -s "$SERVER_URL/api/incident/status" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

### 2.3 Executar simulacao do runbook de incidente

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type disk-pressure \
  --mode dry-run \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --backup-passphrase "$BACKUP_PASSPHRASE"
```

### 2.4 Simular cleanup sem delecao real

```bash
curl -sS -X POST "$SERVER_URL/api/storage/cleanup" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "mode": "dry-run",
    "target": "backups",
    "olderThanDays": 30,
    "maxDeleteMb": 512,
    "preserveValidatedBackups": true,
    "backupPassphrase": "'"$BACKUP_PASSPHRASE"'"
  }' | jq .
```

Validar antes de seguir:

- `health.checks.disk` realmente indica degradacao;
- o plano de cleanup mostra ganho estimado de espaco suficiente;
- backups validados permanecem protegidos no plano;
- nao existe indicio de que o problema principal seja banco ou modelo, e nao storage.

---

## 3. Approval e janela de execucao

### 3.1 Criar approval para cleanup destrutivo

O `mode=execute` de storage cleanup exige a acao `storage.cleanup.execute`.

```bash
curl -sS -X POST "$SERVER_URL/api/approvals" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OPERATOR_USER_ID" \
  -d '{
    "action": "storage.cleanup.execute",
    "reason": "Reducao emergencial de uso de disco para evitar indisponibilidade",
    "windowMinutes": 30
  }' | tee /tmp/disk-pressure-approval-create.json

export APPROVAL_ID="$(jq -r '.approval.id' /tmp/disk-pressure-approval-create.json)"

curl -sS -X POST "$SERVER_URL/api/approvals/$APPROVAL_ID/decision" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "decision": "approved",
    "reason": "Cleanup destrutivo autorizado para proteger disponibilidade do sistema"
  }' | jq .
```

Se approvals estiver offline, migrar imediatamente para [emergency-approval-outage.md](emergency-approval-outage.md).

---

## 4. Execucao controlada

### 4.1 Executar runbook de incidente em modo `execute`

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type disk-pressure \
  --mode execute \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --summary "Espaco em disco baixo; mitigacao aplicada" \
  --next-update-at "$NEXT_UPDATE_AT" \
  --backup-passphrase "$BACKUP_PASSPHRASE"
```

### 4.2 Executar cleanup real com escopo minimo necessario

Comece pelo alvo menos arriscado, normalmente `backups`, preservando backups validados.

```bash
curl -sS -X POST "$SERVER_URL/api/storage/cleanup" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "mode": "execute",
    "target": "backups",
    "olderThanDays": 30,
    "maxDeleteMb": 512,
    "preserveValidatedBackups": true,
    "backupPassphrase": "'"$BACKUP_PASSPHRASE"'"
  }' | tee /tmp/disk-pressure-cleanup-execute.json
```

Se o ganho for insuficiente, revisar o plano antes de ampliar para outros alvos.

### 4.3 Validar estabilizacao

```bash
curl -s "$SERVER_URL/api/storage/usage" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .

curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'
```

Critero minimo de sucesso:

- `usagePercent` reduzido de forma mensuravel;
- alerta de disco deixa de ser critico ou desaparece;
- backups validados continuam preservados;
- nao houve regressao de integridade ou indisponibilidade adicional.

---

## 5. Rollback e contencao

### 5.1 Quando reverter

Execute rollback operacional se:

- o cleanup removeu espaco insuficiente e aumentou risco de perda de artefatos;
- o runbook de incidente nao estabilizou o sistema;
- houve delecao indevida de artefato necessario;
- o incidente precisa retornar a `normal` apos mitigacao controlada.

### 5.2 Rollback do runbook de incidente

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type disk-pressure \
  --mode rollback \
  --actor "$ADMIN_USER_ID" \
  --owner "$INCIDENT_OWNER" \
  --summary "Rollback concluido para disk-pressure"
```

Observacao: o cleanup de arquivos nao tem rollback automatico. Por isso, o escopo inicial deve ser minimo e os backups validados precisam continuar protegidos.

---

## 6. Evidencias minimas

- JSON de `/api/health` antes e depois;
- JSON de `/api/storage/usage` antes e depois;
- resultado do cleanup `dry-run`;
- approval de `storage.cleanup.execute`;
- resultado do cleanup `execute`;
- artefato `artifacts/runbooks/runbook-disk-pressure-*.json` gerado pelo script.

---

## 7. Referencias

| Documento | Conteudo |
|-----------|----------|
| [README.md](../../README.md) | Tipos de runbook suportados e gaps de compliance |
| [docs/runbooks/README.md](README.md) | Indice dos runbooks concretos |
| [docs/runbooks/emergency-approval-outage.md](emergency-approval-outage.md) | Excecao operacional se approvals estiver offline |
| [ops/scripts/local/runbook-incident.sh](../../ops/scripts/local/runbook-incident.sh) | Execucao do runbook de incidente |