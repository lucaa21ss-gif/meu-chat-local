import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_SECTION_TITLES,
  ADMIN_SECTION_TITLE_KEYS,
  ADMIN_TILE_LABELS,
  ADMIN_TILE_LABEL_KEYS,
  ADMIN_STATIC_COPY,
  ADMIN_STATIC_COPY_KEYS,
} from "../src/ui/state/admin-copy-contract.js";

describe("ADMIN_SECTION_TITLES", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_SECTION_TITLES));
  });

  it("deve conter os títulos esperados", () => {
    assert.equal(ADMIN_SECTION_TITLES.ROOT, "Admin - Health");
    assert.equal(ADMIN_SECTION_TITLES.CHECKS, "Checks");
    assert.equal(ADMIN_SECTION_TITLES.RUNBOOK, "Runbook");
  });
});

describe("ADMIN_SECTION_TITLE_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(ADMIN_SECTION_TITLE_KEYS, Object.keys(ADMIN_SECTION_TITLES).sort());
  });
});

describe("ADMIN_TILE_LABELS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_TILE_LABELS));
  });

  it("deve conter labels de tile esperadas", () => {
    assert.equal(ADMIN_TILE_LABELS.STATUS, "Status");
    assert.equal(ADMIN_TILE_LABELS.AUTO_HEALING, "Auto-healing");
    assert.equal(ADMIN_TILE_LABELS.RUNBOOK_ID, "Runbook ID");
  });
});

describe("ADMIN_TILE_LABEL_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(ADMIN_TILE_LABEL_KEYS, Object.keys(ADMIN_TILE_LABELS).sort());
  });
});

describe("ADMIN_STATIC_COPY", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_STATIC_COPY));
  });

  it("deve conter copy estática esperada", () => {
    assert.equal(ADMIN_STATIC_COPY.INTRO_HINT, "Recorte inicial de paridade do painel administrativo.");
    assert.equal(ADMIN_STATIC_COPY.AUTO_HEALING_ENABLED, "habilitado");
    assert.equal(ADMIN_STATIC_COPY.AUTO_HEALING_DISABLED, "desabilitado");
    assert.equal(ADMIN_STATIC_COPY.HEALTH_STATUS_FALLBACK, "desconhecido");
  });
});

describe("ADMIN_STATIC_COPY_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(ADMIN_STATIC_COPY_KEYS, Object.keys(ADMIN_STATIC_COPY).sort());
  });
});