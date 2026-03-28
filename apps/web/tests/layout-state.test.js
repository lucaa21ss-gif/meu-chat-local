import test from "node:test";
import assert from "node:assert/strict";

import {
  createAppLayoutActions,
  getBackdropClassName,
} from "../src/ui/hooks/useAppLayoutState.js";
import { APP_LAYOUT_ACTION_KEYS } from "../src/ui/contracts/index.js";

test("createAppLayoutActions abre e fecha menu", () => {
  let menuOpen = false;
  const setMenuOpen = (value) => {
    if (typeof value === "function") {
      menuOpen = value(menuOpen);
      return;
    }
    menuOpen = value;
  };

  const actions = createAppLayoutActions(setMenuOpen);

  actions.openMenu();
  assert.equal(menuOpen, true);

  actions.closeMenu();
  assert.equal(menuOpen, false);
});

test("createAppLayoutActions alterna menu com toggleMenu", () => {
  let menuOpen = false;
  const setMenuOpen = (value) => {
    if (typeof value === "function") {
      menuOpen = value(menuOpen);
      return;
    }
    menuOpen = value;
  };

  const actions = createAppLayoutActions(setMenuOpen);

  actions.toggleMenu();
  assert.equal(menuOpen, true);

  actions.toggleMenu();
  assert.equal(menuOpen, false);
});

test("getBackdropClassName aplica classe show quando menu esta aberto", () => {
  assert.equal(getBackdropClassName(true), "backdrop show");
  assert.equal(getBackdropClassName(false), "backdrop");
});

test("layout state actions permanecem alinhadas com contrato", () => {
  let setMenuOpen = () => {};
  const actions = createAppLayoutActions(setMenuOpen);
  const createdActionKeys = Object.keys(actions).sort();
  assert.deepEqual(createdActionKeys, APP_LAYOUT_ACTION_KEYS);
});
