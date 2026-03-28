import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HEALTH_STATUSES,
  HEALTH_STATUS_VALUES,
  HEALTH_STATUS_LABELS,
  normalizeHealthStatus,
  getHealthStatusLabel,
} from "../src/ui/state/health-status-contract.js";

describe("HEALTH_STATUSES", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(HEALTH_STATUSES));
  });

  it("deve conter os valores esperados", () => {
    assert.equal(HEALTH_STATUSES.HEALTHY, "healthy");
    assert.equal(HEALTH_STATUSES.DEGRADED, "degraded");
    assert.equal(HEALTH_STATUSES.UNHEALTHY, "unhealthy");
    assert.equal(HEALTH_STATUSES.OFFLINE, "offline");
    assert.equal(HEALTH_STATUSES.LOADING, "loading");
    assert.equal(HEALTH_STATUSES.UNKNOWN, "unknown");
  });
});

describe("HEALTH_STATUS_VALUES", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(HEALTH_STATUS_VALUES));
  });

  it("deve conter todos os valores do enum em ordem alfabética", () => {
    assert.deepEqual(HEALTH_STATUS_VALUES, Object.values(HEALTH_STATUSES).sort());
  });
});

describe("HEALTH_STATUS_LABELS", () => {
  it("deve mapear healthy para saudavel", () => {
    assert.equal(HEALTH_STATUS_LABELS[HEALTH_STATUSES.HEALTHY], "saudavel");
  });

  it("deve mapear degraded para degradado", () => {
    assert.equal(HEALTH_STATUS_LABELS[HEALTH_STATUSES.DEGRADED], "degradado");
  });

  it("deve mapear unhealthy e offline para indisponivel", () => {
    assert.equal(HEALTH_STATUS_LABELS[HEALTH_STATUSES.UNHEALTHY], "indisponivel");
    assert.equal(HEALTH_STATUS_LABELS[HEALTH_STATUSES.OFFLINE], "indisponivel");
  });

  it("deve mapear loading e unknown para carregando", () => {
    assert.equal(HEALTH_STATUS_LABELS[HEALTH_STATUSES.LOADING], "carregando");
    assert.equal(HEALTH_STATUS_LABELS[HEALTH_STATUSES.UNKNOWN], "carregando");
  });
});

describe("normalizeHealthStatus()", () => {
  it("normaliza para lowercase", () => {
    assert.equal(normalizeHealthStatus("HEALTHY"), HEALTH_STATUSES.HEALTHY);
  });

  it("aceita valores válidos", () => {
    assert.equal(normalizeHealthStatus("degraded"), HEALTH_STATUSES.DEGRADED);
    assert.equal(normalizeHealthStatus("offline"), HEALTH_STATUSES.OFFLINE);
  });

  it("faz fallback para unknown com valor inválido", () => {
    assert.equal(normalizeHealthStatus("down"), HEALTH_STATUSES.UNKNOWN);
  });

  it("faz fallback para unknown com null ou undefined", () => {
    assert.equal(normalizeHealthStatus(null), HEALTH_STATUSES.UNKNOWN);
    assert.equal(normalizeHealthStatus(undefined), HEALTH_STATUSES.UNKNOWN);
  });
});

describe("getHealthStatusLabel()", () => {
  it("retorna label correta para healthy", () => {
    assert.equal(getHealthStatusLabel("healthy"), "saudavel");
  });

  it("retorna label correta para degraded", () => {
    assert.equal(getHealthStatusLabel("degraded"), "degradado");
  });

  it("retorna indisponivel para unhealthy e offline", () => {
    assert.equal(getHealthStatusLabel("unhealthy"), "indisponivel");
    assert.equal(getHealthStatusLabel("offline"), "indisponivel");
  });

  it("retorna carregando para valores inválidos", () => {
    assert.equal(getHealthStatusLabel("invalid"), "carregando");
  });
}
);