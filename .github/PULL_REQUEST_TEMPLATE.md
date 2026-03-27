## Resumo
- O que mudou:
- Por que mudou:

## Classificacao
- Area: `area/backend` | `area/platform` | `area/frontend` | `area/docs`
- Risco: `risk/low` | `risk/medium` | `risk/high`
- SLA alvo: `sla/hotfix` | `sla/1d` | `sla/2d` | `sla/3d`

## Impacto arquitetural
- ADR afetado: <!-- ex: Mini-ADR inline — chat/application -->
- Gap de compliance afetado (se houver): <!-- vincular item na tabela de gaps do README -->

## Validacao
- [ ] Testes executados localmente (`npm test` ou suite do modulo)
- [ ] Checklist ADR do modulo/camada revisada
- [ ] Links e evidencias de codigo atualizados no README (quando aplicavel)
- [ ] Labels obrigatorias aplicadas: `area/*`, `risk/*`, `sla/*`

## Rollback
- Estrategia de rollback:
- Sinais para abortar deploy:

---

> **Regras rapidas:**
> 1. Se mudar rota HTTP → preencher "ADR afetado" com o Mini-ADR inline correspondente.
> 2. Se `risk/high` → detalhar rollback antes de solicitar merge.
> 3. Se compliance → adicionar label `governance/compliance-gap` + vincular gap na tabela do README.
> 4. Se ADR for criado ou alterado → adicionar label `governance/adr-update`.
