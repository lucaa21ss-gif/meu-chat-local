export const APP_LAYOUT_ACTION_KEYS = Object.freeze([
  "closeMenu",
  "openMenu",
  "toggleMenu",
]);

export const APP_LAYOUT_STATE_KEYS = Object.freeze([
  ...APP_LAYOUT_ACTION_KEYS,
  "backdropClassName",
  "menuOpen",
].sort());
