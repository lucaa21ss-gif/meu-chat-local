import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_PAYLOAD_KEYS,
  ADMIN_PAYLOAD_KEY_NAMES,
} from "../src/ui/state/admin-payload-contract.js";

describe("ADMIN_PAYLOAD_KEYS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_PAYLOAD_KEYS));
  });

  it("deve expor chaves principais esperadas", () => {
    assert.equal(ADMIN_PAYLOAD_KEYS.HEALTH_CHECKS, "checks");
    assert.equal(ADMIN_PAYLOAD_KEYS.BACKUP_VALIDATION_ROOT, "validation");
    assert.equal(ADMIN_PAYLOAD_KEYS.BACKUP_ITEMS, "items");
    assert.equal(ADMIN_PAYLOAD_KEYS.INCIDENT_ROOT, "incident");
    assert.equal(ADMIN_PAYLOAD_KEYS.AUTO_HEALING_ROOT, "autoHealing");
    assert.equal(ADMIN_PAYLOAD_KEYS.RUNBOOK_STEPS, "steps");
  });

  it("deve manter aliases esperados para status/id comuns", () => {
    assert.equal(ADMIN_PAYLOAD_KEYS.BACKUP_STATUS, "status");
    assert.equal(ADMIN_PAYLOAD_KEYS.INCIDENT_STATUS, "status");
    assert.equal(ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_ID, "id");
    assert.equal(ADMIN_PAYLOAD_KEYS.RUNBOOK_ID, "id");
  });
});

describe("ADMIN_PAYLOAD_KEY_NAMES", () => {
  it("deve refletir as chaves do contrato em ordem alfabética", () => {
    assert.deepEqual(ADMIN_PAYLOAD_KEY_NAMES, Object.keys(ADMIN_PAYLOAD_KEYS).sort());
  });
});