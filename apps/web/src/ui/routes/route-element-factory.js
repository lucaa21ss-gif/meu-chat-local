import { createElement } from "react";
import { ROUTE_DESCRIPTOR_BUILDERS } from "./route-factory-contract.js";

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
