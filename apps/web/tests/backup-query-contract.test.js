import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_QUERY_DEFAULTS,
  BACKUP_QUERY_KEYS,
  normalizeBackupValidateLimit,
  buildBackupValidateUrl,
} from "../src/ui/state/backup-query-contract.js";
import { API_ENDPOINTS } from "../src/ui/state/api-endpoints-contract.js";

describe("BACKUP_QUERY_DEFAULTS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(BACKUP_QUERY_DEFAULTS));
  });

  it("deve definir VALIDATE_LIMIT padrão como 10", () => {
    assert.equal(BACKUP_QUERY_DEFAULTS.VALIDATE_LIMIT, 10);
  });
});

describe("BACKUP_QUERY_KEYS", () => {
  it("deve ser array congelado", () => {
    assert.ok(Object.isFrozen(BACKUP_QUERY_KEYS));
  });

  it("deve refletir as chaves do objeto default", () => {
    assert.deepEqual(BACKUP_QUERY_KEYS, Object.keys(BACKUP_QUERY_DEFAULTS).sort());
  });
});

describe("normalizeBackupValidateLimit()", () => {
  it("retorna default para undefined", () => {
    assert.equal(normalizeBackupValidateLimit(undefined), 10);
  });

  it("retorna default para zero ou negativo", () => {
    assert.equal(normalizeBackupValidateLimit(0), 10);
    assert.equal(normalizeBackupValidateLimit(-1), 10);
  });

  it("arredonda para baixo quando decimal positivo", () => {
    assert.equal(normalizeBackupValidateLimit(15.9), 15);
  });

  it("aceita string numérica", () => {
    assert.equal(normalizeBackupValidateLimit("7"), 7);
  });
});

describe("buildBackupValidateUrl()", () => {
  it("usa endpoint base + default limit quando vazio", () => {
    assert.equal(
      buildBackupValidateUrl(),
      `${API_ENDPOINTS.BACKUP_VALIDATE}?limit=${BACKUP_QUERY_DEFAULTS.VALIDATE_LIMIT}`,
    );
  });

  it("aplica limit customizado quando válido", () => {
    assert.equal(
      buildBackupValidateUrl(25),
      `${API_ENDPOINTS.BACKUP_VALIDATE}?limit=25`,
    );
  });
});
