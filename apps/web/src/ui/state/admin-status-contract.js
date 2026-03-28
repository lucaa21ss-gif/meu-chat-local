/**
 * Contrato de valores de fallback e status exibidos no painel administrativo.
 *
 * @module admin-status-contract
 */

export const ADMIN_STATUS_VALUES = Object.freeze({
  USER_ROLE_DEFAULT: "viewer",
  BACKUP_STATUS_DEFAULT: "unknown",
  INCIDENT_STATUS_DEFAULT: "normal",
  INCIDENT_SEVERITY_INFO: "info",
  CIRCUIT_STATE_DEFAULT: "closed",
  VALIDATION_STATUS_OK: "ok",
});

export const ADMIN_STATUS_KEYS = Object.freeze(
  Object.keys(ADMIN_STATUS_VALUES).sort(),
);

export const BACKUP_VALIDATION_LABELS = Object.freeze({
  OK: "Valido",
  REVIEW: "Verificar",
});

export const ADMIN_BADGE_VARIANTS = Object.freeze({
  OK: "ok",
  FAIL: "fail",
});

export const HEALTH_CHECK_LABELS = Object.freeze({
  OK: "Saudavel",
  FAIL: "Falha",
});
