import AppRoutes from "./AppRoutes.jsx";
import MainContentHeaderSection from "./MainContentHeaderSection.jsx";

export default function AppMainContent({ status, fetchJson, showStatus }) {
  return (
    <>
      <MainContentHeaderSection status={status} fetchJson={fetchJson} showStatus={showStatus} />
      <AppRoutes fetchJson={fetchJson} showStatus={showStatus} />
    </>
  );
}
