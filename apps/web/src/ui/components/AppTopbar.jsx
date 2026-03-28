import { Link } from "react-router-dom";
import { SHELL_COPY } from "../constants/ui-copy.js";

export default function AppTopbar({ onOpenMenu }) {
  return (
    <header className="topbar">
      <button className="ghost lg-hidden" onClick={onOpenMenu}>
        {SHELL_COPY.openMenuLabel}
      </button>
      <div>
        <strong>{SHELL_COPY.topbarTitle}</strong>
        <p>{SHELL_COPY.topbarSubtitle}</p>
      </div>
      <Link to={SHELL_COPY.adminShortcutPath} className="pill">
        {SHELL_COPY.adminShortcutLabel}
      </Link>
    </header>
  );
}
