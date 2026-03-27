export const RUNBOOK_PATHS = {
  index: "docs/runbooks/README.md",
  modelOffline: "docs/runbooks/incident-model-offline.md",
  dbDegraded: "docs/runbooks/incident-db-degraded.md",
  diskPressure: "docs/runbooks/incident-disk-pressure.md",
  backupRestore: "docs/runbooks/backup-restore.md",
  approvalOutage: "docs/runbooks/emergency-approval-outage.md",
};

function pushSuggestion(target, key, reason) {
  if (!RUNBOOK_PATHS[key]) return;
  if (target.some((item) => item.key === key)) return;
  target.push({ key, path: RUNBOOK_PATHS[key], reason });
}

export function buildApiRunbookSuggestions(checks = []) {
  const suggestions = [];
  pushSuggestion(suggestions, "index", "Indice geral para triagem operacional rapida.");

  const healthCheck = checks.find((item) => item.name === "health");
  const chatCheck = checks.find((item) => item.name === "chat-flow");
  const diagnosticsCheck = checks.find((item) => item.name === "diagnostics");

  const alerts = Array.isArray(healthCheck?.details?.alerts)
    ? healthCheck.details.alerts.map((item) => String(item).toLowerCase())
    : [];

  if (!healthCheck?.ok) {
    if (alerts.some((item) => item.includes("modelo") || item.includes("ollama"))) {
      pushSuggestion(suggestions, "modelOffline", "Health reportou modelo/Ollama degradado ou offline.");
    }
    if (alerts.some((item) => item.includes("banco"))) {
      pushSuggestion(suggestions, "dbDegraded", "Health reportou indisponibilidade ou degradacao de banco.");
    }
    if (alerts.some((item) => item.includes("disco"))) {
      pushSuggestion(suggestions, "diskPressure", "Health reportou pressao de disco ou espaco baixo.");
    }
  }

  if (!chatCheck?.ok) {
    pushSuggestion(suggestions, "modelOffline", "Fluxo de chat falhou; validar indisponibilidade do modelo e fallback/retry.");
  }

  if (!diagnosticsCheck?.ok && !healthCheck?.ok) {
    pushSuggestion(suggestions, "dbDegraded", "Diagnostics e health falharam juntos; revisar persistencia e estado operacional da API.");
  }

  if (!diagnosticsCheck?.ok && alerts.length === 0) {
    pushSuggestion(suggestions, "backupRestore", "Diagnostics falhou sem alerta especifico; considerar restauracao apenas apos confirmar corrupcao/estado inconsistente.");
  }

  return suggestions.map(({ key, ...rest }) => rest);
}

export function buildStructuralRunbookSuggestions(checks = []) {
  const suggestions = [];
  pushSuggestion(suggestions, "index", "Indice geral para triagem estrutural e operacional.");

  for (const check of checks) {
    if (check.ok) continue;
    const ref = String(check.ref || "").toLowerCase();

    if (ref.includes("sqlite") || ref.includes("app-create") || ref.includes("entrypoints")) {
      pushSuggestion(suggestions, "dbDegraded", "Falha estrutural em bootstrap/API/persistencia pode indicar degradacao de banco ou inicializacao.");
    }

    if (ref.includes("backup")) {
      pushSuggestion(suggestions, "backupRestore", "Falha estrutural na cadeia de backup pede revisao do runbook de restore/recuperacao.");
    }

    if (ref.includes("app-constants") || ref.includes("shared/config")) {
      pushSuggestion(suggestions, "dbDegraded", "Falha em config compartilhada pode impedir inicializacao correta da API.");
    }
  }

  return suggestions.map(({ key, ...rest }) => rest);
}
