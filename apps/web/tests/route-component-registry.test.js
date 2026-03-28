import test from "node:test";
import assert from "node:assert/strict";

import {
  createRouteComponentRegistry,
  getMissingRouteViews,
  getRouteComponentRegistryViews,
} from "../src/ui/routes/route-component-registry.js";
import { ROUTE_DEFINITIONS, ROUTE_VIEWS } from "../src/ui/routes/navigation.js";

function Dummy() {
  return null;
}

test("createRouteComponentRegistry cria chaves esperadas para views", () => {
  const registry = createRouteComponentRegistry({
    ChatPage: Dummy,
    AdminOperationsPanel: Dummy,
    ProductPage: Dummy,
    GuidePage: Dummy,
  });

  const views = getRouteComponentRegistryViews(registry);
  const expectedViews = Object.values(ROUTE_VIEWS).sort();

  assert.deepEqual([...views].sort(), expectedViews);
});

test("getMissingRouteViews retorna vazio quando contrato esta completo", () => {
  const registry = createRouteComponentRegistry({
    ChatPage: Dummy,
    AdminOperationsPanel: Dummy,
    ProductPage: Dummy,
    GuidePage: Dummy,
  });

  const missing = getMissingRouteViews(ROUTE_DEFINITIONS, getRouteComponentRegistryViews(registry));
  assert.deepEqual(missing, []);
});

test("getMissingRouteViews detecta view sem componente registrado", () => {
  const registryViews = [ROUTE_VIEWS.chat, ROUTE_VIEWS.product, ROUTE_VIEWS.guide];
  const missing = getMissingRouteViews(ROUTE_DEFINITIONS, registryViews);

  assert.equal(missing.includes(ROUTE_VIEWS.admin), true);
});
