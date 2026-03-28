import { ROUTE_VIEWS } from "./navigation.js";

export function createRouteComponentRegistry({
  ChatPage,
  AdminOperationsPanel,
  ProductPage,
  GuidePage,
}) {
  return Object.freeze({
    [ROUTE_VIEWS.chat]: ChatPage,
    [ROUTE_VIEWS.admin]: AdminOperationsPanel,
    [ROUTE_VIEWS.product]: ProductPage,
    [ROUTE_VIEWS.guide]: GuidePage,
  });
}

export function getRouteComponentRegistryViews(registry) {
  return Object.freeze(Object.keys(registry || {}));
}

export function getMissingRouteViews(routeDefinitions, registryViews) {
  const configuredViews = new Set(registryViews || []);
  const requiredViews = new Set((routeDefinitions || []).map((route) => route.view));

  return Array.from(requiredViews).filter((view) => !configuredViews.has(view));
}
