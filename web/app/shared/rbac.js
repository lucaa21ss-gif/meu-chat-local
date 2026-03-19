export function createRbacController({ getCurrentUser }) {
  function getCurrentUserRole() {
    const user = getCurrentUser();
    const role = String(user?.role || "viewer").toLowerCase();
    if (["admin", "operator", "viewer"].includes(role)) return role;
    return "viewer";
  }

  function hasRole(minimumRole) {
    const levels = { viewer: 1, operator: 2, admin: 3 };
    const current = levels[getCurrentUserRole()] || 0;
    const required = levels[minimumRole] || 0;
    return current >= required;
  }

  function updateUi() {
    const isAdmin = hasRole("admin");
    const isOperator = hasRole("operator");

    const adminOnly = [
      document.getElementById("newUserBtn"),
      document.getElementById("renameUserBtn"),
      document.getElementById("deleteUserBtn"),
      document.getElementById("backupBtn"),
      document.getElementById("backupBtnMobile"),
      document.getElementById("restoreBackupBtn"),
      document.getElementById("restoreBackupBtnMobile"),
      document.getElementById("storageCleanupBtn"),
      document.getElementById("storageLimitBtn"),
      document.getElementById("auditExportBtn"),
      document.getElementById("configHistoryBtn"),
      document.getElementById("telemetryOptIn"),
      document.getElementById("diagnosticsExportBtn"),
      document.getElementById("telemetryStatsBtn"),
    ];

    const operatorAndAbove = [
      document.getElementById("exportJsonBtn"),
      document.getElementById("exportJsonBtnMobile"),
      document.getElementById("importJsonBtn"),
      document.getElementById("importJsonBtnMobile"),
      document.getElementById("exportAllJsonBtn"),
      document.getElementById("exportAllJsonBtnMobile"),
      document.getElementById("exportFavoritesMdBtn"),
      document.getElementById("exportFavoritesMdBtnMobile"),
    ];

    for (const el of adminOnly) {
      if (!el) continue;
      el.hidden = !isAdmin;
      el.disabled = !isAdmin;
    }

    for (const el of operatorAndAbove) {
      if (!el) continue;
      el.hidden = !isOperator;
      el.disabled = !isOperator;
    }

    const roleBadgeEl = document.getElementById("currentRoleBadge");
    if (roleBadgeEl) {
      const labels = { admin: "Admin", operator: "Operador", viewer: "Visualizador" };
      roleBadgeEl.textContent = labels[getCurrentUserRole()] || "Visualizador";
    }
  }

  return {
    getCurrentUserRole,
    hasRole,
    updateUi,
  };
}
