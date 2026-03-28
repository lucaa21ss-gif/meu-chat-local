import test from "node:test";
import assert from "node:assert/strict";

import { SHELL_COPY } from "../src/ui/constants/ui-copy.js";
import { ROUTE_PATHS } from "../src/ui/routes/navigation.js";

test("SHELL_COPY possui textos obrigatorios não vazios", () => {
  const requiredKeys = [
    "appTitle",
    "closeMenuLabel",
    "responsiveHint",
    "openMenuLabel",
    "topbarTitle",
    "topbarSubtitle",
    "adminShortcutLabel",
    "adminShortcutPath",
  ];

  for (const key of requiredKeys) {
    assert.equal(typeof SHELL_COPY[key], "string");
    assert.equal(SHELL_COPY[key].trim().length > 0, true, `Valor vazio em SHELL_COPY.${key}`);
  }
});

test("SHELL_COPY referencia rota admin canonical", () => {
  assert.equal(SHELL_COPY.adminShortcutPath, ROUTE_PATHS.admin);
  assert.equal(SHELL_COPY.adminShortcutLabel, "/admin");
});
