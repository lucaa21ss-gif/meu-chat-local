import {
    APP_SHELL_PROP_MAPPINGS,
    APP_MAIN_CONTENT_PROP_MAPPINGS,
    APP_SHELL_PROP_KEYS,
    APP_MAIN_CONTENT_PROP_KEYS,
} from "../contracts/app-view-model-contract.js";

export {
    APP_SHELL_PROP_MAPPINGS,
    APP_MAIN_CONTENT_PROP_MAPPINGS,
    APP_SHELL_PROP_KEYS,
    APP_MAIN_CONTENT_PROP_KEYS,
} from "../contracts/app-view-model-contract.js";

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
