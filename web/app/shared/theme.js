export function normalizeThemeMode(mode) {
  return ["light", "dark", "system"].includes(mode) ? mode : "system";
}

export function isDarkForMode(mode) {
  const safeMode = normalizeThemeMode(mode);
  if (safeMode === "dark") return true;
  if (safeMode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}