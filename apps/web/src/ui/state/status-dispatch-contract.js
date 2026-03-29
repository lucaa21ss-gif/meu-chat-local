import {
  DEFAULT_UI_STATUS_LEVEL,
  normalizeUiStatusLevel,
} from "./ui-contracts.js";

export const SHOW_STATUS_OPTION_KEYS = Object.freeze([
  "type",
].sort());

export function resolveStatusLevelInput(levelOrOptions) {
  if (typeof levelOrOptions === "string") {
    return normalizeUiStatusLevel(levelOrOptions);
  }

  if (levelOrOptions && typeof levelOrOptions === "object") {
    return normalizeUiStatusLevel(levelOrOptions.type);
  }

  return DEFAULT_UI_STATUS_LEVEL;
}

export function buildUiStatusPayload(message, levelOrOptions) {
  return {
    message: message || "",
    level: resolveStatusLevelInput(levelOrOptions),
  };
}