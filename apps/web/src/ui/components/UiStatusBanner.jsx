import { normalizeUiStatus } from "../state/ui-contracts.js";

const STATUS_ICONS = { info: "✦", success: "✓", warning: "⚠", error: "✕" };

export default function UiStatusBanner({ status }) {
  const normalizedStatus = normalizeUiStatus(status);
  if (!normalizedStatus.message) return null;

  return (
    <div className="animate-fade-slide-up">
      <span className="ai-status-badge" data-level={normalizedStatus.level}>
        <span aria-hidden="true">{STATUS_ICONS[normalizedStatus.level] ?? "●"}</span>
        {normalizedStatus.message}
      </span>
    </div>
  );
}
