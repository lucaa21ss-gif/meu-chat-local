import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_UI_STATUS_LEVEL,
  UI_STATUS_LEVELS,
  UI_STATUS_LEVEL_VALUES,
  isValidUiStatusLevel,
  normalizeUiStatus,
  normalizeUiStatusLevel,
} from "../src/ui/contracts/index.js";

test("UI_STATUS_LEVELS permanece congelado e com valores esperados", () => {
  assert.equal(Object.isFrozen(UI_STATUS_LEVELS), true);
  assert.deepEqual(UI_STATUS_LEVELS, {
    INFO: "info",
    SUCCESS: "success",
    WARNING: "warning",
    ERROR: "error",
  });
});

test("UI_STATUS_LEVEL_VALUES permanece congelado e ordenado", () => {
  assert.equal(Object.isFrozen(UI_STATUS_LEVEL_VALUES), true);
  assert.deepEqual(UI_STATUS_LEVEL_VALUES, [
    "error",
    "info",
    "success",
    "warning",
  ]);
});

test("isValidUiStatusLevel valida corretamente", () => {
  assert.equal(isValidUiStatusLevel(UI_STATUS_LEVELS.INFO), true);
  assert.equal(isValidUiStatusLevel(UI_STATUS_LEVELS.SUCCESS), true);
  assert.equal(isValidUiStatusLevel("fatal"), false);
  assert.equal(isValidUiStatusLevel(undefined), false);
});

test("normalizeUiStatusLevel aplica fallback para default", () => {
  assert.equal(
    normalizeUiStatusLevel(UI_STATUS_LEVELS.WARNING),
    UI_STATUS_LEVELS.WARNING,
  );
  assert.equal(normalizeUiStatusLevel("invalid"), DEFAULT_UI_STATUS_LEVEL);
  assert.equal(normalizeUiStatusLevel(undefined), DEFAULT_UI_STATUS_LEVEL);
});

test("normalizeUiStatus normaliza payload completo e incompleto", () => {
  assert.deepEqual(
    normalizeUiStatus({ message: "ok", level: UI_STATUS_LEVELS.SUCCESS }),
    { message: "ok", level: UI_STATUS_LEVELS.SUCCESS },
  );

  assert.deepEqual(
    normalizeUiStatus({ message: "falha", level: "fatal" }),
    { message: "falha", level: DEFAULT_UI_STATUS_LEVEL },
  );

  assert.deepEqual(normalizeUiStatus(undefined), {
    message: "",
    level: DEFAULT_UI_STATUS_LEVEL,
  });
});
