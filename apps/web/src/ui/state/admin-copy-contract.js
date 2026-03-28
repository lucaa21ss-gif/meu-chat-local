/**
 * Contrato de títulos, labels estáticos e copy fixa do painel admin.
 *
 * @module admin-copy-contract
 */

export const ADMIN_SECTION_TITLES = Object.freeze({
  ROOT: "Admin - Health",
  CHECKS: "Checks",
  USERS: "Usuarios",
  BACKUPS: "Backups",
  INCIDENTS: "Incidentes",
  RUNBOOK: "Runbook",
});

export const ADMIN_SECTION_TITLE_KEYS = Object.freeze(
  Object.keys(ADMIN_SECTION_TITLES).sort(),
);

export const ADMIN_TILE_LABELS = Object.freeze({
  STATUS: "Status",
  UPDATED_AT: "Atualizado em",
  VERIFIED_ITEMS: "Itens verificados",
  INCIDENT_STATUS: "Status incidente",
  SEVERITY: "Severidade",
  AUTO_HEALING: "Auto-healing",
  CIRCUIT: "Circuit",
  TYPE: "Tipo",
  MODE: "Modo",
  RUNBOOK_ID: "Runbook ID",
  RUNBOOK_STEPS: "Passos executados",
});

export const ADMIN_TILE_LABEL_KEYS = Object.freeze(
  Object.keys(ADMIN_TILE_LABELS).sort(),
);

export const ADMIN_STATIC_COPY = Object.freeze({
  INTRO_HINT: "Recorte inicial de paridade do painel administrativo.",
  AUTO_HEALING_ENABLED: "habilitado",
  AUTO_HEALING_DISABLED: "desabilitado",
  HEALTH_STATUS_FALLBACK: "desconhecido",
});

export const ADMIN_STATIC_COPY_KEYS = Object.freeze(
  Object.keys(ADMIN_STATIC_COPY).sort(),
);
