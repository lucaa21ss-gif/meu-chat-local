import { useState, useEffect } from "react";
import { APP_LAYOUT_ACTION_KEYS } from "./layout-state-contract.js";

export { APP_LAYOUT_ACTION_KEYS } from "./layout-state-contract.js";

export function createAppLayoutActions(setMenuOpen) {
  return {
    openMenu() {
      setMenuOpen(true);
    },
    closeMenu() {
      setMenuOpen(false);
    },
    toggleMenu() {
      setMenuOpen((current) => !current);
    },
  };
}

export function getBackdropClassName(menuOpen) {
  return menuOpen ? "ai-sidebar-backdrop" : "";
}

export default function useAppLayoutState() {
  const [menuOpen, setMenuOpen] = useState(false);
  const actions = createAppLayoutActions(setMenuOpen);

  // Sincroniza body.ai-sidebar-open com o estado React.
  // O CSS do novo design system usa essa classe para controlar
  // o drawer e o backdrop via CSS puro (sem JS inline).
  useEffect(() => {
    document.body.classList.toggle("ai-sidebar-open", menuOpen);
    return () => document.body.classList.remove("ai-sidebar-open");
  }, [menuOpen]);

  return {
    menuOpen,
    ...actions,
    backdropClassName: getBackdropClassName(menuOpen),
  };
}
