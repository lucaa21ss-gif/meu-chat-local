function bindAsyncButton(element, action, onError = console.error, eventType = "click") {
  if (!element) return;
  element.addEventListener(eventType, () => {
    action().catch(onError);
  });
}

export function bindAdminTelemetryButtons({
  telemetryOptInEl,
  telemetryStatsBtnEl,
  auditExportBtnEl,
  configHistoryBtnEl,
  diagnosticsExportBtnEl,
  setTelemetryEnabled,
  showTelemetryStats,
  exportAuditLogsJson,
  openConfigHistoryRollback,
  exportDiagnosticsPackage,
  showStatus,
}) {
  const telemetryButtonHandlers = [
    [telemetryOptInEl, () => setTelemetryEnabled(telemetryOptInEl.checked), console.error, "change"],
    [telemetryStatsBtnEl, showTelemetryStats, console.error, "click"],
    [auditExportBtnEl, exportAuditLogsJson, console.error, "click"],
    [configHistoryBtnEl, openConfigHistoryRollback, (error) => {
      showStatus(`Falha no rollback de configuracao: ${error.message}`, {
        type: "error",
        traceId: error.traceId,
      });
    }, "click"],
    [diagnosticsExportBtnEl, exportDiagnosticsPackage, (error) => {
      showStatus(`Falha ao exportar diagnostico: ${error.message}`, {
        type: "error",
        traceId: error.traceId,
      });
    }, "click"],
  ];

  telemetryButtonHandlers.forEach(([btn, action, onError, eventType = "click"]) => {
    bindAsyncButton(btn, action, onError, eventType);
  });
}

export function bindHealthStorageButtons({
  state,
  healthRefreshBtnEl,
  storageRefreshBtnEl,
  storageCleanupBtnEl,
  storageLimitBtnEl,
  checkOllamaStatus,
  loadStorageUsage,
  runStorageCleanup,
  updateStorageLimitForCurrentUser,
  showStatus,
}) {
  if (healthRefreshBtnEl) {
    healthRefreshBtnEl.addEventListener("click", () => {
      if (state.healthPoller) {
        state.healthPoller.refreshNow();
        return;
      }
      checkOllamaStatus().catch(console.error);
    });
  }

  const storageButtonHandlers = [
    [storageRefreshBtnEl, loadStorageUsage, console.error],
    [storageCleanupBtnEl, runStorageCleanup, (error) => {
      showStatus(`Falha na limpeza: ${error.message}`, { type: "error" });
    }],
    [storageLimitBtnEl, updateStorageLimitForCurrentUser, (error) => {
      showStatus(`Falha ao atualizar limite: ${error.message}`, {
        type: "error",
      });
    }],
  ];

  storageButtonHandlers.forEach(([btn, action, onError]) => {
    bindAsyncButton(btn, action, onError);
  });
}