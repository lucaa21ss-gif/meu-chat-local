import test from "node:test";
import assert from "node:assert/strict";

import { createAppControllerModel } from "../src/ui/hooks/useAppController.js";
import { buildAppViewModel } from "../src/ui/view-model/app-view-model.js";

test("App composition contract mantém compatibilidade entre controller e view-model", () => {
  const openMenu = () => {};
  const closeMenu = () => {};
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const controller = createAppControllerModel({
    layout: {
      menuOpen: true,
      openMenu,
      closeMenu,
      backdropClassName: "backdrop show",
    },
    uiState: {
      status: {
        message: "ready",
        level: "info",
      },
    },
    fetchJson,
    showStatus,
  });

  const vm = buildAppViewModel(controller);

  assert.deepEqual(Object.keys(vm).sort(), ["mainContent", "shell"]);

  assert.deepEqual(Object.keys(vm.shell).sort(), [
    "backdropClassName",
    "menuOpen",
    "onCloseMenu",
    "onOpenMenu",
  ]);

  assert.deepEqual(Object.keys(vm.mainContent).sort(), [
    "fetchJson",
    "showStatus",
    "status",
  ]);

  assert.equal(vm.shell.menuOpen, true);
  assert.equal(vm.shell.backdropClassName, "backdrop show");
  assert.equal(vm.shell.onOpenMenu, openMenu);
  assert.equal(vm.shell.onCloseMenu, closeMenu);

  assert.equal(vm.mainContent.fetchJson, fetchJson);
  assert.equal(vm.mainContent.showStatus, showStatus);
  assert.deepEqual(vm.mainContent.status, { message: "ready", level: "info" });
});
