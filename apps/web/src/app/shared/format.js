export function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function formatBytes(value) {
  const bytes = Number.parseInt(value, 10) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDateLabel(isoString) {
  if (!isoString) return "";
  // SQLite format "YYYY-MM-DD HH:mm:ss" needs to be converted to ISO format for reliable UTC parsing
  const normalized = isoString.includes("T")
    ? isoString
    : isoString.replace(" ", "T") + "Z";
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}