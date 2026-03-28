import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_CONTROLLER_MODEL_SELECTORS,
  createAppControllerModel,
  mapControllerModelSources,
} from "../src/ui/hooks/useAppController.js";
import { APP_CONTROLLER_MODEL_KEYS } from "../src/ui/contracts/app-controller-contract.js";
import {
    APP_MAIN_CONTENT_PROP_MAPPINGS,
    APP_SHELL_PROP_MAPPINGS,
    buildAppViewModel,
} from "../src/ui/view-model/app-view-model.js";

test("mapControllerModelSources monta model com selectors declarativos", () => {
  const openMenu = () => {};
  const closeMenu = () => {};
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const model = mapControllerModelSources(
    {
      layout: {
        menuOpen: false,
        openMenu,
        closeMenu,
        backdropClassName: "backdrop",
      },
      uiState: { status: { message: "", level: "info" } },
      fetchJson,
      showStatus,
    },
    APP_CONTROLLER_MODEL_SELECTORS,
  );

  assert.equal(model.menuOpen, false);
  assert.equal(model.backdropClassName, "backdrop");
  assert.equal(model.openMenu, openMenu);
  assert.equal(model.closeMenu, closeMenu);
  assert.equal(model.fetchJson, fetchJson);
  assert.equal(model.showStatus, showStatus);
});

test("APP_CONTROLLER_MODEL_SELECTORS mantém contrato esperado", () => {
    assert.deepEqual(APP_CONTROLLER_MODEL_KEYS, [
    "backdropClassName",
    "closeMenu",
    "fetchJson",
    "menuOpen",
    "openMenu",
    "showStatus",
    "status",
  ]);
    assert.deepEqual(Object.keys(APP_CONTROLLER_MODEL_SELECTORS).sort(), APP_CONTROLLER_MODEL_KEYS);
});

test("controller keys permanecem alinhadas aos mappings do view-model", () => {
    const mappedControllerKeys = Object.values({
        ...APP_SHELL_PROP_MAPPINGS,
        ...APP_MAIN_CONTENT_PROP_MAPPINGS,
    }).sort();

    assert.deepEqual(mappedControllerKeys, APP_CONTROLLER_MODEL_KEYS);
});

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

test("createAppControllerModel permanece compatível com buildAppViewModel", () => {
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

  const vm = buildAppViewModel(model);
  assert.equal(vm.shell.onOpenMenu, openMenu);
  assert.equal(vm.shell.onCloseMenu, closeMenu);
  assert.equal(vm.mainContent.fetchJson, fetchJson);
  assert.equal(vm.mainContent.showStatus, showStatus);
  assert.deepEqual(vm.mainContent.status, { message: "ok", level: "success" });
});
