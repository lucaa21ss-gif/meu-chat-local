/**
 * Contrato de endpoints da API consumidos pelo frontend.
 * Centraliza todos os paths de URL para evitar literais dispersos
 * nos componentes e facilitar mudanças de roteamento.
 *
 * @module api-endpoints-contract
 */

/**
 * Endpoints agrupados por domínio.
 *
 * Cada valor é o path relativo usado com fetchJson() ou fetch().
 * Todos os paths começam com "/api/" conforme convenção do projeto.
 */
export const API_ENDPOINTS = Object.freeze({
  /** Saúde pública do servidor (sem autenticação) */
  HEALTH: "/api/health",
  /** Saúde administrativa (requer contexto admin) */
  HEALTH_ADMIN: "/api/health/public",

  /** Envio de mensagem ao modelo LLM */
  CHAT: "/api/chat",

  /** Listagem de usuários */
  USERS: "/api/users",

  /** Validação de backups disponíveis */
  BACKUP_VALIDATE: "/api/backup/validate",
  /** Exportação de backup como arquivo */
  BACKUP_EXPORT: "/api/backup/export",

  /** Status do incidente ativo */
  INCIDENT_STATUS: "/api/incident/status",
  /** Execução de runbook de incidente */
  INCIDENT_RUNBOOK_EXECUTE: "/api/incident/runbook/execute",

  /** Status do auto-healing */
  AUTO_HEALING_STATUS: "/api/auto-healing/status",
  /** Disparo manual de auto-healing */
  AUTO_HEALING_EXECUTE: "/api/auto-healing/execute",
});

/**
 * Chaves do mapa de endpoints em ordem alfabética.
 */
export const API_ENDPOINT_KEYS = Object.freeze(
  Object.keys(API_ENDPOINTS).sort(),
);
