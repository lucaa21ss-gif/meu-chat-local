import test from "node:test";
import assert from "node:assert/strict";

import { createAppControllerModel } from "../src/ui/hooks/useAppController.js";
import { buildAppViewModel } from "../src/ui/view-model/app-view-model.js";
import {
  APP_CONTROLLER_MODEL_KEYS,
  APP_SHELL_PROP_KEYS,
  APP_MAIN_CONTENT_PROP_KEYS,
} from "../src/ui/contracts/index.js";

test("app unified composition aligns controller → view-model → layout props", () => {
  // 1. Create controller (layer 1)
  const openMenu = () => {};
  const closeMenu = () => {};
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const controller = createAppControllerModel({
    layout: {
      menuOpen: false,
      openMenu,
      closeMenu,
      backdropClassName: "backdrop",
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

  // 2. Verify controller shape
  assert.deepEqual(Object.keys(controller).sort(), APP_CONTROLLER_MODEL_KEYS);

  // 3. Build view-model (layer 2)
  const viewModel = buildAppViewModel(controller);

  // 4. Verify view-model structure
  assert.deepEqual(Object.keys(viewModel).sort(), ["mainContent", "shell"]);
  assert.deepEqual(Object.keys(viewModel.shell).sort(), APP_SHELL_PROP_KEYS);
  assert.deepEqual(Object.keys(viewModel.mainContent).sort(), APP_MAIN_CONTENT_PROP_KEYS);

  // 5. Verify prop values propagated correctly
  assert.equal(viewModel.shell.menuOpen, false);
  assert.equal(viewModel.shell.backdropClassName, "backdrop");
  assert.equal(viewModel.shell.onOpenMenu, openMenu);
  assert.equal(viewModel.shell.onCloseMenu, closeMenu);

  assert.equal(viewModel.mainContent.fetchJson, fetchJson);
  assert.equal(viewModel.mainContent.showStatus, showStatus);
  assert.deepEqual(viewModel.mainContent.status, { message: "ready", level: "info" });

  // 6. Ensure view-model shape matches component props (AppShellLayout + AppMainContent)
  // This would be called as: <AppShellLayout {...viewModel.shell}> and <AppMainContent {...viewModel.mainContent} />
  const shellProps = viewModel.shell;
  const contentProps = viewModel.mainContent;

  // AppShellLayout expects: menuOpen, backdropClassName, onCloseMenu, onOpenMenu, children (children is implicit)
  assert.ok(typeof shellProps.menuOpen === "boolean");
  assert.ok(typeof shellProps.backdropClassName === "string");
  assert.ok(typeof shellProps.onCloseMenu === "function");
  assert.ok(typeof shellProps.onOpenMenu === "function");

  // AppMainContent expects: status, fetchJson, showStatus
  assert.ok(typeof contentProps.status === "object");
  assert.ok(typeof contentProps.fetchJson === "function");
  assert.ok(typeof contentProps.showStatus === "function");
});

test("app composition preserves handler references through layers", () => {
  const handlers = {
    openMenu: () => "opened",
    closeMenu: () => "closed",
    fetchJson: () => "fetched",
    showStatus: () => "shown",
  };

  const controller = createAppControllerModel({
    layout: {
      menuOpen: true,
      openMenu: handlers.openMenu,
      closeMenu: handlers.closeMenu,
      backdropClassName: "backdrop show",
    },
    uiState: { status: { message: "", level: "info" } },
    fetchJson: handlers.fetchJson,
    showStatus: handlers.showStatus,
  });

  const viewModel = buildAppViewModel(controller);

  // Verify handler identity preserved
  assert.strictEqual(viewModel.shell.onOpenMenu(), "opened");
  assert.strictEqual(viewModel.shell.onCloseMenu(), "closed");
  assert.strictEqual(viewModel.mainContent.fetchJson(), "fetched");
  assert.strictEqual(viewModel.mainContent.showStatus(), "shown");
});
