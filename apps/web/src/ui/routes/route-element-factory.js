import { createElement } from "react";
import { ROUTE_VIEWS } from "./navigation.js";

const ROUTE_DESCRIPTOR_BUILDERS = Object.freeze({
  [ROUTE_VIEWS.chat]: ({ fetchJson, showStatus }) => ({
    componentKey: "chat",
    props: { fetchJson, onStatus: showStatus },
  }),
  [ROUTE_VIEWS.admin]: ({ fetchJson, showStatus }) => ({
    componentKey: "admin",
    props: { fetchJson, onStatus: showStatus },
  }),
  [ROUTE_VIEWS.product]: () => ({
    componentKey: "product",
    props: {},
  }),
  [ROUTE_VIEWS.guide]: () => ({
    componentKey: "guide",
    props: {},
  }),
});

export function resolveRouteElementDescriptor(route, { fetchJson, showStatus }) {
  const builder = ROUTE_DESCRIPTOR_BUILDERS[route?.view];
  if (!builder) return null;
  return builder({ fetchJson, showStatus });
}

export function createRouteElement(route, deps, componentRegistry) {
  const descriptor = resolveRouteElementDescriptor(route, deps);
  if (!descriptor) return null;

  const Component = componentRegistry?.[descriptor.componentKey];
  if (!Component) return null;

  return createElement(Component, descriptor.props);
}
