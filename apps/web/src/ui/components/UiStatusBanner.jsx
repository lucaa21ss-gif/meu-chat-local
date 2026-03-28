export default function UiStatusBanner({ status }) {
  if (!status?.message) return null;

  return (
    <section className="card">
      <p className="hint">
        Status ({status.level}): {status.message}
      </p>
    </section>
  );
}
