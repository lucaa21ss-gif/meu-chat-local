/**
 * Contrato de chaves de payload consumidas no painel admin.
 *
 * @module admin-payload-contract
 */

export const ADMIN_PAYLOAD_KEYS = Object.freeze({
  HEALTH_CHECKS: "checks",

  USERS_ID: "id",
  USERS_NAME: "name",
  USERS_ROLE: "role",

  BACKUP_VALIDATION_ROOT: "validation",
  BACKUP_STATUS: "status",
  BACKUP_ITEMS: "items",
  BACKUP_ITEM_ID: "id",
  BACKUP_ITEM_FILE_NAME: "fileName",
  BACKUP_ITEM_SIZE_BYTES: "sizeBytes",
  BACKUP_ITEM_CREATED_AT: "createdAt",
  BACKUP_ITEM_VALIDATION_STATUS: "validationStatus",

  INCIDENT_ROOT: "incident",
  INCIDENT_STATUS: "status",
  INCIDENT_SUMMARY: "summary",
  INCIDENT_SEVERITY: "severity",

  AUTO_HEALING_ROOT: "autoHealing",
  AUTO_HEALING_ENABLED: "enabled",
  AUTO_HEALING_CIRCUIT: "circuit",
  AUTO_HEALING_CIRCUIT_STATE: "state",

  RUNBOOK_ID: "id",
  RUNBOOK_STEPS: "steps",
});

export const ADMIN_PAYLOAD_KEY_NAMES = Object.freeze(
  Object.keys(ADMIN_PAYLOAD_KEYS).sort(),
);
