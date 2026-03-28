import { Link } from "react-router-dom";

export default function AppTopbar({ onOpenMenu }) {
  return (
    <header className="topbar">
      <button className="ghost lg-hidden" onClick={onOpenMenu}>
        Menu
      </button>
      <div>
        <strong>Frontend Unico</strong>
        <p>Mesmo host para usuario e admin em rede domestica.</p>
      </div>
      <Link to="/admin" className="pill">
        /admin
      </Link>
    </header>
  );
}
