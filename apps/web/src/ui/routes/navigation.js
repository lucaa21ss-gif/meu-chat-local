export const ROUTE_PATHS = {
  chat: "/",
  chatAlias: "/app",
  admin: "/admin",
  product: "/produto",
  guide: "/guia",
};

export const SIDEBAR_NAV_ITEMS = [
  { to: ROUTE_PATHS.chat, label: "Chat", end: true },
  { to: ROUTE_PATHS.admin, label: "Admin" },
  { to: ROUTE_PATHS.product, label: "Produto" },
  { to: ROUTE_PATHS.guide, label: "Guia" },
];

export const ALL_ROUTE_PATHS = Object.freeze(Object.values(ROUTE_PATHS));
