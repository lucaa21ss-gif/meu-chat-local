/**
 * Contrato de tipos e modos de runbook de incidente.
 * Centraliza os valores aceitos pelo endpoint /api/incident/runbook/execute
 * e pela política de auto-healing.
 *
 * @module runbook-contract
 */

/**
 * Tipos de runbook disponíveis (campo `runbookType` no payload).
 */
export const RUNBOOK_TYPES = Object.freeze({
  MODEL_OFFLINE: "model-offline",
  DB_DEGRADED: "db-degraded",
  DISK_PRESSURE: "disk-pressure",
  BACKUP_ALERT: "backup-alert",
});

/**
 * Valores de tipo de runbook em ordem alfabética.
 */
export const RUNBOOK_TYPE_VALUES = Object.freeze(
  Object.values(RUNBOOK_TYPES).sort(),
);

/**
 * Modos de execução do runbook (campo `mode` no payload).
 */
export const RUNBOOK_MODES = Object.freeze({
  DRY_RUN: "dry-run",
  EXECUTE: "execute",
  ROLLBACK: "rollback",
});

/**
 * Valores de modo de runbook em ordem alfabética.
 */
export const RUNBOOK_MODE_VALUES = Object.freeze(
  Object.values(RUNBOOK_MODES).sort(),
);

/** Tipo de runbook padrão selecionado na inicialização do painel. */
export const DEFAULT_RUNBOOK_TYPE = RUNBOOK_TYPES.MODEL_OFFLINE;

/** Modo de execução padrão (seguro: apenas simulação sem efeitos colaterais). */
export const DEFAULT_RUNBOOK_MODE = RUNBOOK_MODES.DRY_RUN;

/** Política padrão de auto-healing disparado manualmente. */
export const DEFAULT_AUTO_HEALING_POLICY = RUNBOOK_TYPES.MODEL_OFFLINE;
