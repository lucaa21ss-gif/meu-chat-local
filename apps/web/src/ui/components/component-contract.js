export const APP_SHELL_LAYOUT_PROP_KEYS = Object.freeze([
  "backdropClassName",
  "children",
  "menuOpen",
  "onCloseMenu",
  "onOpenMenu",
].sort());

export const APP_SIDEBAR_PROP_KEYS = Object.freeze([
  "menuOpen",
  "onCloseMenu",
].sort());

export const APP_TOPBAR_PROP_KEYS = Object.freeze([
  "onOpenMenu",
].sort());

export const APP_MAIN_CONTENT_PROP_KEYS = Object.freeze([
  "fetchJson",
  "showStatus",
  "status",
].sort());

export const APP_MAIN_CONTENT_HEADER_PROP_KEYS = Object.freeze([
  "fetchJson",
  "showStatus",
  "status",
].sort());

export const UI_STATUS_BANNER_PROP_KEYS = Object.freeze([
  "status",
].sort());

export const APP_STATUS_SHAPE = Object.freeze({
  message: "",
  level: "info",
});

export const APP_STATUS_KEYS = Object.freeze(
  Object.keys(APP_STATUS_SHAPE).sort(),
);

/**
 * Prop keys compartilhadas pelos painéis de página que recebem
 * acesso à API e callback de status: ChatPage, HealthCard, AdminOperationsPanel.
 */
export const PAGE_PANEL_PROP_KEYS = Object.freeze([
  "fetchJson",
  "onStatus",
].sort());

export const CHAT_PAGE_PROP_KEYS = PAGE_PANEL_PROP_KEYS;
export const HEALTH_CARD_PROP_KEYS = PAGE_PANEL_PROP_KEYS;
export const ADMIN_OPERATIONS_PANEL_PROP_KEYS = PAGE_PANEL_PROP_KEYS;
