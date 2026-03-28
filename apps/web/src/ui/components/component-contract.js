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

export const APP_STATUS_SHAPE = Object.freeze({
  message: "",
  level: "info",
});

export const APP_STATUS_KEYS = Object.freeze(
  Object.keys(APP_STATUS_SHAPE).sort(),
);
