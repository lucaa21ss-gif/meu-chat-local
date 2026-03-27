# Runbook — Backup Restore

> **Baseado em**: [`docs/architecture/runbook-template.md`](../architecture/runbook-template.md)  
> **ADR relacionado**: [`docs/architecture/adr-index.md`](../architecture/adr-index.md) — secao Backup  
> **Gaps relacionados**: Gap #9 (`requireOperationalApproval` em emergencia) e Gap #11 (backup sem passphrase nao cifrado)  
> **Ultima atualizacao**: 2026-03-26

Este runbook cobre o cenario de restauracao de backup quando o sistema precisa recuperar rapidamente o estado persistido local. O fluxo segue o contrato atual do modulo `backup`: `export` e `validate` exigem role `admin`, `restore` exige `admin` **e** aprovacao operacional previa.

## Cobertura de approval e bypass

| Item | Estado atual |
|------|--------------|
| `dry-run` util | Nao para o restore em si. Ha apenas pre-checks e simulacoes auxiliares via `backup.validate` e `runbook-incident --type backup-alert --mode dry-run` |
| `execute` exige approval | Sim. Usa a acao `backup.restore` |
| `rollback` automatizado do restore | Nao. O rollback depende de restaurar outro snapshot valido |
| Bypass tecnico implementado | Nao |
| Procedimento alternativo atual | Migrar para [emergency-approval-outage.md](emergency-approval-outage.md) quando approvals estiver offline |

---

## Cabecalho

| Campo | Valor |
|-------|-------|
| **ID do runbook** | `rb-backup-restore-001` |
| **Modulo** | `backup` |
| **Cenario** | `backup-restore` |
| **Severidade** | `P1 — Critico` |
| **Owner** | `@meu-chat-local/platform` |
| **Time acionado** | `@meu-chat-local/platform` + `@meu-chat-local/governance` + `@meu-chat-local/backend` |
| **Modo de execucao** | `dry-run` → `execute` → `rollback` (se necessario) |
| **Data/hora de inicio** | Preencher no acionamento |
| **Proxima atualizacao em** | Preencher no acionamento |
| **ADR relacionado** | Backup / Approvals / Incident Runbook Signals |
| **Label do PR/issue** | `risk/high` · `sla/hotfix` · `governance/compliance-gap` (se bypass emergencial for usado) |

---

## 1. Contexto do incidente

### 1.1 Quando usar este runbook

Use este runbook quando houver pelo menos um dos sinais abaixo:

- corrupcao ou indisponibilidade do banco SQLite principal;
- perda de arquivos de `uploads` ou `documents`;
- necessidade de rollback operacional apos mudanca destrutiva;
- falha de integridade detectada em `/api/integrity/verify`;
- incidente `backup-alert` ou `db-degraded` com recomendacao explicita de restore.

### 1.2 Impacto esperado

| Dimensao | Impacto |
|----------|---------|
| Usuarios afetados | Todos os usuarios que dependem do estado persistido atual |
| Funcionalidades afetadas | Chat, usuarios, auditoria, configuracoes e artefatos locais |
| Dados em risco | Banco SQLite, uploads, documentos e trilha operacional recente |
| SLO afetado | Disponibilidade geral e consistencia de dados |

### 1.3 Riscos conhecidos deste procedimento

| Risco | Origem | Mitigacao |
|------|--------|-----------|
| Restore sobrescreve o estado atual | ADR do modulo Backup | Exportar snapshot atual antes de restaurar |
| Approval offline bloqueia restore | Gap #9 | Escalar governance + platform; registrar excecao operacional se houver bypass formal |
| Backup sem passphrase nao e cifrado | Gap #11 | Preferir sempre backup cifrado; nunca trafegar passphrase em query string |
| Crash apos restore e antes de auditoria | Gap #8 | Validar trilha de auditoria logo apos a execucao |

---

## 2. Diagnostico e pre-checks

### 2.1 Confirmar estado do sistema

