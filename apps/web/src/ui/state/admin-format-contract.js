/**
 * Contrato de formatação e defaults numéricos do painel admin.
 *
 * @module admin-format-contract
 */

export const ADMIN_NUMERIC_DEFAULTS = Object.freeze({
  COUNT: 0,
  BYTES_PER_KILOBYTE: 1024,
  KILOBYTES_PER_MEGABYTE: 1024,
  FILE_SIZE_DECIMAL_PLACES: 2,
});

export const ADMIN_NUMERIC_DEFAULT_KEYS = Object.freeze(
  Object.keys(ADMIN_NUMERIC_DEFAULTS).sort(),
);

export const ADMIN_FORMATTING = Object.freeze({
  LOCALE: "pt-BR",
  FILE_SIZE_UNIT: "MB",
  DATE_PREFIX_SEPARATOR: " • ",
});

export const ADMIN_FORMATTING_KEYS = Object.freeze(
  Object.keys(ADMIN_FORMATTING).sort(),
);

export function getAdminItemCount(items) {
  return Array.isArray(items) ? items.length : ADMIN_NUMERIC_DEFAULTS.COUNT;
}

export function formatAdminTime(value) {
  return new Date(value).toLocaleTimeString(ADMIN_FORMATTING.LOCALE);
}

export function formatAdminDate(value) {
  return new Date(value).toLocaleDateString(ADMIN_FORMATTING.LOCALE);
}

export function formatAdminFileSizeMb(sizeBytes) {
  const sizeInMb =
    Number(sizeBytes || ADMIN_NUMERIC_DEFAULTS.COUNT) /
    ADMIN_NUMERIC_DEFAULTS.BYTES_PER_KILOBYTE /
    ADMIN_NUMERIC_DEFAULTS.KILOBYTES_PER_MEGABYTE;

  return `${sizeInMb.toFixed(ADMIN_NUMERIC_DEFAULTS.FILE_SIZE_DECIMAL_PLACES)} ${ADMIN_FORMATTING.FILE_SIZE_UNIT}`;
}
