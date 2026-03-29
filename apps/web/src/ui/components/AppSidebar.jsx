import { NavLink } from "react-router-dom";
import { SHELL_COPY } from "../constants/ui-copy.js";
import { SIDEBAR_NAV_ITEMS } from "../routes/navigation.js";

export default function AppSidebar({ onCloseMenu }) {
  return (
    <aside className="ai-sidebar-drawer glass-panel flex flex-col gap-4 p-4">
      <div className="sidebar-header">
        <h1 className="ai-gradient-text">{SHELL_COPY.appTitle}</h1>
        <button className="ai-btn-secondary lg-hidden" onClick={onCloseMenu}>
          {SHELL_COPY.closeMenuLabel}
        </button>
      </div>
      <nav className="grid gap-1">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onCloseMenu}
            end={item.end}
            className={({ isActive }) => `ai-chat-tab block ${isActive ? "active" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <p className="ai-section-label mt-auto">{SHELL_COPY.responsiveHint}</p>
    </aside>
  );
}
