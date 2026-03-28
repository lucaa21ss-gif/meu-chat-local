import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_SHELL_LAYOUT_PROP_KEYS,
  APP_MAIN_CONTENT_PROP_KEYS,
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

  // AppMainContent expects status, fetchJson, showStatus
  assert.deepEqual(APP_MAIN_CONTENT_PROP_KEYS, [
    "fetchJson",
    "showStatus",
    "status",
  ]);
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
