import { Route, Routes } from "react-router-dom";
import AdminOperationsPanel from "./AdminOperationsPanel.jsx";
import AdminShell from "./AdminShell.jsx";
import ChatPage from "./ChatPage.jsx";
import GuidePage from "./GuidePage.jsx";
import ProductPage from "./ProductPage.jsx";
import { createRouteComponentRegistry } from "../routes/route-component-registry.js";
import { createRouteElement } from "../routes/route-element-factory.js";
import { ROUTE_DEFINITIONS } from "../routes/navigation.js";

const ROUTE_COMPONENT_REGISTRY = createRouteComponentRegistry({
  ChatPage,
  AdminOperationsPanel,
  AdminShell,
  ProductPage,
  GuidePage,
});

export default function AppRoutes({ fetchJson, showStatus }) {
  return (
    <Routes>
      {ROUTE_DEFINITIONS.map((route) => (
        <Route
          key={route.id}
          path={route.path}
          element={createRouteElement(route, { fetchJson, showStatus }, ROUTE_COMPONENT_REGISTRY)}
        />
      ))}
    </Routes>
  );
}
