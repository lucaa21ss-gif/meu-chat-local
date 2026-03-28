import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL_ROUTE_PATHS,
  ROUTE_PATHS,
  SIDEBAR_NAV_ITEMS,
} from "../src/ui/routes/navigation.js";

test("ROUTE_PATHS expõe caminhos únicos", () => {
  const uniquePaths = new Set(ALL_ROUTE_PATHS);
  assert.equal(uniquePaths.size, ALL_ROUTE_PATHS.length);
});

test("SIDEBAR_NAV_ITEMS referencia apenas caminhos roteaveis", () => {
  const routable = new Set(ALL_ROUTE_PATHS);

  for (const item of SIDEBAR_NAV_ITEMS) {
    assert.equal(routable.has(item.to), true, `Item de menu aponta para rota inexistente: ${item.to}`);
  }
});

test("contrato minimo de navegacao se mantém", () => {
  assert.equal(ROUTE_PATHS.chat, "/");
  assert.equal(ROUTE_PATHS.chatAlias, "/app");
  assert.equal(ROUTE_PATHS.admin, "/admin");

  const menuPaths = SIDEBAR_NAV_ITEMS.map((item) => item.to);
  assert.equal(menuPaths.includes(ROUTE_PATHS.chat), true);
  assert.equal(menuPaths.includes(ROUTE_PATHS.admin), true);
});
