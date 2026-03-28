/**
 * Contrato de intervalos de polling da UI (em milissegundos).
 *
 * @module polling-contract
 */

export const POLLING_INTERVALS_MS = Object.freeze({
  HEALTH_CARD: 15_000,
  ADMIN_HEALTH: 30_000,
});

export const POLLING_INTERVAL_KEYS = Object.freeze(
  Object.keys(POLLING_INTERVALS_MS).sort(),
);
