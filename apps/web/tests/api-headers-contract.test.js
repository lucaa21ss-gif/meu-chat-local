import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  API_HEADER_NAMES,
  API_HEADER_DEFAULTS,
  buildUserIdHeader,
  buildJsonUserHeaders,
} from "../src/ui/state/api-headers-contract.js";

describe("API_HEADER_NAMES", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(API_HEADER_NAMES));
  });

  it("USER_ID deve ser 'x-user-id'", () => {
    assert.strictEqual(API_HEADER_NAMES.USER_ID, "x-user-id");
  });

  it("CONTENT_TYPE deve ser 'Content-Type'", () => {
    assert.strictEqual(API_HEADER_NAMES.CONTENT_TYPE, "Content-Type");
  });
});

describe("API_HEADER_DEFAULTS", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(API_HEADER_DEFAULTS));
  });

  it("USER_ID padrão deve ser 'user-default'", () => {
    assert.strictEqual(API_HEADER_DEFAULTS.USER_ID, "user-default");
  });

  it("CONTENT_TYPE padrão deve ser 'application/json'", () => {
    assert.strictEqual(API_HEADER_DEFAULTS.CONTENT_TYPE, "application/json");
  });
});

describe("buildUserIdHeader()", () => {
  it("retorna objeto com x-user-id preenchido", () => {
    const headers = buildUserIdHeader("user-123");
    assert.strictEqual(headers[API_HEADER_NAMES.USER_ID], "user-123");
  });

  it("usa o default quando userId é vazio", () => {
    const headers = buildUserIdHeader("");
    assert.strictEqual(headers[API_HEADER_NAMES.USER_ID], API_HEADER_DEFAULTS.USER_ID);
  });

  it("usa o default quando userId é null", () => {
    const headers = buildUserIdHeader(null);
    assert.strictEqual(headers[API_HEADER_NAMES.USER_ID], API_HEADER_DEFAULTS.USER_ID);
  });

  it("usa o default quando userId é undefined", () => {
    const headers = buildUserIdHeader(undefined);
    assert.strictEqual(headers[API_HEADER_NAMES.USER_ID], API_HEADER_DEFAULTS.USER_ID);
  });

  it("retorna apenas a chave x-user-id", () => {
    const headers = buildUserIdHeader("user-abc");
    assert.deepStrictEqual(Object.keys(headers), [API_HEADER_NAMES.USER_ID]);
  });
});

describe("buildJsonUserHeaders()", () => {
  it("retorna Content-Type e x-user-id corretos", () => {
    const headers = buildJsonUserHeaders("user-456");
    assert.strictEqual(headers[API_HEADER_NAMES.CONTENT_TYPE], API_HEADER_DEFAULTS.CONTENT_TYPE);
    assert.strictEqual(headers[API_HEADER_NAMES.USER_ID], "user-456");
  });

  it("usa o default de userId quando vazio", () => {
    const headers = buildJsonUserHeaders("");
    assert.strictEqual(headers[API_HEADER_NAMES.USER_ID], API_HEADER_DEFAULTS.USER_ID);
  });

  it("retorna exatamente 2 chaves: Content-Type e x-user-id", () => {
    const headers = buildJsonUserHeaders("user-xyz");
    assert.deepStrictEqual(Object.keys(headers).sort(), [
      API_HEADER_NAMES.CONTENT_TYPE,
      API_HEADER_NAMES.USER_ID,
    ].sort());
  });

  it("retorna novo objeto a cada chamada", () => {
    const a = buildJsonUserHeaders("u1");
    const b = buildJsonUserHeaders("u1");
    assert.notStrictEqual(a, b);
  });
});
