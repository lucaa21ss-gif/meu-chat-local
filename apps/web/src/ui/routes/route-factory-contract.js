import { ROUTE_VIEWS } from "./navigation.js";

export const ROUTE_DESCRIPTOR_BUILDERS = Object.freeze({
  [ROUTE_VIEWS.chat]: ({ fetchJson, showStatus }) => ({
    componentKey: "chat",
    props: { fetchJson, onStatus: showStatus },
  }),
  [ROUTE_VIEWS.admin]: ({ fetchJson, showStatus }) => ({
    componentKey: "admin",
    props: { fetchJson, onStatus: showStatus },
  }),
  [ROUTE_VIEWS.adminShell]: () => ({
    componentKey: "adminShell",
    props: {},
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

export const ROUTE_COMPONENT_KEYS = Object.freeze(
  Object.keys(ROUTE_DESCRIPTOR_BUILDERS).sort(),
);
