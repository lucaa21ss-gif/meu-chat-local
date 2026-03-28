import { NavLink } from "react-router-dom";

export default function AppSidebar({ menuOpen, onCloseMenu }) {
  return (
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h1>Meu Chat Local</h1>
        <button className="ghost lg-hidden" onClick={onCloseMenu}>
          Fechar
        </button>
      </div>
      <nav>
        <NavLink to="/" onClick={onCloseMenu} end>
          Chat
        </NavLink>
        <NavLink to="/admin" onClick={onCloseMenu}>
          Admin
        </NavLink>
        <NavLink to="/produto" onClick={onCloseMenu}>
          Produto
        </NavLink>
        <NavLink to="/guia" onClick={onCloseMenu}>
          Guia
        </NavLink>
      </nav>
      <p className="hint">Responsivo para desktop, tablet e celular.</p>
    </aside>
  );
}
