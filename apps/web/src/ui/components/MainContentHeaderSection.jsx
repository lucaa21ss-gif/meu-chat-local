import HealthCard from "./HealthCard.jsx";
import UiStatusBanner from "./UiStatusBanner.jsx";

export default function MainContentHeaderSection({ status, fetchJson, showStatus }) {
  return (
    <>
      <UiStatusBanner status={status} />
      <HealthCard fetchJson={fetchJson} onStatus={showStatus} />
    </>
  );
}
