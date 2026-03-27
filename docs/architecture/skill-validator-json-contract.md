# Skill Validator JSON Contract

## Objetivo
Definir o contrato JSON emitido por `scripts/skill-validator.mjs` quando executado com `--json`, incluindo regras de versionamento (`schemaVersion`) e compatibilidade.

## Versao Atual
- `schemaVersion`: `1`
- Status: ativo

## Estrutura do Payload
Campos de topo esperados:
- `schemaVersion` (number)
- `meta` (object)
- `summary` (object)
- `byClass` (object)
- `filteredByClass` (object)
- `issues` (array)

### meta
- `generatedAt` (string ISO-8601)
- `gitCommit` (string ou null)

### summary
- `skillsEvaluated` (number)
- `errors` (number)
- `warnings` (number)
- `filteredErrors` (number)
- `filteredWarnings` (number)
- `strictMode` (boolean)
- `jsonMode` (boolean)
- `classFilter` (string ou null)
- `classFilters` (array de string ou null)
- `exitCode` (number)

### byClass / filteredByClass
Objeto com as classes:
- `structure`
- `consistency`
- `naming`
- `other`

Cada classe contem:
- `errors` (number)
- `warnings` (number)

### issues
Lista de objetos com:
- `level` (`error` | `warn`)
- `class` (`structure` | `consistency` | `naming` | `other`)
- `message` (string)

## Politica de Compatibilidade
- Mudancas aditivas que nao quebram consumidores: manter `schemaVersion`.
- Remocao, renomeacao, mudanca de tipo ou alteracao semantica de campos existentes: incrementar `schemaVersion`.
- Ao incrementar `schemaVersion`, atualizar este documento e os testes de contrato em `scripts/skill-validator.test.mjs`.

## Breaking Change Checklist
- Confirmar se houve remocao/renomeacao de campo existente no payload.
- Confirmar se houve mudanca de tipo (ex.: `string` para `array`) em qualquer campo existente.
- Confirmar se houve alteracao semantica de `summary`, `byClass`, `filteredByClass` ou `issues`.
- Se qualquer item acima for verdadeiro, incrementar `schemaVersion` e atualizar testes de contrato.
- Gerar e revisar o artifact `skill-validator-schema-change.md` no workflow de CI.
- Opcional: habilitar gate de drift via variavel `SKILL_SCHEMA_CONTRACT_ENFORCE=true` no CI para falhar quando houver descompasso entre contrato e payload.

## Comandos Uteis
- JSON identado:
  - `node scripts/skill-validator.mjs --strict --json`
- JSON compacto:
  - `node scripts/skill-validator.mjs --strict --json --pretty false`
- JSON em arquivo:
  - `node scripts/skill-validator.mjs --strict --json --output artifacts/skill-report.json`
