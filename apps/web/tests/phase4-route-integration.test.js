/**
 * tests/phase4-route-integration.test.js
 * 
 * Validação de Fase 4 - AdminShell integrado nas rotas
 */

import { test } from "node:test";
import assert from "node:assert";
import {
  ROUTE_PATHS,
  ROUTE_VIEWS,
  ROUTE_DEFINITIONS,
} from "../src/ui/routes/navigation.js";
import { ROUTE_COMPONENT_KEYS } from "../src/ui/routes/route-factory-contract.js";

test("Fase 4: AdminShell Route Integration", async (t) => {
  await t.test("ROUTE_PATHS has adminShell", () => {
    assert.strictEqual(ROUTE_PATHS.adminShell, "/admin-panel");
  });

  await t.test("ROUTE_VIEWS has adminShell", () => {
    assert(ROUTE_VIEWS.adminShell === "adminShell");
  });

  await t.test("ROUTE_DEFINITIONS includes adminShell route", () => {
    const adminShellRoute = ROUTE_DEFINITIONS.find((r) => r.id === "adminShell");
    assert(adminShellRoute, "adminShell route exists");
    assert.strictEqual(adminShellRoute.path, "/admin-panel");
    assert.strictEqual(adminShellRoute.view, "adminShell");
  });

  await t.test("admin and adminShell are separate", () => {
    assert.notStrictEqual(ROUTE_PATHS.admin, ROUTE_PATHS.adminShell);
    assert.notStrictEqual(ROUTE_VIEWS.admin, ROUTE_VIEWS.adminShell);
  });

  await t.test("ROUTE_COMPONENT_KEYS includes adminShell", () => {
    assert(ROUTE_COMPONENT_KEYS.includes("adminShell"));
  });

  await t.test("No web-admin references", () => {
    const paths = Object.values(ROUTE_PATHS).some((p) => p.includes("web-admin"));
    const views = Object.values(ROUTE_VIEWS).some((v) => v.includes("web-admin"));
    assert(!paths && !views, "no web-admin references");
  });

  await t.test("adminShell not in sidebar", () => {
    const adminShellRoute = ROUTE_DEFINITIONS.find((r) => r.id === "adminShell");
    assert.strictEqual(adminShellRoute.showInSidebar, false);
  });
});
