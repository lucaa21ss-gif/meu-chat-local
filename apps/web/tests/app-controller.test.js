import test from "node:test";
import assert from "node:assert/strict";

import { createAppControllerModel } from "../src/ui/hooks/useAppController.js";

test("createAppControllerModel consolida estado e handlers para o App", () => {
  const openMenu = () => {};
  const closeMenu = () => {};
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const model = createAppControllerModel({
    layout: {
      menuOpen: true,
      openMenu,
      closeMenu,
      backdropClassName: "backdrop show",
    },
    uiState: {
      status: {
        message: "ok",
        level: "success",
      },
    },
    fetchJson,
    showStatus,
  });

  assert.equal(model.menuOpen, true);
  assert.equal(model.backdropClassName, "backdrop show");
  assert.equal(model.openMenu, openMenu);
  assert.equal(model.closeMenu, closeMenu);
  assert.equal(model.fetchJson, fetchJson);
  assert.equal(model.showStatus, showStatus);
  assert.deepEqual(model.status, { message: "ok", level: "success" });
});
