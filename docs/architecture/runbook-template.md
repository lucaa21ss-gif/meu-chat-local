# Runbook Template — meu-chat-local

> **Instrucoes de uso**: Copie este arquivo para `docs/runbooks/<modulo>-<cenario>.md`.  
> Preencha todas as secoes antes de acionar qualquer procedimento em producao.  
> Campos marcados com `[OBRIGATORIO]` nao podem ficar em branco ao abrir um incidente real.  
> Campos marcados com `[OPCIONAL]` podem ser omitidos em cenarios simples.

---

## Cabecalho

| Campo | Valor |
|-------|-------|
| **ID do runbook** | `[OBRIGATORIO]` ex: `rb-backup-restore-001` |
| **Modulo** | `[OBRIGATORIO]` `backup` \| `incident` \| `resilience` \| `storage` \| `config-governance` |
| **Cenario** | `[OBRIGATORIO]` ex: `model-offline` \| `db-degraded` \| `disk-pressure` \| `backup-alert` |
| **Severidade** | `[OBRIGATORIO]` `P1 — Critico` \| `P2 — Alto` \| `P3 — Medio` \| `P4 — Baixo` |
| **Owner** | `[OBRIGATORIO]` Handle GitHub ou nome do responsavel que aciona |
| **Time acionado** | `[OBRIGATORIO]` `@meu-chat-local/backend` \| `@meu-chat-local/platform` \| `@meu-chat-local/governance` |
| **Modo de execucao** | `[OBRIGATORIO]` `dry-run` (simulacao) \| `execute` (producao) \| `rollback` |
| **Data/hora de inicio** | `[OBRIGATORIO]` ISO 8601 — ex: `2026-03-26T14:00:00Z` |
| **Proxima atualizacao em** | `[OBRIGATORIO]` ISO 8601 — ex: `2026-03-26T14:30:00Z` |
| **ADR relacionado** | `[OPCIONAL]` Link para o Mini-ADR inline em `docs/architecture/adr-index.md` |
| **Gap de compliance relacionado** | `[OPCIONAL]` Ex: `Gap #9 — requireOperationalApproval em emergencia` |
| **Label do PR/issue** | `[OPCIONAL]` Ex: `risk/high · governance/compliance-gap · sla/hotfix` |

---

## 1. Contexto do incidente

### 1.1 Sintomas observados

> Descreva os sinais que indicaram o problema. Inclua: endpoints com erro, metricas fora do normal, alertas disparados, relatos de usuario.

- Sintoma 1:
- Sintoma 2:
- Sintoma 3:

### 1.2 Impacto atual

| Dimensao | Descricao |
|----------|-----------|
| Usuarios afetados | ex: todos os usuarios / somente admins / usuario X |
| Funcionalidades indisponiveis | ex: chat streaming, exportacao de backup |
| Dados em risco | ex: mensagens nao persistidas, backups nao validados |
| SLO afetado | ex: disponibilidade de chat abaixo de 99% |

### 1.3 Sinais de inicio do problema

> Timestamp aproximado em que o problema comeou + primeira evidencia observada.

- **Inicio estimado**: 
- **Primeira evidencia**: 

---

## 2. Diagnostico

### 2.1 Verificacoes rapidas

Execute na ordem indicada antes de qualquer acao corretiva:

```bash
# 1. Verificar status de saude da API
curl -s http://localhost:3001/readyz | jq .

# 2. Verificar health expandido (requer network local)
curl -s http://localhost:3001/api/health \
  -H "x-user-id: user-default" | jq '{status, alerts, queue, drift}'

# 3. Verificar SLO atual
curl -s http://localhost:3001/api/slo \
  -H "x-user-id: user-default" | jq .

# 4. Verificar uso de storage
curl -s http://localhost:3001/api/storage/usage \
  -H "x-user-id: user-default" | jq .

# 5. Exportar diagnostico completo
curl -s http://localhost:3001/api/diagnostics/export \
  -H "x-user-id: user-default" | jq '{uptime, memoryMb, platform, dbPath}'
```

### 2.2 Analise de causa raiz (RCA)

> Preencher durante ou apos a mitigacao.

