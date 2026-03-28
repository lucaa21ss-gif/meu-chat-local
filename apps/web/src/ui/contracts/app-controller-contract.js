export const APP_CONTROLLER_MODEL_SELECTORS = Object.freeze({
  menuOpen: ({ layout }) => layout.menuOpen,
  openMenu: ({ layout }) => layout.openMenu,
  closeMenu: ({ layout }) => layout.closeMenu,
  backdropClassName: ({ layout }) => layout.backdropClassName,
  status: ({ uiState }) => uiState.status,
  fetchJson: ({ fetchJson }) => fetchJson,
  showStatus: ({ showStatus }) => showStatus,
});

export const APP_CONTROLLER_MODEL_KEYS = Object.freeze(
  Object.keys(APP_CONTROLLER_MODEL_SELECTORS).sort(),
);
