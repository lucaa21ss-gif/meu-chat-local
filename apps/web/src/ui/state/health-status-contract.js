/**
 * Contrato de status de saúde da aplicação.
 * Centraliza valores aceitos pela UI e mapeamento para labels.
 *
 * @module health-status-contract
 */

export const HEALTH_STATUSES = Object.freeze({
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy",
  OFFLINE: "offline",
  LOADING: "loading",
  UNKNOWN: "unknown",
});

export const HEALTH_STATUS_VALUES = Object.freeze(
  Object.values(HEALTH_STATUSES).sort(),
);

export const HEALTH_STATUS_LABELS = Object.freeze({
  [HEALTH_STATUSES.HEALTHY]: "saudavel",
  [HEALTH_STATUSES.DEGRADED]: "degradado",
  [HEALTH_STATUSES.UNHEALTHY]: "indisponivel",
  [HEALTH_STATUSES.OFFLINE]: "indisponivel",
  [HEALTH_STATUSES.LOADING]: "carregando",
  [HEALTH_STATUSES.UNKNOWN]: "carregando",
});

export function normalizeHealthStatus(status) {
  const normalized = String(status || HEALTH_STATUSES.UNKNOWN).toLowerCase();
  return HEALTH_STATUS_VALUES.includes(normalized)
    ? normalized
    : HEALTH_STATUSES.UNKNOWN;
}

export function getHealthStatusLabel(status) {
  const normalized = normalizeHealthStatus(status);
  return HEALTH_STATUS_LABELS[normalized] || HEALTH_STATUS_LABELS[HEALTH_STATUSES.UNKNOWN];
}
