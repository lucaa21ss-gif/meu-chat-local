import { useState } from "react";
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
  return menuOpen ? "backdrop show" : "backdrop";
}

export default function useAppLayoutState() {
  const [menuOpen, setMenuOpen] = useState(false);
  const actions = createAppLayoutActions(setMenuOpen);

  return {
    menuOpen,
    ...actions,
    backdropClassName: getBackdropClassName(menuOpen),
  };
}
