import { normalizeUiStatus } from "../state/status-level-contract.js";

export default function UiStatusBanner({ status }) {
  const normalizedStatus = normalizeUiStatus(status);

  if (!normalizedStatus.message) return null;

  return (
    <section className="card">
      <p className="hint">
        Status ({normalizedStatus.level}): {normalizedStatus.message}
      </p>
    </section>
  );
}
