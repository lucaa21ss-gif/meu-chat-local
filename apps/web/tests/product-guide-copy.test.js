import test from "node:test";
import assert from "node:assert/strict";

import {
  GUIDE_COPY,
  PRODUCT_COPY,
  getGuideCopy,
  getProductCopy,
  UI_COPY,
} from "../src/ui/constants/ui-copy.js";

test("PRODUCT_COPY possui conteúdo minimo esperado", () => {
  assert.equal(typeof PRODUCT_COPY.title, "string");
  assert.equal(PRODUCT_COPY.title.length > 0, true);

  assert.equal(Array.isArray(PRODUCT_COPY.features), true);
  assert.equal(PRODUCT_COPY.features.length >= 5, true);

  assert.equal(Array.isArray(PRODUCT_COPY.requirements), true);
  assert.equal(PRODUCT_COPY.requirements.length >= 3, true);
});

test("GUIDE_COPY possui passos e atalhos validos", () => {
  assert.equal(typeof GUIDE_COPY.title, "string");
  assert.equal(GUIDE_COPY.title.length > 0, true);

  assert.equal(Array.isArray(GUIDE_COPY.steps), true);
  assert.equal(GUIDE_COPY.steps.length >= 3, true);

  for (const step of GUIDE_COPY.steps) {
    assert.equal(typeof step.label, "string");
    assert.equal(step.label.length > 0, true);
    assert.equal(typeof step.command, "string");
    assert.equal(step.command.length > 0, true);
  }

  assert.equal(Array.isArray(GUIDE_COPY.shortcuts), true);
  assert.equal(GUIDE_COPY.shortcuts.length >= 3, true);
});

test("GUIDE_COPY mantém rotas canonicas de acesso", () => {
  assert.equal(GUIDE_COPY.accessAppPath, "/app");
  assert.equal(GUIDE_COPY.accessAdminPath, "/admin");
});

test("GUIDE_COPY mantém comando API + Web em duas linhas reais", () => {
  const startStep = GUIDE_COPY.steps.find(
    (step) => step.label === "Inicie API + Web:",
  );

  assert.ok(startStep);
  assert.equal(startStep.command.includes("\n"), true);
  assert.equal(startStep.command.includes("\\n"), false);
});

test("UI_COPY expõe dominios product/guide e helpers consistentes", () => {
  assert.equal(UI_COPY.product, PRODUCT_COPY);
  assert.equal(UI_COPY.guide, GUIDE_COPY);
  assert.equal(getProductCopy(), PRODUCT_COPY);
  assert.equal(getGuideCopy(), GUIDE_COPY);
});
