export const ROUTE_PATHS = {
  chat: "/",
  chatAlias: "/app",
  admin: "/admin",
  product: "/produto",
  guide: "/guia",
};

export const ROUTE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: "chat", path: ROUTE_PATHS.chat, view: "chat", label: "Chat", end: true, showInSidebar: true }),
  Object.freeze({ id: "admin", path: ROUTE_PATHS.admin, view: "admin", label: "Admin", showInSidebar: true }),
  Object.freeze({ id: "chatAlias", path: ROUTE_PATHS.chatAlias, view: "chat", label: "Chat", showInSidebar: false }),
  Object.freeze({ id: "product", path: ROUTE_PATHS.product, view: "product", label: "Produto", showInSidebar: true }),
  Object.freeze({ id: "guide", path: ROUTE_PATHS.guide, view: "guide", label: "Guia", showInSidebar: true }),
]);

export const SIDEBAR_NAV_ITEMS = Object.freeze(
  ROUTE_DEFINITIONS.filter((route) => route.showInSidebar).map((route) => ({
    to: route.path,
    label: route.label,
    end: route.end,
  })),
);

export const ALL_ROUTE_PATHS = Object.freeze(ROUTE_DEFINITIONS.map((route) => route.path));