```bash
export SERVER_URL="${SERVER_URL:-http://localhost:3001}"
export ADMIN_USER_ID="${ADMIN_USER_ID:-user-default}"
export OPERATOR_USER_ID="${OPERATOR_USER_ID:-user-default}"
export BACKUP_PASSPHRASE="${BACKUP_PASSPHRASE:-}"

curl -s "$SERVER_URL/readyz" | jq .

curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'

curl -s "$SERVER_URL/api/integrity/status?refresh=true" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .

curl -s "$SERVER_URL/api/storage/usage" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

### 2.2 Validar backups recentes antes de qualquer restore

```bash
curl -s "$SERVER_URL/api/backup/validate?limit=3" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -H "x-backup-passphrase: $BACKUP_PASSPHRASE" | jq .
```

Critero minimo para seguir:

- `validation.status` deve ser `ok` ou `alerta` com ao menos um artefato utilizavel;
- o arquivo escolhido para restore deve ser o mais recente valido para o cenario;
- se todos os itens retornarem `falha`, interromper e escalar para `@meu-chat-local/platform`.

### 2.3 Coletar sinais operacionais com o script de incidente

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type backup-alert \
  --mode dry-run \
  --actor "$ADMIN_USER_ID" \
  --backup-passphrase "$BACKUP_PASSPHRASE"
```

Use o resultado para registrar baseline de `health`, `backupValidation`, `recentErrors` e `recommendations` antes da mitigacao.

---

## 3. Preparacao da janela de restore

### 3.1 Exportar snapshot do estado atual antes de sobrescrever

Mesmo em incidente, gere um backup do estado atual para viabilizar rollback.

```bash
mkdir -p artifacts/backups/manual

curl -sS "$SERVER_URL/api/backup/export" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -H "x-backup-passphrase: $BACKUP_PASSPHRASE" \
  -o "artifacts/backups/manual/pre-restore-$(date -u +%Y%m%dT%H%M%SZ).tgz"
```

### 3.2 Registrar aprovacao operacional

O contrato atual exige aprovacao para a acao `backup.restore` antes do POST de restore.

1. Criar a solicitacao de approval como `operator`:

```bash
curl -sS -X POST "$SERVER_URL/api/approvals" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OPERATOR_USER_ID" \
  -d '{
    "action": "backup.restore",
    "reason": "Restore emergencial para recuperar estado persistido apos incidente",
    "windowMinutes": 30
  }' | tee /tmp/backup-approval-create.json
```

2. Extrair o `approval.id` retornado:

```bash
export APPROVAL_ID="$(jq -r '.approval.id' /tmp/backup-approval-create.json)"
echo "$APPROVAL_ID"
```

3. Aprovar como `admin`:

```bash
curl -sS -X POST "$SERVER_URL/api/approvals/$APPROVAL_ID/decision" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "decision": "approved",
    "reason": "Restore autorizado para recuperacao operacional"
  }' | jq .
```

Se a etapa 3 falhar por indisponibilidade do modulo de approvals, **nao** execute o restore diretamente sem o procedimento emergencial definido pelo time de governance. Nesse caso, registrar incidente com `risk/high` e escalar imediatamente.

---

## 4. Procedimento de restore

### 4.1 Preparar o arquivo a restaurar

Defina explicitamente o artefato alvo:

```bash
export BACKUP_FILE="/caminho/absoluto/para/meu-chat-local-backup-YYYYMMDD.tgz"
test -f "$BACKUP_FILE"
```

### 4.2 Executar o restore via API

O endpoint espera `archiveBase64` no body JSON e `passphrase` no corpo para restore de backup cifrado.

```bash
export ARCHIVE_BASE64="$(base64 -w 0 "$BACKUP_FILE")"

jq -n \
  --arg archiveBase64 "$ARCHIVE_BASE64" \
  --arg passphrase "$BACKUP_PASSPHRASE" \
  '{archiveBase64: $archiveBase64, passphrase: $passphrase}' \
  > /tmp/backup-restore-payload.json

curl -sS -X POST "$SERVER_URL/api/backup/restore" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  --data @/tmp/backup-restore-payload.json | tee /tmp/backup-restore-result.json
```

