import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_SHELL_LAYOUT_PROP_KEYS,
  APP_SIDEBAR_PROP_KEYS,
  APP_TOPBAR_PROP_KEYS,
  APP_MAIN_CONTENT_PROP_KEYS,
  APP_MAIN_CONTENT_HEADER_PROP_KEYS,
  UI_STATUS_BANNER_PROP_KEYS,
  APP_STATUS_SHAPE,
  APP_STATUS_KEYS,
} from "../src/ui/contracts/index.js";

test("component contracts define expected prop keys", () => {
  // AppShellLayout expects all shell props + children
  assert.deepEqual(APP_SHELL_LAYOUT_PROP_KEYS, [
    "backdropClassName",
    "children",
    "menuOpen",
    "onCloseMenu",
    "onOpenMenu",
  ]);

  // AppSidebar expects menu state + close handler
  assert.deepEqual(APP_SIDEBAR_PROP_KEYS, [
    "menuOpen",
    "onCloseMenu",
  ]);

  // AppTopbar expects open handler
  assert.deepEqual(APP_TOPBAR_PROP_KEYS, ["onOpenMenu"]);

  // AppMainContent expects status, fetchJson, showStatus
  assert.deepEqual(APP_MAIN_CONTENT_PROP_KEYS, [
    "fetchJson",
    "showStatus",
    "status",
  ]);

  // MainContentHeaderSection expects status, fetchJson, showStatus
  assert.deepEqual(APP_MAIN_CONTENT_HEADER_PROP_KEYS, [
    "fetchJson",
    "showStatus",
    "status",
  ]);

  // UiStatusBanner expects status only
  assert.deepEqual(UI_STATUS_BANNER_PROP_KEYS, ["status"]);
});

test("status shape maintains message and level structure", () => {
  assert.deepEqual(APP_STATUS_SHAPE, {
    message: "",
    level: "info",
  });

  // Derived keys should be sorted
  assert.deepEqual(APP_STATUS_KEYS, ["level", "message"]);
});

test("app shell layout prop keys includes view-model shell props", () => {
  // AppShellLayout should receive all props from viewModel.shell + children
  // View-model provides: menuOpen, backdropClassName, onCloseMenu, onOpenMenu
  // Components add: children (implicit children param)
  const viewModelShellProps = ["menuOpen", "backdropClassName", "onCloseMenu", "onOpenMenu"].sort();
  const shellLayoutPropsWithoutChildren = APP_SHELL_LAYOUT_PROP_KEYS.filter(
    (k) => k !== "children",
  ).sort();

  assert.deepEqual(shellLayoutPropsWithoutChildren, viewModelShellProps);
});

test("app main content prop keys matches view-model main content props", () => {
  // AppMainContent should receive all props from viewModel.mainContent
  // View-model provides: status, fetchJson, showStatus
  const viewModelMainContentProps = ["status", "fetchJson", "showStatus"].sort();

  assert.deepEqual(APP_MAIN_CONTENT_PROP_KEYS, viewModelMainContentProps);
});

test("main content header prop keys matches app main content props", () => {
  assert.deepEqual(APP_MAIN_CONTENT_HEADER_PROP_KEYS, APP_MAIN_CONTENT_PROP_KEYS);
});

test("status banner prop keys are covered by header props", () => {
  for (const prop of UI_STATUS_BANNER_PROP_KEYS) {
    assert.equal(APP_MAIN_CONTENT_HEADER_PROP_KEYS.includes(prop), true);
  }
});

test("app sidebar prop keys are fully covered by shell layout props", () => {
  const shellLayoutPropsWithoutChildren = APP_SHELL_LAYOUT_PROP_KEYS.filter(
    (k) => k !== "children",
  );

  for (const prop of APP_SIDEBAR_PROP_KEYS) {
    assert.equal(shellLayoutPropsWithoutChildren.includes(prop), true);
  }
});

test("app topbar prop keys are fully covered by shell layout props", () => {
  const shellLayoutPropsWithoutChildren = APP_SHELL_LAYOUT_PROP_KEYS.filter(
    (k) => k !== "children",
  );

  for (const prop of APP_TOPBAR_PROP_KEYS) {
    assert.equal(shellLayoutPropsWithoutChildren.includes(prop), true);
  }
});
