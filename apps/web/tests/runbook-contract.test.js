import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RUNBOOK_TYPES,
  RUNBOOK_TYPE_VALUES,
  RUNBOOK_MODES,
  RUNBOOK_MODE_VALUES,
  DEFAULT_RUNBOOK_TYPE,
  DEFAULT_RUNBOOK_MODE,
  DEFAULT_AUTO_HEALING_POLICY,
} from "../src/ui/state/runbook-contract.js";

describe("RUNBOOK_TYPES", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(RUNBOOK_TYPES));
  });

  it("deve conter MODEL_OFFLINE = 'model-offline'", () => {
    assert.strictEqual(RUNBOOK_TYPES.MODEL_OFFLINE, "model-offline");
  });

  it("deve conter DB_DEGRADED = 'db-degraded'", () => {
    assert.strictEqual(RUNBOOK_TYPES.DB_DEGRADED, "db-degraded");
  });

  it("deve conter DISK_PRESSURE = 'disk-pressure'", () => {
    assert.strictEqual(RUNBOOK_TYPES.DISK_PRESSURE, "disk-pressure");
  });

  it("deve conter BACKUP_ALERT = 'backup-alert'", () => {
    assert.strictEqual(RUNBOOK_TYPES.BACKUP_ALERT, "backup-alert");
  });

  it("deve ter exatamente 4 tipos", () => {
    assert.strictEqual(Object.keys(RUNBOOK_TYPES).length, 4);
  });
});

describe("RUNBOOK_TYPE_VALUES", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(RUNBOOK_TYPE_VALUES));
  });

  it("deve conter todos os valores de RUNBOOK_TYPES", () => {
    const expected = Object.values(RUNBOOK_TYPES).sort();
    assert.deepStrictEqual([...RUNBOOK_TYPE_VALUES], expected);
  });

  it("deve estar em ordem alfabética", () => {
    const sorted = [...RUNBOOK_TYPE_VALUES].sort();
    assert.deepStrictEqual([...RUNBOOK_TYPE_VALUES], sorted);
  });
});

describe("RUNBOOK_MODES", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(RUNBOOK_MODES));
  });

  it("deve conter DRY_RUN = 'dry-run'", () => {
    assert.strictEqual(RUNBOOK_MODES.DRY_RUN, "dry-run");
  });

  it("deve conter EXECUTE = 'execute'", () => {
    assert.strictEqual(RUNBOOK_MODES.EXECUTE, "execute");
  });

  it("deve conter ROLLBACK = 'rollback'", () => {
    assert.strictEqual(RUNBOOK_MODES.ROLLBACK, "rollback");
  });

  it("deve ter exatamente 3 modos", () => {
    assert.strictEqual(Object.keys(RUNBOOK_MODES).length, 3);
  });
});

describe("RUNBOOK_MODE_VALUES", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(RUNBOOK_MODE_VALUES));
  });

  it("deve conter todos os valores de RUNBOOK_MODES", () => {
    const expected = Object.values(RUNBOOK_MODES).sort();
    assert.deepStrictEqual([...RUNBOOK_MODE_VALUES], expected);
  });

  it("deve estar em ordem alfabética", () => {
    const sorted = [...RUNBOOK_MODE_VALUES].sort();
    assert.deepStrictEqual([...RUNBOOK_MODE_VALUES], sorted);
  });
});

describe("Defaults de runbook", () => {
  it("DEFAULT_RUNBOOK_TYPE deve ser um valor válido de RUNBOOK_TYPES", () => {
    assert.ok(RUNBOOK_TYPE_VALUES.includes(DEFAULT_RUNBOOK_TYPE));
  });

  it("DEFAULT_RUNBOOK_TYPE deve ser 'model-offline'", () => {
    assert.strictEqual(DEFAULT_RUNBOOK_TYPE, RUNBOOK_TYPES.MODEL_OFFLINE);
  });

  it("DEFAULT_RUNBOOK_MODE deve ser um valor válido de RUNBOOK_MODES", () => {
    assert.ok(RUNBOOK_MODE_VALUES.includes(DEFAULT_RUNBOOK_MODE));
  });

  it("DEFAULT_RUNBOOK_MODE deve ser 'dry-run'", () => {
    assert.strictEqual(DEFAULT_RUNBOOK_MODE, RUNBOOK_MODES.DRY_RUN);
  });

  it("DEFAULT_AUTO_HEALING_POLICY deve ser um valor válido de RUNBOOK_TYPES", () => {
    assert.ok(RUNBOOK_TYPE_VALUES.includes(DEFAULT_AUTO_HEALING_POLICY));
  });

  it("DEFAULT_AUTO_HEALING_POLICY deve ser 'model-offline'", () => {
    assert.strictEqual(DEFAULT_AUTO_HEALING_POLICY, RUNBOOK_TYPES.MODEL_OFFLINE);
  });
});
