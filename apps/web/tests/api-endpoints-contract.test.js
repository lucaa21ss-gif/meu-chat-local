import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  API_ENDPOINTS,
  API_ENDPOINT_KEYS,
} from "../src/ui/state/api-endpoints-contract.js";

describe("API_ENDPOINTS", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(API_ENDPOINTS));
  });

  it("deve conter o endpoint de saúde pública", () => {
    assert.strictEqual(API_ENDPOINTS.HEALTH, "/api/health");
  });

  it("deve conter o endpoint de saúde administrativa", () => {
    assert.strictEqual(API_ENDPOINTS.HEALTH_ADMIN, "/api/health/public");
  });

  it("deve conter o endpoint de chat", () => {
    assert.strictEqual(API_ENDPOINTS.CHAT, "/api/chat");
  });

  it("deve conter o endpoint de usuários", () => {
    assert.strictEqual(API_ENDPOINTS.USERS, "/api/users");
  });

  it("deve conter o endpoint de validação de backup", () => {
    assert.strictEqual(API_ENDPOINTS.BACKUP_VALIDATE, "/api/backup/validate");
  });

  it("deve conter o endpoint de exportação de backup", () => {
    assert.strictEqual(API_ENDPOINTS.BACKUP_EXPORT, "/api/backup/export");
  });

  it("deve conter o endpoint de status de incidente", () => {
    assert.strictEqual(API_ENDPOINTS.INCIDENT_STATUS, "/api/incident/status");
  });

  it("deve conter o endpoint de execução de runbook", () => {
    assert.strictEqual(
      API_ENDPOINTS.INCIDENT_RUNBOOK_EXECUTE,
      "/api/incident/runbook/execute"
    );
  });

  it("deve conter o endpoint de status de auto-healing", () => {
    assert.strictEqual(
      API_ENDPOINTS.AUTO_HEALING_STATUS,
      "/api/auto-healing/status"
    );
  });

  it("deve conter o endpoint de execução de auto-healing", () => {
    assert.strictEqual(
      API_ENDPOINTS.AUTO_HEALING_EXECUTE,
      "/api/auto-healing/execute"
    );
  });

  it("todos os valores devem começar com /api/", () => {
    for (const [key, value] of Object.entries(API_ENDPOINTS)) {
      assert.ok(
        value.startsWith("/api/"),
        `${key}: esperado começar com /api/ mas foi '${value}'`
      );
    }
  });

  it("não deve conter valores duplicados", () => {
    const values = Object.values(API_ENDPOINTS);
    const unique = new Set(values);
    assert.strictEqual(unique.size, values.length);
  });
});

describe("API_ENDPOINT_KEYS", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(API_ENDPOINT_KEYS));
  });

  it("deve conter as mesmas chaves que API_ENDPOINTS em ordem alfabética", () => {
    const expected = Object.keys(API_ENDPOINTS).sort();
    assert.deepStrictEqual([...API_ENDPOINT_KEYS], expected);
  });

  it("deve incluir todas as chaves mapeadas: 10 endpoints", () => {
    assert.strictEqual(API_ENDPOINT_KEYS.length, 10);
  });
});
