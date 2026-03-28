import { createElement } from "react";

export function resolveRouteElementDescriptor(route, { fetchJson, showStatus }) {
  if (route.view === "chat") {
    return {
      componentKey: "chat",
      props: { fetchJson, onStatus: showStatus },
    };
  }

  if (route.view === "admin") {
    return {
      componentKey: "admin",
      props: { fetchJson, onStatus: showStatus },
    };
  }

  if (route.view === "product") {
    return {
      componentKey: "product",
      props: {},
    };
  }

  if (route.view === "guide") {
    return {
      componentKey: "guide",
      props: {},
    };
  }

  return null;
}

export function createRouteElement(route, deps, componentRegistry) {
  const descriptor = resolveRouteElementDescriptor(route, deps);
  if (!descriptor) return null;

  const Component = componentRegistry?.[descriptor.componentKey];
  if (!Component) return null;

  return createElement(Component, descriptor.props);
}
