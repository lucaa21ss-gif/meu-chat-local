import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_STATUS_VALUES,
  ADMIN_STATUS_KEYS,
  BACKUP_VALIDATION_LABELS,
  ADMIN_BADGE_VARIANTS,
  HEALTH_CHECK_LABELS,
} from "../src/ui/state/admin-status-contract.js";

describe("ADMIN_STATUS_VALUES", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_STATUS_VALUES));
  });

  it("deve expor os fallbacks esperados", () => {
    assert.equal(ADMIN_STATUS_VALUES.USER_ROLE_DEFAULT, "viewer");
    assert.equal(ADMIN_STATUS_VALUES.BACKUP_STATUS_DEFAULT, "unknown");
    assert.equal(ADMIN_STATUS_VALUES.INCIDENT_STATUS_DEFAULT, "normal");
    assert.equal(ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO, "info");
    assert.equal(ADMIN_STATUS_VALUES.CIRCUIT_STATE_DEFAULT, "closed");
    assert.equal(ADMIN_STATUS_VALUES.VALIDATION_STATUS_OK, "ok");
  });
});

describe("ADMIN_STATUS_KEYS", () => {
  it("deve ser array congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_STATUS_KEYS));
  });

  it("deve refletir as chaves de ADMIN_STATUS_VALUES em ordem alfabética", () => {
    assert.deepEqual(ADMIN_STATUS_KEYS, Object.keys(ADMIN_STATUS_VALUES).sort());
  });
});

describe("BACKUP_VALIDATION_LABELS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(BACKUP_VALIDATION_LABELS));
  });

  it("deve mapear labels de validação", () => {
    assert.equal(BACKUP_VALIDATION_LABELS.OK, "Valido");
    assert.equal(BACKUP_VALIDATION_LABELS.REVIEW, "Verificar");
  });
});

describe("ADMIN_BADGE_VARIANTS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_BADGE_VARIANTS));
  });

  it("deve mapear variantes de badge", () => {
    assert.equal(ADMIN_BADGE_VARIANTS.OK, "ok");
    assert.equal(ADMIN_BADGE_VARIANTS.FAIL, "fail");
  });
});

describe("HEALTH_CHECK_LABELS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(HEALTH_CHECK_LABELS));
  });

  it("deve mapear labels de checks de saúde", () => {
    assert.equal(HEALTH_CHECK_LABELS.OK, "Saudavel");
    assert.equal(HEALTH_CHECK_LABELS.FAIL, "Falha");
  });
});
