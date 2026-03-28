import test from "node:test";
import assert from "node:assert/strict";

import {
  createRouteElement,
  resolveRouteElementDescriptor,
} from "../src/ui/routes/route-element-factory.js";

function DummyComponent() {
  return null;
}

test("resolveRouteElementDescriptor monta descriptor para views com deps", () => {
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const chat = resolveRouteElementDescriptor({ view: "chat" }, { fetchJson, showStatus });
  assert.equal(chat.componentKey, "chat");
  assert.equal(chat.props.fetchJson, fetchJson);
  assert.equal(chat.props.onStatus, showStatus);

  const admin = resolveRouteElementDescriptor({ view: "admin" }, { fetchJson, showStatus });
  assert.equal(admin.componentKey, "admin");
  assert.equal(admin.props.fetchJson, fetchJson);
  assert.equal(admin.props.onStatus, showStatus);
});

test("resolveRouteElementDescriptor retorna props vazias para paginas estaticas", () => {
  const product = resolveRouteElementDescriptor({ view: "product" }, {});
  const guide = resolveRouteElementDescriptor({ view: "guide" }, {});

  assert.equal(product.componentKey, "product");
  assert.deepEqual(product.props, {});

  assert.equal(guide.componentKey, "guide");
  assert.deepEqual(guide.props, {});
});

test("createRouteElement cria elemento React usando registry", () => {
  const route = { view: "chat" };
  const fetchJson = async () => ({ ok: true });
  const showStatus = () => {};

  const element = createRouteElement(route, { fetchJson, showStatus }, { chat: DummyComponent });

  assert.equal(element.type, DummyComponent);
  assert.equal(element.props.fetchJson, fetchJson);
  assert.equal(element.props.onStatus, showStatus);
});

test("createRouteElement retorna null para view desconhecida ou sem registry", () => {
  const unknown = createRouteElement({ view: "unknown" }, {}, { chat: DummyComponent });
  assert.equal(unknown, null);

  const missingRegistry = createRouteElement({ view: "chat" }, {}, {});
  assert.equal(missingRegistry, null);
});
