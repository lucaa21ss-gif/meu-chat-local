/**
 * Contrato de defaults de exibição e mensagens de estado vazio do painel admin.
 *
 * @module admin-display-contract
 */

export const ADMIN_DISPLAY_DEFAULTS = Object.freeze({
  USER_NAME: "Sem nome",
  IDENTIFIER: "n/a",
  BACKUP_FILE_NAME: "backup",
});

export const ADMIN_DISPLAY_DEFAULT_KEYS = Object.freeze(
  Object.keys(ADMIN_DISPLAY_DEFAULTS).sort(),
);

export const ADMIN_EMPTY_STATE_MESSAGES = Object.freeze({
  CHECKS: "Nenhum check disponivel.",
  USERS: "Nenhum usuario retornado pela API.",
  BACKUP_VALIDATION: "Nenhuma validacao de backup disponivel.",
  BACKUP_RECENT_FILES: "Sem arquivos de backup recentes.",
});

export const ADMIN_EMPTY_STATE_MESSAGE_KEYS = Object.freeze(
  Object.keys(ADMIN_EMPTY_STATE_MESSAGES).sort(),
);
