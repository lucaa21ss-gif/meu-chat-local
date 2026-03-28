import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_UI_STATUS_LEVEL,
  SHOW_STATUS_OPTION_KEYS,
  UI_STATUS_LEVELS,
  buildUiStatusPayload,
  resolveStatusLevelInput,
} from "../src/ui/contracts/index.js";

test("SHOW_STATUS_OPTION_KEYS permanece congelado e com shape esperado", () => {
  assert.equal(Object.isFrozen(SHOW_STATUS_OPTION_KEYS), true);
  assert.deepEqual(SHOW_STATUS_OPTION_KEYS, ["type"]);
});

test("resolveStatusLevelInput suporta string valida", () => {
  assert.equal(resolveStatusLevelInput(UI_STATUS_LEVELS.SUCCESS), UI_STATUS_LEVELS.SUCCESS);
  assert.equal(resolveStatusLevelInput(UI_STATUS_LEVELS.WARNING), UI_STATUS_LEVELS.WARNING);
});

test("resolveStatusLevelInput suporta options object com type", () => {
  assert.equal(
    resolveStatusLevelInput({ type: UI_STATUS_LEVELS.ERROR }),
    UI_STATUS_LEVELS.ERROR,
  );
});

test("resolveStatusLevelInput aplica fallback para entradas invalidas", () => {
  assert.equal(resolveStatusLevelInput("fatal"), DEFAULT_UI_STATUS_LEVEL);
  assert.equal(resolveStatusLevelInput({ type: "fatal" }), DEFAULT_UI_STATUS_LEVEL);
  assert.equal(resolveStatusLevelInput(undefined), DEFAULT_UI_STATUS_LEVEL);
});

test("buildUiStatusPayload monta payload normalizado", () => {
  assert.deepEqual(
    buildUiStatusPayload("ok", UI_STATUS_LEVELS.INFO),
    { message: "ok", level: UI_STATUS_LEVELS.INFO },
  );

  assert.deepEqual(
    buildUiStatusPayload("erro", { type: UI_STATUS_LEVELS.ERROR }),
    { message: "erro", level: UI_STATUS_LEVELS.ERROR },
  );

  assert.deepEqual(
    buildUiStatusPayload(undefined, "invalid"),
    { message: "", level: DEFAULT_UI_STATUS_LEVEL },
  );
});
