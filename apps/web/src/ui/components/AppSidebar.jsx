import { NavLink } from "react-router-dom";
import { SHELL_COPY } from "../constants/ui-copy.js";
import { SIDEBAR_NAV_ITEMS } from "../routes/navigation.js";

export default function AppSidebar({ menuOpen, onCloseMenu }) {
  return (
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h1>{SHELL_COPY.appTitle}</h1>
        <button className="ghost lg-hidden" onClick={onCloseMenu}>
          {SHELL_COPY.closeMenuLabel}
        </button>
      </div>
      <nav>
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onCloseMenu} end={item.end}>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <p className="hint">{SHELL_COPY.responsiveHint}</p>
    </aside>
  );
}
