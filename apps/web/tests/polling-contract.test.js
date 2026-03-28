import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  POLLING_INTERVALS_MS,
  POLLING_INTERVAL_KEYS,
} from "../src/ui/state/polling-contract.js";

describe("POLLING_INTERVALS_MS", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(POLLING_INTERVALS_MS));
  });

  it("deve conter HEALTH_CARD = 15000", () => {
    assert.equal(POLLING_INTERVALS_MS.HEALTH_CARD, 15_000);
  });

  it("deve conter ADMIN_HEALTH = 30000", () => {
    assert.equal(POLLING_INTERVALS_MS.ADMIN_HEALTH, 30_000);
  });

  it("deve manter ADMIN_HEALTH maior que HEALTH_CARD", () => {
    assert.equal(
      POLLING_INTERVALS_MS.ADMIN_HEALTH > POLLING_INTERVALS_MS.HEALTH_CARD,
      true,
    );
  });
});

describe("POLLING_INTERVAL_KEYS", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(POLLING_INTERVAL_KEYS));
  });

  it("deve conter as mesmas chaves do objeto de intervalos", () => {
    assert.deepEqual(POLLING_INTERVAL_KEYS, Object.keys(POLLING_INTERVALS_MS).sort());
  });
});
