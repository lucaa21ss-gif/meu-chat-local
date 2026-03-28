import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_MAIN_CONTENT_PROP_KEYS,
  APP_MAIN_CONTENT_PROP_MAPPINGS,
  APP_SHELL_PROP_KEYS,
  APP_SHELL_PROP_MAPPINGS,
} from "../src/ui/contracts/index.js";
import {
  buildAppViewModel,
  createAppMainContentProps,
  createAppShellProps,
  mapControllerProps,
} from "../src/ui/view-model/app-view-model.js";

test("mapControllerProps mapeia propriedades com base no contrato declarativo", () => {
  const controller = {
    isOpen: true,
    close: () => {},
  };

  const mapped = mapControllerProps(controller, {
    open: "isOpen",
    onClose: "close",
  });

  assert.deepEqual(mapped, {
    open: true,
    onClose: controller.close,
  });
});

test("mappings declarativos do view-model mantêm chaves esperadas", () => {
  assert.deepEqual(APP_SHELL_PROP_KEYS, [
    "backdropClassName",
    "menuOpen",
    "onCloseMenu",
    "onOpenMenu",
  ]);

  assert.deepEqual(APP_MAIN_CONTENT_PROP_KEYS, [
    "fetchJson",
    "showStatus",
    "status",
  ]);

  assert.deepEqual(Object.keys(APP_SHELL_PROP_MAPPINGS).sort(), APP_SHELL_PROP_KEYS);
  assert.deepEqual(Object.keys(APP_MAIN_CONTENT_PROP_MAPPINGS).sort(), APP_MAIN_CONTENT_PROP_KEYS);
});

test("createAppShellProps mapeia contrato esperado para AppShellLayout", () => {
  const controller = {
    menuOpen: true,
    backdropClassName: "backdrop show",
    closeMenu: () => {},
    openMenu: () => {},
  };

  const shell = createAppShellProps(controller);

  assert.equal(shell.menuOpen, true);
  assert.equal(shell.backdropClassName, "backdrop show");
  assert.equal(shell.onCloseMenu, controller.closeMenu);
  assert.equal(shell.onOpenMenu, controller.openMenu);
});

test("createAppMainContentProps mapeia contrato esperado para AppMainContent", () => {
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const controller = {
    status: { message: "ok", level: "success" },
    fetchJson,
    showStatus,
  };

  const content = createAppMainContentProps(controller);

  assert.deepEqual(content.status, { message: "ok", level: "success" });
  assert.equal(content.fetchJson, fetchJson);
  assert.equal(content.showStatus, showStatus);
});

test("buildAppViewModel agrega shell e conteúdo principal", () => {
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const controller = {
    menuOpen: false,
    backdropClassName: "backdrop",
    closeMenu: () => {},
    openMenu: () => {},
    status: { message: "", level: "info" },
    fetchJson,
    showStatus,
  };

  const vm = buildAppViewModel(controller);

  assert.equal(vm.shell.menuOpen, false);
  assert.equal(vm.shell.backdropClassName, "backdrop");
  assert.deepEqual(vm.mainContent.status, { message: "", level: "info" });
  assert.equal(vm.mainContent.fetchJson, fetchJson);
  assert.equal(vm.mainContent.showStatus, showStatus);
});