Resultado esperado:

```json
{
  "ok": true,
  "restore": {
    "encrypted": true
  }
}
```

Se a resposta for `400` com mensagem contendo `backup` ou `passphrase`, trate como erro de entrada e valide novamente o artefato e a passphrase. Se for `500`, interrompa e escale.

### 4.3 Validar o sistema restaurado

```bash
curl -s "$SERVER_URL/api/backup/validate?limit=3" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -H "x-backup-passphrase: $BACKUP_PASSPHRASE" | jq .

curl -s "$SERVER_URL/api/health" \
  -H "x-user-id: $ADMIN_USER_ID" | jq '{status, checks, alerts}'

curl -s "$SERVER_URL/api/integrity/verify" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{}' | jq .
```

### 4.4 Executar teste de DR para confirmar recuperacao

```bash
bash ops/scripts/local/disaster-recovery-test.sh \
  --server "$SERVER_URL" \
  --actor "$ADMIN_USER_ID" \
  --scenario "post-restore-$(date -u +%Y%m%dT%H%M%SZ)" \
  --passphrase "$BACKUP_PASSPHRASE"
```

Seguir apenas se:

- `report.status` retornar sucesso ou equivalente aprovado;
- `rtoMs` estiver dentro da janela operacional aceita;
- `/api/health` nao retornar `critical`.

---

## 5. Rollback do proprio restore

### 5.1 Quando reverter

Reverta imediatamente se qualquer um dos sinais abaixo ocorrer apos o restore:

- `/api/health` retornar `critical`;
- `integrity.verify` reportar `mismatches` ou arquivos ausentes criticos;
- usuarios nao conseguirem abrir conversas ou listar dados basicos;
- `backup.validate` retornar `falha` para o artefato restaurado;
- a trilha de auditoria nao registrar `backup.restore`.

### 5.2 Como reverter

Use o snapshot gerado em 3.1 como artefato de rollback e repita o mesmo procedimento da secao 4, trocando `BACKUP_FILE` para o arquivo `pre-restore-*.tgz`.

Tambem atualize o incidente para `monitoring` durante a reversao:

```bash
curl -sS -X PATCH "$SERVER_URL/api/incident/status" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -d '{
    "status": "monitoring",
    "severity": "high",
    "summary": "Rollback de restore de backup em andamento"
  }' | jq .
```

---

## 6. Comunicacao e pos-incidente

### 6.1 Atualizacoes obrigatorias

- T+0: abrir issue ou PR operacional com `risk/high` e `sla/hotfix`;
- T+30min: atualizar incidente com `nextUpdateAt` novo;
- apos restore: anexar os JSONs de `backup.validate`, `health`, `integrity.verify` e `disaster-recovery-test`;
- ate 48h: registrar pos-mortem e atualizar a tabela de gaps se houve bypass emergencial ou falha de approval.

### 6.2 Acoes de documentacao

- [ ] Atualizar [`README.md`](../../README.md) se o procedimento mudar
- [ ] Atualizar [`docs/architecture/adr-index.md`](../architecture/adr-index.md) se o risco residual mudar
- [ ] Atualizar [`docs/architecture/teams.md`](../architecture/teams.md) se os owners/escalonamentos mudarem
- [ ] Atualizar este runbook com a licao aprendida do incidente

---

## 7. Evidencias esperadas

Cole ou anexe ao incidente/PR operacional:

- JSON da criacao e decisao de approval;
- JSON do POST `/api/backup/restore`;
- JSON do GET `/api/backup/validate` pos-restore;
- JSON do POST `/api/integrity/verify`;
- resumo do script `disaster-recovery-test.sh` com `status`, `rtoMs` e `reportPath`.

Esse conjunto minimo prova: autorizacao, execucao, validacao e recuperacao operacional apos o restore.