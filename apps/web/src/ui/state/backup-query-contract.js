/**
 * Contrato de parâmetros de query para endpoints de backup.
 *
 * @module backup-query-contract
 */

import { API_ENDPOINTS } from "./api-endpoints-contract.js";

export const BACKUP_QUERY_DEFAULTS = Object.freeze({
  VALIDATE_LIMIT: 10,
});

export const BACKUP_QUERY_KEYS = Object.freeze(
  Object.keys(BACKUP_QUERY_DEFAULTS).sort(),
);

export function normalizeBackupValidateLimit(limit) {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return BACKUP_QUERY_DEFAULTS.VALIDATE_LIMIT;
  }
  return Math.floor(parsed);
}

export function buildBackupValidateUrl(limit) {
  const resolvedLimit = normalizeBackupValidateLimit(limit);
  return `${API_ENDPOINTS.BACKUP_VALIDATE}?limit=${resolvedLimit}`;
}
