import { GUIDE_COPY } from "../constants/ui-copy.js";

export default function GuidePage() {
  return (
    <section className="card">
      <h2>{GUIDE_COPY.title}</h2>
      <ol className="guide-steps">
        {GUIDE_COPY.steps.map((step) => (
          <li key={step.label}>
            <strong>{step.label}</strong>
            <pre>{step.command}</pre>
          </li>
        ))}
        <li>
          <strong>{GUIDE_COPY.accessLabel}</strong> <code>{GUIDE_COPY.accessAppPath}</code> para chat e{" "}
          <code>{GUIDE_COPY.accessAdminPath}</code> {GUIDE_COPY.accessSuffix}
        </li>
      </ol>

      <h3 className="section-title">{GUIDE_COPY.shortcutsTitle}</h3>
      <ul className="simple-list">
        {GUIDE_COPY.shortcuts.map((item) => (
          <li key={item.key}>
            <strong>{item.key}</strong>: {item.description}
          </li>
        ))}
      </ul>
    </section>
  );
}
