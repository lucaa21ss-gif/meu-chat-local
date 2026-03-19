function downloadJsonFile(text, filename) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createTelemetryAdminController({
  state,
  apiBase,
  fetchJson,
  telemetryOptInEl,
  showStatus,
  formatDateLabel,
  onAfterConfigRollback,
  fetchImpl = fetch,
}) {
  function formatConfigVersionLabel(item) {
    const map = {
      "chat.systemPrompt": "Prompt da conversa",
      "user.defaultSystemPrompt": "Prompt padrao do perfil",
      "user.theme": "Tema do perfil",
      "user.storageLimitMb": "Limite de armazenamento",
      "app.telemetryEnabled": "Telemetria local",
    };
    const label = map[item.configKey] || item.configKey;
    const target = item.targetId ? ` (${item.targetType}:${item.targetId})` : "";
    return `${label}${target}`;
  }

  function formatConfigVersionValue(value) {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null || value === undefined) return "null";
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  async function loadTelemetryState() {
    try {
      const data = await fetchJson("/api/telemetry");
      state.telemetryEnabled = !!data.enabled;
      if (telemetryOptInEl) telemetryOptInEl.checked = state.telemetryEnabled;
    } catch (error) {
      console.error("Nao foi possivel carregar estado da telemetria:", error);
    }
  }

  async function setTelemetryEnabled(enabled) {
    try {
      const data = await fetchJson("/api/telemetry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !!enabled }),
      });
      state.telemetryEnabled = !!data.enabled;
      if (telemetryOptInEl) telemetryOptInEl.checked = state.telemetryEnabled;
      showStatus(
        state.telemetryEnabled
          ? "Telemetria local ativada."
          : "Telemetria local desativada e limpa.",
        { type: "success", autoHideMs: 2500 },
      );
    } catch (error) {
      showStatus(`Nao foi possivel atualizar telemetria: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function showTelemetryStats() {
    try {
      const data = await fetchJson("/api/telemetry");
      const lines = (data.stats || []).slice(0, 10).map((item) => {
        return `${item.method} ${item.path} | req=${item.count} err=${item.errors} avg=${item.avgMs}ms`;
      });
      const text = lines.length
        ? lines.join("\n")
        : "Sem metricas registradas ainda.";
      window.alert(text);
    } catch (error) {
      showStatus(`Nao foi possivel carregar metricas: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function exportAuditLogsJson() {
    try {
      const response = await fetchImpl(
        `${apiBase}/api/audit/export?userId=${encodeURIComponent(state.userId)}`,
      );
      if (!response.ok) {
        throw new Error("Falha ao exportar auditoria");
      }

      const jsonText = await response.text();
      downloadJsonFile(jsonText, `audit-${state.userId}.json`);

      showStatus("Auditoria exportada com sucesso.", {
        type: "success",
        autoHideMs: 2500,
      });
    } catch (error) {
      showStatus(`Falha ao exportar auditoria: ${error.message}`, {
        type: "error",
        retryAction: () => exportAuditLogsJson(),
      });
      throw error;
    }
  }

  async function exportDiagnosticsPackage() {
    try {
      const response = await fetchImpl(`${apiBase}/api/diagnostics/export`, {
        headers: { "x-user-id": state.userId || "" },
      });

      if (!response.ok) {
        const traceId = response.headers.get("x-trace-id");
        let msg = "Falha ao exportar diagnostico";
        try {
          const data = await response.json();
          msg = data?.error || msg;
        } catch {
          /* noop */
        }
        const err = new Error(msg);
        err.traceId = traceId;
        throw err;
      }

      const jsonText = await response.text();
      downloadJsonFile(jsonText, `diagnostics-${new Date().toISOString().slice(0, 10)}.json`);

      showStatus("Pacote de diagnostico exportado com sucesso.", {
        type: "success",
        autoHideMs: 2500,
      });
    } catch (error) {
      showStatus(`Falha ao exportar diagnostico: ${error.message}`, {
        type: "error",
        traceId: error.traceId,
        retryAction: () => exportDiagnosticsPackage(),
      });
      throw error;
    }
  }

  async function openConfigHistoryRollback() {
    const response = await fetchJson("/api/config/versions?limit=20");
    const versions = Array.isArray(response.versions) ? response.versions : [];

    if (!versions.length) {
      showStatus("Ainda nao ha versoes de configuracao registradas.", {
        type: "success",
        autoHideMs: 2500,
      });
      return;
    }

    const lines = versions.slice(0, 12).map((item) => {
      const when = formatDateLabel(item.createdAt);
      const by = item.actorUserId ? ` por ${item.actorUserId}` : "";
      return `#${item.id} | ${formatConfigVersionLabel(item)} | ${formatConfigVersionValue(item.value)} | ${when}${by}`;
    });

    const picked = window.prompt(
      `Historico de configuracoes:\n\n${lines.join("\n")}\n\nDigite o ID da versao para restaurar:`,
    );
    if (picked === null) return;

    const versionId = Number.parseInt(String(picked).trim(), 10);
    if (!Number.isFinite(versionId) || versionId < 1) {
      showStatus("ID de versao invalido.", {
        type: "error",
        autoHideMs: 2500,
      });
      return;
    }

    const selected = versions.find((item) => item.id === versionId);
    if (!selected) {
      showStatus("Versao nao encontrada na listagem atual.", {
        type: "error",
        autoHideMs: 2500,
      });
      return;
    }

    const confirmed = window.confirm(
      `Restaurar a versao #${selected.id}?\n${formatConfigVersionLabel(selected)} = ${formatConfigVersionValue(selected.value)}`,
    );
    if (!confirmed) return;

    try {
      const rollback = await fetchJson(
        `/api/config/versions/${encodeURIComponent(versionId)}/rollback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      await onAfterConfigRollback();

      showStatus(
        rollback.changed
          ? "Rollback de configuracao aplicado com sucesso."
          : "Rollback idempotente: configuracao ja estava no valor selecionado.",
        {
          type: "success",
          autoHideMs: 3000,
        },
      );
    } catch (error) {
      showStatus(`Falha ao executar rollback: ${error.message}`, {
        type: "error",
      });
    }
  }

  return {
    loadTelemetryState,
    setTelemetryEnabled,
    showTelemetryStats,
    exportAuditLogsJson,
    exportDiagnosticsPackage,
    openConfigHistoryRollback,
  };
}
