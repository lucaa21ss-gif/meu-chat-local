# Runbook — Emergency Approval Outage

> **Baseado em**: [docs/architecture/runbook-template.md](../architecture/runbook-template.md)  
> **Gap relacionado**: Gap #9 em [README.md](../../README.md)  
> **Ultima atualizacao**: 2026-03-26

Este runbook cobre o cenario em que o modulo de aprovacoes operacionais esta indisponivel exatamente quando uma operacao critica precisa ser executada. O estado atual da aplicacao e importante:

- **nao existe** bypass tecnico implementado com `EMERGENCY_BYPASS=true`;
- as rotas criticas continuam bloqueando em `requireOperationalApproval`;
- apenas modos de simulacao (`dry-run`) permanecem disponiveis onde o codigo permite.

O objetivo deste documento e padronizar a resposta operacional temporaria ate que o bypass auditado exista em codigo.

## Cobertura de approval e bypass

| Item | Estado atual |
|------|--------------|
| `dry-run` util | Sim. Este runbook existe exatamente para preservar simulacoes e coletas de evidencia |
| Operacoes destrutivas sem approval funcional | Continuam bloqueadas pelo codigo atual |
| Bypass tecnico implementado | Nao |
| Decisao manual temporaria | Sim. Exige registro formal triplo entre governance, platform e backend |
| Destino futuro | Ser substituido por fluxo auditado com `EMERGENCY_BYPASS` |

---

## Cabecalho

| Campo | Valor |
|-------|-------|
| **ID do runbook** | `rb-emergency-approval-outage-001` |
| **Modulo** | `governance` / transversal |
| **Cenario** | `approval-outage-during-critical-operation` |
| **Severidade** | `P1 — Critico` |
| **Owner** | `@meu-chat-local/governance` |
| **Times acionados** | `@meu-chat-local/governance` + `@meu-chat-local/platform` + `@meu-chat-local/backend` |
| **Modo de execucao** | `dry-run` + escalonamento manual |
| **Data/hora de inicio** | Preencher no acionamento |
| **Proxima atualizacao em** | Preencher no acionamento |
| **Label do PR/issue** | `risk/high` · `sla/hotfix` · `governance/compliance-gap` |

---

## 1. Escopo e restricoes atuais

### 1.1 Operacoes impactadas

As seguintes operacoes dependem de `requireOperationalApproval` e ficam tecnicamente bloqueadas quando approvals esta offline:

| Operacao | Endpoint | Comportamento atual |
|----------|----------|---------------------|
| Restore de backup | `POST /api/backup/restore` | Sempre bloqueia sem approval |
| Execucao de runbook de incidente | `POST /api/incident/runbook/execute` | `execute` e `rollback` bloqueiam; `dry-run` continua disponivel |
| Teste de disaster recovery | `POST /api/disaster-recovery/test` | Sempre bloqueia sem approval |
| Cleanup destrutivo de storage | `POST /api/storage/cleanup` com `mode=execute` | `execute` bloqueia; modos nao destrutivos continuam disponiveis |

### 1.2 O que este runbook permite

- executar **somente** simulacoes e coletas de evidencia permitidas pelo codigo atual;
- abrir trilha formal de excecao operacional com participacao dos tres times;
- definir procedimento manual temporario de decisao e rastreabilidade fora da API;
- bloquear explicitamente qualquer tentativa de improvisar bypass tecnico nao implementado.

### 1.3 O que este runbook nao permite

- alterar banco SQLite diretamente para falsificar approvals como procedimento padrao;
- editar dados de approvals sem trilha formal aprovada pelos owners;
- executar operacao destrutiva via API esperando bypass inexistente;
- afirmar conformidade de compliance plena enquanto o Gap #9 nao estiver resolvido em codigo.

---

## 2. Confirmacao do incidente de governance

### 2.1 Verificar indisponibilidade do fluxo de approval

```bash
export SERVER_URL="${SERVER_URL:-http://localhost:3001}"
export ADMIN_USER_ID="${ADMIN_USER_ID:-user-default}"
export OPERATOR_USER_ID="${OPERATOR_USER_ID:-user-default}"

curl -sS -X POST "$SERVER_URL/api/approvals" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $OPERATOR_USER_ID" \
  -d '{
    "action": "incident.runbook.execute",
    "reason": "Teste de disponibilidade do modulo de approvals durante incidente",
    "windowMinutes": 30
  }' | jq .
```

Se esse passo falhar com erro HTTP ou travar por indisponibilidade do banco/modulo, registre a falha como evidencia inicial do incidente de governance.

### 2.2 Identificar qual operacao critica esta bloqueada

Preencha imediatamente:

| Campo | Valor |
|-------|-------|
| Operacao critica bloqueada | `backup.restore` \| `incident.runbook.execute` \| `disaster-recovery.test` \| `storage.cleanup.execute` |
| Motivo operacional | |
| Impacto se nao executar em ate 30 min | |
| Simulacao disponivel? | Sim / Nao |

---

## 3. Coleta de evidencias seguras

### 3.1 Simulacoes permitidas

#### Incidente (`dry-run` permitido)

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type db-degraded \
  --mode dry-run \
  --actor "$ADMIN_USER_ID"
