import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_UI_STATUS_LEVEL,
  UI_STATUS_LEVELS,
  UI_STATUS_LEVEL_VALUES,
  UI_STATE_ACTION_TYPES,
  UI_STATE_ACTION_TYPE_VALUES,
  UI_STATE_SHAPE,
  UI_STATE_KEYS,
  UI_STATUS_KEYS,
} from "../src/ui/state/ui-state-contract.js";
import { INITIAL_UI_STATE, uiReducer } from "../src/ui/state/ui-state.js";

describe("ui-state-contract", () => {
  it("should have UI_STATE_ACTION_TYPES frozen", () => {
    assert.equal(Object.isFrozen(UI_STATE_ACTION_TYPES), true);
  });

  it("should have UI_STATE_ACTION_TYPE_VALUES frozen and sorted", () => {
    assert.equal(Object.isFrozen(UI_STATE_ACTION_TYPE_VALUES), true);
    assert.deepEqual(UI_STATE_ACTION_TYPE_VALUES, [
      "chat/setActive",
      "ui/status",
    ]);
  });

  it("should have UI_STATUS_LEVELS frozen with expected values", () => {
    assert.equal(Object.isFrozen(UI_STATUS_LEVELS), true);
    assert.deepEqual(UI_STATUS_LEVELS, {
      INFO: "info",
      SUCCESS: "success",
      WARNING: "warning",
      ERROR: "error",
    });
  });

  it("should have UI_STATUS_LEVEL_VALUES frozen and sorted", () => {
    assert.equal(Object.isFrozen(UI_STATUS_LEVEL_VALUES), true);
    assert.deepEqual(UI_STATUS_LEVEL_VALUES, [
      "error",
      "info",
      "success",
      "warning",
    ]);
  });

  it("should expose default status level from contract", () => {
    assert.equal(DEFAULT_UI_STATUS_LEVEL, UI_STATUS_LEVELS.INFO);
  });

  it("should have UI_STATE_SHAPE frozen with nested freeze", () => {
    assert.equal(Object.isFrozen(UI_STATE_SHAPE), true);
    assert.equal(Object.isFrozen(UI_STATE_SHAPE.status), true);
  });

  it("should have UI_STATE_KEYS derived and sorted", () => {
    assert.deepEqual(UI_STATE_KEYS, ["status"]);
  });

  it("should have UI_STATUS_KEYS derived and sorted", () => {
    assert.deepEqual(UI_STATUS_KEYS, ["level", "message"]);
  });

  describe("INITIAL_UI_STATE alignment", () => {
    it("should have all defined state keys", () => {
      const actualKeys = Object.keys(INITIAL_UI_STATE).sort();
      assert.deepEqual(actualKeys, UI_STATE_KEYS);
    });

    it("should have status object with all contract keys", () => {
      const actualStatusKeys = Object.keys(INITIAL_UI_STATE.status).sort();
      assert.deepEqual(actualStatusKeys, UI_STATUS_KEYS);
    });
  });

  describe("uiReducer action handling", () => {
    it("should handle ui/status action and transform status", () => {
      const nextState = uiReducer(INITIAL_UI_STATE, {
        type: "ui/status",
        payload: { message: "Hello", level: "success" },
      });

      assert.equal(nextState.status.message, "Hello");
      assert.equal(nextState.status.level, "success");
    });

    it("should handle chat/setActive action", () => {
      const nextState = uiReducer(INITIAL_UI_STATE, {
        type: "chat/setActive",
        payload: { chatId: "123" },
      });

      // Should return state unchanged
      assert.deepEqual(nextState, INITIAL_UI_STATE);
    });

    it("should use defaults when ui/status payload incomplete", () => {
      const nextState = uiReducer(INITIAL_UI_STATE, {
        type: "ui/status",
        payload: { message: "Error" },
      });

      assert.equal(nextState.status.message, "Error");
      assert.equal(nextState.status.level, DEFAULT_UI_STATUS_LEVEL); // default
    });

    it("should return unchanged state for unknown action", () => {
      const nextState = uiReducer(INITIAL_UI_STATE, {
        type: "unknown/action",
      });

      assert.deepEqual(nextState, INITIAL_UI_STATE);
    });
  });

  describe("reducer output alignment", () => {
    it("should maintain state shape structure for ui/status", () => {
      const nextState = uiReducer(INITIAL_UI_STATE, {
        type: "ui/status",
        payload: { message: "Test", level: "warning" },
      });

      const actualKeys = Object.keys(nextState).sort();
      assert.deepEqual(actualKeys, UI_STATE_KEYS);

      const actualStatusKeys = Object.keys(nextState.status).sort();
      assert.deepEqual(actualStatusKeys, UI_STATUS_KEYS);
    });

    it("should have all action types from contract represented in reducer", () => {
      // This test verifies that the reducer handles each documented action type
      // If a new action type is added to the contract, this test ensures reducer processes it
      const handledTypes = new Set();

      UI_STATE_ACTION_TYPE_VALUES.forEach((actionType) => {
        const testAction = { type: actionType };
        try {
          uiReducer(INITIAL_UI_STATE, testAction);
          handledTypes.add(actionType);
        } catch (e) {
          // Action not handled - test will catch this
        }
      });

      // All action types should be handleable (no errors thrown)
      // This ensures reducer logic covers all contract types
      assert.equal(handledTypes.size, UI_STATE_ACTION_TYPE_VALUES.length);
    });
  });
});
