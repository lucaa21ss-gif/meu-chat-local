export const UI_STATUS_LEVELS = Object.freeze({
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
});

export const UI_STATUS_LEVEL_VALUES = Object.freeze(
  Object.values(UI_STATUS_LEVELS).sort(),
);

export const DEFAULT_UI_STATUS_LEVEL = UI_STATUS_LEVELS.INFO;