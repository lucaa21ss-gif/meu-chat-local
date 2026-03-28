import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_NUMERIC_DEFAULTS,
  ADMIN_NUMERIC_DEFAULT_KEYS,
  ADMIN_FORMATTING,
  ADMIN_FORMATTING_KEYS,
  getAdminItemCount,
  formatAdminTime,
  formatAdminDate,
  formatAdminFileSizeMb,
} from "../src/ui/state/admin-format-contract.js";

describe("ADMIN_NUMERIC_DEFAULTS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_NUMERIC_DEFAULTS));
  });

  it("deve conter defaults numéricos esperados", () => {
    assert.equal(ADMIN_NUMERIC_DEFAULTS.COUNT, 0);
    assert.equal(ADMIN_NUMERIC_DEFAULTS.BYTES_PER_KILOBYTE, 1024);
    assert.equal(ADMIN_NUMERIC_DEFAULTS.KILOBYTES_PER_MEGABYTE, 1024);
    assert.equal(ADMIN_NUMERIC_DEFAULTS.FILE_SIZE_DECIMAL_PLACES, 2);
  });
});

describe("ADMIN_NUMERIC_DEFAULT_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(
      ADMIN_NUMERIC_DEFAULT_KEYS,
      Object.keys(ADMIN_NUMERIC_DEFAULTS).sort(),
    );
  });
});

describe("ADMIN_FORMATTING", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_FORMATTING));
  });

  it("deve conter locale e sufixos esperados", () => {
    assert.equal(ADMIN_FORMATTING.LOCALE, "pt-BR");
    assert.equal(ADMIN_FORMATTING.FILE_SIZE_UNIT, "MB");
    assert.equal(ADMIN_FORMATTING.DATE_PREFIX_SEPARATOR, " • ");
  });
});

describe("ADMIN_FORMATTING_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(ADMIN_FORMATTING_KEYS, Object.keys(ADMIN_FORMATTING).sort());
  });
});

describe("getAdminItemCount()", () => {
  it("retorna tamanho do array", () => {
    assert.equal(getAdminItemCount([1, 2, 3]), 3);
  });

  it("retorna zero para valor não-array", () => {
    assert.equal(getAdminItemCount(null), 0);
  });
});

describe("formatAdminTime()", () => {
  it("retorna string formatada", () => {
    assert.equal(typeof formatAdminTime("2024-01-01T10:20:30.000Z"), "string");
  });
});

describe("formatAdminDate()", () => {
  it("retorna string formatada", () => {
    assert.equal(typeof formatAdminDate("2024-01-01T10:20:30.000Z"), "string");
  });
});

describe("formatAdminFileSizeMb()", () => {
  it("formata bytes em MB com 2 casas", () => {
    assert.equal(formatAdminFileSizeMb(1048576), "1.00 MB");
  });

  it("usa zero como fallback", () => {
    assert.equal(formatAdminFileSizeMb(undefined), "0.00 MB");
  });
});