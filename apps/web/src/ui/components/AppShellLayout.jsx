import AppSidebar from "./AppSidebar.jsx";
import AppTopbar from "./AppTopbar.jsx";

export default function AppShellLayout({
  menuOpen,
  backdropClassName,
  onCloseMenu,
  onOpenMenu,
  children,
}) {
  return (
    <div className="app-shell">
      <div className={backdropClassName} onClick={onCloseMenu} />
      <AppSidebar menuOpen={menuOpen} onCloseMenu={onCloseMenu} />

      <main className="content">
        <AppTopbar onOpenMenu={onOpenMenu} />
        {children}
      </main>
    </div>
  );
}