```

#### Backup (validacao permitida)

```bash
curl -s "$SERVER_URL/api/backup/validate?limit=3" \
  -H "x-user-id: $ADMIN_USER_ID" \
  -H "x-backup-passphrase: ${BACKUP_PASSPHRASE:-}" | jq .
```

#### Storage (analise de uso permitida)

```bash
curl -s "$SERVER_URL/api/storage/usage" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

### 3.2 Evidencias obrigatorias antes de qualquer excecao manual

- [ ] resultado da tentativa falha de approval;
- [ ] resultado da simulacao `dry-run`, quando existir;
- [ ] status de `health`, `slo` e `incident/status`;
- [ ] impacto de negocio se a operacao critica nao for executada;
- [ ] consenso explicito de `governance`, `platform` e `backend` registrado fora do sistema.

---

## 4. Procedimento manual temporario

### 4.1 Escalonamento obrigatório

Acionar simultaneamente os tres times abaixo e registrar a decisao em canal persistente do incidente:

- `@meu-chat-local/governance`: decide se a excecao e aceitavel do ponto de vista de compliance;
- `@meu-chat-local/platform`: decide se a operacao e tecnicamente segura naquele momento;
- `@meu-chat-local/backend`: valida impacto de negocio e consistencia dos dados.

### 4.2 Formato minimo da decisao manual

Registrar em issue, PR operacional ou ticket equivalente:

```text
[EXCECAO OPERACIONAL] Approval offline durante operacao critica
Operacao bloqueada: <acao>
Motivo da urgencia: <impacto>
Evidencias coletadas: <links/artefatos>
Risco aceito: <descricao objetiva>
Decisao governance: aprova / nao aprova
Decisao platform: executa / nao executa
Decisao backend: impacto aceito / nao aceito
Responsavel executor: <nome>
Horario limite da janela: <timestamp>
```

Sem esse registro minimo, **nenhuma excecao manual deve prosseguir**.

### 4.3 Caminhos permitidos por tipo de operacao

| Operacao | Caminho temporario permitido |
|----------|------------------------------|
| `incident.runbook.execute` | Usar apenas `dry-run` ate haver decisao formal; se for necessario agir, executar acao manual fora do endpoint com pos-mortem obrigatorio |
| `backup.restore` | Restauracao manual somente com snapshot validado e trilha formal de excecao; depois validar `health`, `integrity` e auditoria residual |
| `disaster-recovery.test` | Nao executar teste destrutivo sem approval funcional, exceto com autorizacao formal tripla e janela controlada |
| `storage.cleanup.execute` | Preferir adiar; se inevitavel, limitar escopo e preservar backups validados |

### 4.4 Caminhos proibidos

- inserir approvals diretamente no banco sem acordo formal triplo;
- editar codigo em producao para comentar `requireOperationalApproval` como hotfix emergencial;
- executar cleanup destrutivo amplo sem snapshot anterior;
- usar este runbook como substituto permanente do fix arquitetural.

---

## 5. Recuperacao do modulo de approvals

Prioridade paralela: restaurar a capacidade normal de approval.

Checklist:

- [ ] verificar saude do banco e tabelas usadas por approvals;
- [ ] verificar se o modulo `approvals` responde a `GET /api/approvals`;
- [ ] validar criacao de approval de teste apos recuperacao;
- [ ] encerrar a janela de excecao assim que o fluxo normal voltar.

Teste de recuperacao:

```bash
curl -s "$SERVER_URL/api/approvals?status=pending&page=1&limit=5" \
  -H "x-user-id: $ADMIN_USER_ID" | jq .
```

---

## 6. Pos-incidente e follow-up obrigatorio

### 6.1 Itens obrigatorios apos a estabilizacao

- [ ] registrar pos-mortem com a decisao manual tomada;
- [ ] atualizar o gap #9 se a ocorrencia trouxer novo aprendizado;
- [ ] abrir PR ou issue para implementar o bypass auditado previsto no README;
- [ ] revisar se algum runbook concreto precisa ser ajustado por causa desta excecao.

### 6.2 Mudanca arquitetural esperada

O desfecho esperado deste runbook e abrir trabalho para implementar o que ja esta documentado como mitigacao alvo:

```text
EMERGENCY_BYPASS=true + recordAudit obrigatorio
```

Enquanto isso nao existir no codigo, este documento permanece como procedimento temporario de risco alto, nao como solucao definitiva.

---

## 7. Referencias cruzadas

| Documento | Conteudo |
|-----------|----------|
| [README.md](../../README.md) | Gap #9 e politica geral de governanca |
| [docs/architecture/adr-index.md](../architecture/adr-index.md) | Resumo dos ADRs de backup, incident, resilience e storage |
| [docs/runbooks/backup-restore.md](backup-restore.md) | Restore de backup com approval funcional |
| [docs/runbooks/incident-db-degraded.md](incident-db-degraded.md) | Runbook de incidente com `dry-run`, `execute` e `rollback` |
| [ops/scripts/local/runbook-incident.sh](../../ops/scripts/local/runbook-incident.sh) | Script local para simular e executar runbooks de incidente |