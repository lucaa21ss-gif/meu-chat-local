import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HEALTH_CARD_COPY,
  HEALTH_CARD_COPY_KEYS,
  buildHealthFetchErrorMessage,
} from "../src/ui/state/health-card-ui-contract.js";
import { API_ENDPOINTS } from "../src/ui/state/api-endpoints-contract.js";

describe("HEALTH_CARD_COPY", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(HEALTH_CARD_COPY));
  });

  it("deve conter copy de UI esperada", () => {
    assert.equal(HEALTH_CARD_COPY.TITLE, "Status do Servidor");
    assert.equal(HEALTH_CARD_COPY.API_LABEL, "API:");
    assert.equal(
      HEALTH_CARD_COPY.LAN_HINT,
      "Consumo por mesma origem em /api para funcionar em celular/tablet na LAN.",
    );
  });
});

describe("HEALTH_CARD_COPY_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(HEALTH_CARD_COPY_KEYS, Object.keys(HEALTH_CARD_COPY).sort());
  });
});

describe("buildHealthFetchErrorMessage()", () => {
  it("deve montar mensagem com endpoint", () => {
    assert.equal(
      buildHealthFetchErrorMessage(API_ENDPOINTS.HEALTH),
      `Nao foi possivel consultar ${API_ENDPOINTS.HEALTH}`,
    );
  });
});