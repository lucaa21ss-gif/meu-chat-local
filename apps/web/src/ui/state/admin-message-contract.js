/**
 * Contrato de mensagens operacionais e labels de ação do painel admin.
 *
 * @module admin-message-contract
 */

export const ADMIN_OPERATION_MESSAGES = Object.freeze({
  HEALTH_UPDATED: "Status admin atualizado.",
  BACKUPS_VALIDATE_FAILED: "Falha ao validar backups.",
  BACKUP_EXPORT_START: "Iniciando exportacao de backup...",
  BACKUP_EXPORT_FAILED: "Falha ao exportar backup.",
  BACKUP_EXPORT_SUCCESS: "Backup exportado com sucesso.",
  INCIDENT_STATUS_FAILED: "Falha ao carregar status de incidentes.",
  AUTO_HEALING_START: "Executando auto-healing manual...",
  AUTO_HEALING_SUCCESS: "Auto-healing executado.",
  AUTO_HEALING_FAILED: "Falha na execucao de auto-healing.",
  RUNBOOK_SUCCESS: "Runbook executado com sucesso.",
  RUNBOOK_FAILED: "Falha ao executar runbook de incidente.",
  HEALTH_CHECK_MESSAGE_DEFAULT: "Status verificado.",
});

export const ADMIN_OPERATION_MESSAGE_KEYS = Object.freeze(
  Object.keys(ADMIN_OPERATION_MESSAGES).sort(),
);

export const ADMIN_ACTION_LABELS = Object.freeze({
  HEALTH_REFRESH_IDLE: "Atualizar",
  HEALTH_REFRESH_LOADING: "Atualizando...",
  USERS_REFRESH_IDLE: "Atualizar usuarios",
  USERS_REFRESH_LOADING: "Carregando...",
  BACKUPS_VALIDATE_IDLE: "Validar backups",
  BACKUPS_VALIDATE_LOADING: "Validando...",
  INCIDENTS_REFRESH_IDLE: "Verificar incidentes",
  INCIDENTS_REFRESH_LOADING: "Verificando...",
  AUTO_HEALING_IDLE: "Auto-healing",
  ACTION_LOADING: "Executando...",
  RUNBOOK_EXECUTE_IDLE: "Executar runbook",
  BACKUP_EXPORT_IDLE: "Exportar backup",
});

export const ADMIN_ACTION_LABEL_KEYS = Object.freeze(
  Object.keys(ADMIN_ACTION_LABELS).sort(),
);

export function buildRunbookExecutingMessage(mode) {
  return `Executando runbook (${mode})...`;
}
