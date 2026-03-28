import test from "node:test";
import assert from "node:assert/strict";

import { UI_STATE_ACTION_TYPES } from "../src/ui/contracts/index.js";
import { INITIAL_UI_STATE, uiReducer } from "../src/ui/state/ui-state.js";

test("uiReducer atualiza status com payload valido", () => {
  const state = uiReducer(INITIAL_UI_STATE, {
    type: UI_STATE_ACTION_TYPES.STATUS,
    payload: {
      message: "Sistema online",
      level: "success",
    },
  });

  assert.equal(state.status.message, "Sistema online");
  assert.equal(state.status.level, "success");
});

test("uiReducer aplica fallback de level quando payload eh parcial", () => {
  const state = uiReducer(INITIAL_UI_STATE, {
    type: UI_STATE_ACTION_TYPES.STATUS,
    payload: {
      message: "Sem nivel",
    },
  });

  assert.equal(state.status.message, "Sem nivel");
  assert.equal(state.status.level, "info");
});

test("uiReducer ignora acao chat/setActive sem mutar estado", () => {
  const state = uiReducer(INITIAL_UI_STATE, {
    type: UI_STATE_ACTION_TYPES.CHAT_ACTIVE,
    payload: { chatId: "abc" },
  });

  assert.equal(state, INITIAL_UI_STATE);
});

test("uiReducer retorna estado atual para acoes desconhecidas", () => {
  const state = uiReducer(INITIAL_UI_STATE, {
    type: "ui/unknown",
  });

  assert.equal(state, INITIAL_UI_STATE);
});
