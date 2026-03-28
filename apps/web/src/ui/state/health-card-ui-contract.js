/**
 * Contrato de copy e mensagens da tela HealthCard.
 *
 * @module health-card-ui-contract
 */

export const HEALTH_CARD_COPY = Object.freeze({
  TITLE: "Status do Servidor",
  API_LABEL: "API:",
  LAN_HINT: "Consumo por mesma origem em /api para funcionar em celular/tablet na LAN.",
});

export const HEALTH_CARD_COPY_KEYS = Object.freeze(
  Object.keys(HEALTH_CARD_COPY).sort(),
);

export function buildHealthFetchErrorMessage(endpoint) {
  return `Nao foi possivel consultar ${endpoint}`;
}
