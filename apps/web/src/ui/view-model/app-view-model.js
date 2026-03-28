export const APP_SHELL_PROP_MAPPINGS = Object.freeze({
  menuOpen: "menuOpen",
  backdropClassName: "backdropClassName",
  onCloseMenu: "closeMenu",
  onOpenMenu: "openMenu",
});

export const APP_MAIN_CONTENT_PROP_MAPPINGS = Object.freeze({
  status: "status",
  fetchJson: "fetchJson",
  showStatus: "showStatus",
});

export const APP_SHELL_PROP_KEYS = Object.freeze(
  Object.keys(APP_SHELL_PROP_MAPPINGS).sort(),
);

export const APP_MAIN_CONTENT_PROP_KEYS = Object.freeze(
  Object.keys(APP_MAIN_CONTENT_PROP_MAPPINGS).sort(),
);

export function mapControllerProps(controller, propMappings) {
  return Object.fromEntries(
    Object.entries(propMappings || {}).map(([targetProp, sourceProp]) => [
      targetProp,
      controller?.[sourceProp],
    ]),
  );
}

export function createAppShellProps(controller) {
  return mapControllerProps(controller, APP_SHELL_PROP_MAPPINGS);
}

export function createAppMainContentProps(controller) {
  return mapControllerProps(controller, APP_MAIN_CONTENT_PROP_MAPPINGS);
}

export function buildAppViewModel(controller) {
  return {
    shell: createAppShellProps(controller),
    mainContent: createAppMainContentProps(controller),
  };
}