| Hipotese | Evidencia | Confirmada? |
|----------|-----------|-------------|
| ex: Ollama offline | `GET /readyz` retorna `503` | Sim / Nao |
| ex: Disk pressure | `storageUsagePercent > 90` | Sim / Nao |
| ex: Schema desatualizado | `migrations faltando` | Sim / Nao |

**Causa raiz identificada**: 

---

## 3. Procedimento de mitigacao

> **IMPORTANTE**: Execute sempre em `dry-run` primeiro para validar impacto antes de `execute`.

### 3.1 Pre-condicoes obrigatorias

- [ ] Backup valido disponivel antes de qualquer operacao destrutiva
- [ ] Aprovacao operacional obtida (se requerida pelo modulo — ver ADR)
- [ ] Modo `dry-run` executado e resultado inspecionado
- [ ] Sinais de saude pre-operacao coletados (linha de base para comparacao pos-operacao)

### 3.2 Passos de mitigacao

> Substitua os exemplos pelos passos especificos do cenario documentado.

**Passo 1 — [Nome do passo]**

```bash
# Descricao: o que este comando faz e por que
# Resultado esperado: o que deve aparecer no output

# Exemplo — acionar runbook via script local:
bash ops/scripts/local/runbook-incident.sh \
  --type <CENARIO> \
  --mode dry-run \
  --actor <SEU_USER_ID>
```

Resultado esperado em `dry-run`:
```json
{
  "mode": "dry-run",
  "steps": [...],
  "signals": { ... }
}
```

**Passo 2 — Executar em modo `execute` (apos validar dry-run)**

```bash
bash ops/scripts/local/runbook-incident.sh \
  --type <CENARIO> \
  --mode execute \
  --actor <SEU_USER_ID>
```

Resultado esperado:
```json
{
  "mode": "execute",
  "steps": [
    { "action": "...", "status": "ok" },
    { "action": "...", "status": "ok" }
  ],
  "finalIncidentStatus": "mitigating"
}
```

**Passo 3 — [Passo adicional especifico do cenario]**

```bash
# Comando especifico
```

### 3.3 Verificacao pos-operacao

```bash
# Verificar que o estado do sistema normalizou
curl -s http://localhost:3001/api/health \
  -H "x-user-id: user-default" | jq '{status, alerts}'

# Verificar scorecard operacional
curl -s http://localhost:3001/api/scorecard \
  -H "x-user-id: user-default" | jq '{status, approvalsPending}'

# Verificar status de integridade (quando aplicavel)
curl -s http://localhost:3001/api/integrity/status \
  -H "x-user-id: user-default" | jq .
```

Criterios de sucesso:
- [ ] `/api/health` retorna `status: "healthy"` ou `status: "degraded"` sem alertas criticos
- [ ] Funcionalidades impactadas voltaram a operar normalmente
- [ ] Nenhuma mensagem de usuario perdida
- [ ] Auditoria registrada para todas as operacoes executadas

---

## 4. Rollback

> Preencher **antes** de executar o passo 2 (obrigatorio para `risk/high`).

### 4.1 Estrategia de rollback

| Operacao | Como reverter | Comando |
|----------|---------------|---------|
| ex: restore de backup | Restaurar backup anterior | `bash ops/scripts/local/runbook-incident.sh --type <CENARIO> --mode rollback` |
| ex: mudanca de config | Reverter via config-governance | `POST /api/config/versions/:id/rollback` |
| ex: execucao de DR | Confirmar passagem por estado `monitoring` | `PATCH /api/incident/status` com `status: monitoring` |

### 4.2 Sinais para abortar e acionar rollback

Aborte o procedimento e inicie rollback imediatamente se:

- [ ] `/api/health` retornar `status: "critical"` apos a operacao
- [ ] Perda de mensagens detectada na verificacao pos-operacao
- [ ] Backup report retornar `valid: false` apos restore
- [ ] Integridade com `mismatches > 0` em arquivos criticos
- [ ] Qualquer erro HTTP 5xx inesperado nos endpoints verificados

### 4.3 Procedimento de rollback

```bash
# Rollback via runbook script
bash ops/scripts/local/runbook-incident.sh \
  --type <CENARIO> \
  --mode rollback \
  --actor <SEU_USER_ID>

# Ou: rollback de estado de incidente direto via API
curl -s -X PATCH http://localhost:3001/api/incident/status \
  -H "Content-Type: application/json" \
  -H "x-user-id: <SEU_USER_ID>" \
  -d '{"status": "monitoring", "severity": "high", "summary": "Revertendo mitigacao"}'
```

