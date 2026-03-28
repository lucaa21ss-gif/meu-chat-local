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

export function isValidUiStatusLevel(level) {
  return UI_STATUS_LEVEL_VALUES.includes(level);
}

export function normalizeUiStatusLevel(level) {
  return isValidUiStatusLevel(level)
    ? level
    : DEFAULT_UI_STATUS_LEVEL;
}

export function normalizeUiStatus(status) {
  return {
    message: status?.message || "",
    level: normalizeUiStatusLevel(status?.level),
  };
}