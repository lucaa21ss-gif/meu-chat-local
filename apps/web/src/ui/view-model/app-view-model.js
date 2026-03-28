export function createAppShellProps(controller) {
  return {
    menuOpen: controller.menuOpen,
    backdropClassName: controller.backdropClassName,
    onCloseMenu: controller.closeMenu,
    onOpenMenu: controller.openMenu,
  };
}

export function createAppMainContentProps(controller) {
  return {
    status: controller.status,
    fetchJson: controller.fetchJson,
    showStatus: controller.showStatus,
  };
}

export function buildAppViewModel(controller) {
  return {
    shell: createAppShellProps(controller),
    mainContent: createAppMainContentProps(controller),
  };
}