---

## 5. Comunicacao e escalonamento

### 5.1 Cronograma de atualizacoes

| Tempo desde inicio | Acao |
|--------------------|------|
| T+0 | Abrir issue ou PR com label `sla/hotfix` + `risk/high`; notificar owner do modulo |
| T+30min | Atualizar status do incidente em `/api/incident/status` com proximo `nextUpdateAt` |
| T+1h sem resolucao | Escalar para `@meu-chat-local/governance` + `@meu-chat-local/platform` simultaneamente |
| T+4h sem resolucao | Acionar modo de emergencia documentado no Gap #9 (se disponivel) |

### 5.2 Informacoes para comunicado de status

```
[INCIDENTE] <Titulo curto do problema>
Inicio: <timestamp ISO>
Impacto: <funcionalidades afetadas>
Status atual: investigating | mitigating | monitoring | normal
Proxima atualizacao: <timestamp ISO>
Owner: <nome/handle>
```

---

## 6. Pos-incidente (pos-mortem)

> Preencher em ate 48 horas apos resolucao total do incidente.

### 6.1 Linha do tempo

| Timestamp | Evento |
|-----------|--------|
| | Inicio do problema detectado |
| | Runbook acionado |
| | Mitigacao aplicada |
| | Sistema normalizado |
| | Pos-mortem iniciado |

### 6.2 Impacto total

- **Duracao do incidente**: 
- **Usuarios impactados**: 
- **Dados afetados**: 
- **SLO final**: disponibilidade no periodo =

### 6.3 Causa raiz confirmada

> Descricao tecnica detalhada da causa raiz identificada.

### 6.4 Acoes corretivas

| Acao | Responsavel | Prazo | Issue/PR |
|------|------------|-------|----------|
| ex: Adicionar auditoria em PATCH /api/users/:id/role | @meu-chat-local/backend | 1 sprint | — |
| ex: Implementar modo de bypass auditado para DR em emergencia | @meu-chat-local/platform | 2 sprints | — |

### 6.5 Atualizacoes de documentacao necessarias

- [ ] Gap de compliance afetado atualizado na tabela do README (severidade/status)
- [ ] ADR do modulo atualizado se decisao arquitetural foi alterada
- [ ] Este runbook atualizado com evidencias e licoes aprendidas
- [ ] `CHANGELOG.md` atualizado com o incidente e resolucao

---

## 7. Evidencias e referencias

### 7.1 Outputs coletados

> Cole aqui os JSONs de resposta relevantes das chamadas de API executadas.

```json
// GET /api/health — pre-operacao
{}

// GET /api/health — pos-operacao
{}

// Resultado do runbook execute
{}
```

### 7.2 Referencias

| Documento | Link |
|-----------|------|
| ADR do modulo | [`docs/architecture/adr-index.md`](adr-index.md) |
| Times e escalonamento | [`docs/architecture/teams.md`](teams.md) |
| Indice de runbooks | [`docs/runbooks/README.md`](../runbooks/README.md) |
| Exemplo concreto preenchido | [`docs/runbooks/backup-restore.md`](../runbooks/backup-restore.md) |
| Exemplo concreto de modelo offline | [`docs/runbooks/incident-model-offline.md`](../runbooks/incident-model-offline.md) |
| Exemplo concreto de incidente | [`docs/runbooks/incident-db-degraded.md`](../runbooks/incident-db-degraded.md) |
| Exemplo de excecao operacional | [`docs/runbooks/emergency-approval-outage.md`](../runbooks/emergency-approval-outage.md) |
| Script de runbook | [`ops/scripts/local/runbook-incident.sh`](../../ops/scripts/local/runbook-incident.sh) |
| Script de DR test | [`ops/scripts/local/disaster-recovery-test.sh`](../../ops/scripts/local/disaster-recovery-test.sh) |
| Gaps de compliance | `README.md` — secao "Gaps de compliance" |
| Template de PR | [`.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md) |

---

*Runbook gerado a partir de [`docs/architecture/runbook-template.md`](runbook-template.md) — versao base 2026-03-26*
