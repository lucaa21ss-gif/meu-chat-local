import AppSidebar from "./AppSidebar.jsx";
import AppTopbar from "./AppTopbar.jsx";

export default function AppShellLayout({
  onCloseMenu,
  onOpenMenu,
  children,
}) {
  return (
    <div className="flex min-h-screen ai-bg-neural">
      {/* Backdrop controlado via body.ai-sidebar-open pelo CSS do novo design system */}
      <div className="ai-sidebar-backdrop" onClick={onCloseMenu} />

      <AppSidebar onCloseMenu={onCloseMenu} />

      <main className="flex-1 flex flex-col gap-4 p-4 min-w-0 overflow-auto">
        <AppTopbar onOpenMenu={onOpenMenu} />
        {children}
      </main>
    </div>
  );
}
