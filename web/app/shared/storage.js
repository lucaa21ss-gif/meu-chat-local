import { createFetchHelpers } from "./fetch-helpers.js";


export function createStorageController({
  state,
  storageUsageTextEl,
  storageAlertTextEl,
  fetchJson,
  formatBytes,
  openConfirmModal,
  showStatus,
  onLoadUsers,
}) {
  function renderUsage() {
    if (!storageUsageTextEl) return;
    const storage = state.storage || {};
    storageUsageTextEl.textContent =
      `DB ${formatBytes(storage.dbBytes)} | uploads ${formatBytes(storage.uploadsBytes)} | documentos ${formatBytes(storage.documentsBytes)} | total ${formatBytes(storage.totalBytes)} / limite ${storage.storageLimitMb} MB`;

    if (!storageAlertTextEl) return;
    const usagePercent = Number.parseInt(storage.usagePercent, 10) || 0;
    if (usagePercent >= 95) {
      storageAlertTextEl.textContent = `Alerta critico: ${usagePercent}% do limite utilizado.`;
      return;
    }
    if (usagePercent >= 80) {
      storageAlertTextEl.textContent = `Atencao: ${usagePercent}% do limite utilizado.`;
      return;
    }
    storageAlertTextEl.textContent = `Saudavel: ${usagePercent}% do limite utilizado.`;
  }

  function promptAndParseInt(message, defaultValue = "0") {
    const raw = window.prompt(message, defaultValue);
    if (raw === null) return null;
    return Number.parseInt(raw, 10);
  }

  const { doFetchWithRetry, fetchJsonBody } = createFetchHelpers(fetchJson, showStatus);

  async function loadUsage() {
    if (!state.userId) return;
    try {
      const data = await fetchJson(
        `/api/storage/usage?userId=${encodeURIComponent(state.userId)}`,
      );
      state.storage = {
        dbBytes: data?.usage?.dbBytes || 0,
        uploadsBytes: data?.usage?.uploadsBytes || 0,
        documentsBytes: data?.usage?.documentsBytes || 0,
        backupsBytes: data?.usage?.backupsBytes || 0,
        totalBytes: data?.usage?.totalBytes || 0,
        storageLimitMb: data?.limit?.storageLimitMb || 512,
        usagePercent: data?.usagePercent || 0,
      };
      renderUsage();
    } catch (error) {
      if (storageAlertTextEl) {
        storageAlertTextEl.textContent = "Falha ao carregar uso de armazenamento.";
      }
      console.error("Falha em loadStorageUsage:", error.message);
    }
  }

  async function runCleanup() {
    const olderThanDays = promptAndParseInt("Remover arquivos mais antigos que quantos dias?", "30");
    if (olderThanDays === null) return;

    const maxDeleteMb = promptAndParseInt("Limite maximo de limpeza (MB):", "500");
    if (maxDeleteMb === null) return;

    const cleanupPayload = {
      target: "all",
      olderThanDays,
      maxDeleteMb,
    };

    const dryRun = await fetchJsonBody("/api/storage/cleanup", "POST", { mode: "dry-run", ...cleanupPayload });

    const summary = dryRun?.cleanup || {};
    const confirmed = await openConfirmModal(
      `Dry-run: ${summary.filesCount || 0} arquivo(s), estimativa ${formatBytes(summary.estimatedFreedBytes || 0)}. Executar limpeza agora?`,
    );
    if (!confirmed) return;

    await doFetchWithRetry(
      async () => {
        await fetchJsonBody("/api/storage/cleanup", "POST", { mode: "execute", ...cleanupPayload });
        await loadUsage();
      },
      "Limpeza de armazenamento concluida.",
      "Nao foi possivel executar limpeza",
    );
  }

  async function updateLimitForCurrentUser() {
    if (!state.userId) return;
    const current = Number.parseInt(state.storage.storageLimitMb, 10) || 512;
    const limit = promptAndParseInt("Novo limite de armazenamento (MB):", String(current));
    if (limit === null) return;

    await doFetchWithRetry(
      async () => {
        await fetchJsonBody(`/api/users/${encodeURIComponent(state.userId)}/storage-limit`, "PATCH", { storageLimitMb: limit });
        await onLoadUsers();
        await loadUsage();
      },
      "Limite de armazenamento atualizado.",
      "Nao foi possivel atualizar limite",
    );
  }

  return {
    renderUsage,
    loadUsage,
    runCleanup,
    updateLimitForCurrentUser,
  };
}