import { Link } from "react-router-dom";
import { SHELL_COPY } from "../constants/ui-copy.js";

export default function AppTopbar({ onOpenMenu }) {
  return (
    <header className="glass-surface rounded-2xl flex items-center justify-between gap-4 px-5 py-3 animate-fade-slide-up">
      <button className="ai-btn-secondary lg-hidden" onClick={onOpenMenu}>
        {SHELL_COPY.openMenuLabel}
      </button>
      <div className="flex-1">
        <strong className="text-[#e2e8f0] font-semibold">{SHELL_COPY.topbarTitle}</strong>
        <p className="ai-section-label mt-1">{SHELL_COPY.topbarSubtitle}</p>
      </div>
      <Link to={SHELL_COPY.adminShortcutPath} className="ai-active-area-pill">
        {SHELL_COPY.adminShortcutLabel}
      </Link>
    </header>
  );
}
