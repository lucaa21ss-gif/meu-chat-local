import AppMainContent from "./components/AppMainContent.jsx";
import AppShellLayout from "./components/AppShellLayout.jsx";
import useAppController from "./hooks/useAppController.js";

export default function App() {
  const controller = useAppController();

  return (
    <AppShellLayout
      menuOpen={controller.menuOpen}
      backdropClassName={controller.backdropClassName}
      onCloseMenu={controller.closeMenu}
      onOpenMenu={controller.openMenu}
    >
      <AppMainContent status={controller.status} fetchJson={controller.fetchJson} showStatus={controller.showStatus} />
    </AppShellLayout>
  );
}
