import { readFileAsBase64 } from "./files.js";

import { createFetchHelpers } from "./fetch-helpers.js";

function promptBackupPassphrase(message) {
  const passphraseInput = window.prompt(message, "");
  if (passphraseInput === null) return null;

  const passphrase = String(passphraseInput || "").trim();
  return passphrase;
}

function validatePassphrase(passphrase, showStatus) {
  if (passphrase && passphrase.length < 8) {
    showStatus("A passphrase deve ter pelo menos 8 caracteres.", {
      type: "error",
      autoHideMs: 4000,
    });
    return false;
  }

  return true;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getAndValidatePassphrase(message, showStatus) {
  const passphrase = promptBackupPassphrase(message);
  if (passphrase === null) return null;
  if (!validatePassphrase(passphrase, showStatus)) return null;
  return passphrase;
}

export function createBackupController({
  apiBase,
  backupRestoreInputEl,
  fetchJson,
  showStatus,
  openConfirmModal,
  onLoadUsers,
  onLoadChats,
  onLoadRagDocuments,
}) {
  const { doFetchWithRetry } = createFetchHelpers(fetchJson, showStatus);

  async function exportFullBackup() {
    const passphrase = getAndValidatePassphrase(
      "Passphrase opcional para proteger o backup (minimo 8 caracteres). Deixe vazio para gerar backup legado sem criptografia:",
      showStatus,
    );
    if (passphrase === null) return;

    await doFetchWithRetry(
      async () => {
        const headers = {};
      if (passphrase) {
        headers["x-backup-passphrase"] = passphrase;
      }

      const response = await fetch(`${apiBase}/api/backup/export`, { headers });
      if (!response.ok) {
        throw new Error("Falha ao gerar backup");
      }

      const blob = await response.blob();
      const header = String(response.headers.get("content-disposition") || "");
      const match = header.match(/filename="?([^";]+)"?/i);
      const fileName = match?.[1] || `meu-chat-local-backup-${Date.now()}.tgz`;
      const isProtected =
        String(response.headers.get("x-backup-protected") || "") === "true";

      downloadBlob(blob, fileName);

      showStatus(
        isProtected
          ? "Backup completo exportado com criptografia (passphrase obrigatoria para restaurar)."
          : "Backup completo exportado sem criptografia (compatibilidade legado).",
        {
          type: "success",
          autoHideMs: 4000,
        },
      );
      },
      "Backup exportado com sucesso.",
      "Nao foi possivel exportar backup",
    );
  }

  async function pickBackupFile() {
    if (!backupRestoreInputEl) return null;

    backupRestoreInputEl.value = "";
    const file = await new Promise((resolve) => {
      backupRestoreInputEl.addEventListener(
        "change",
        () => resolve(backupRestoreInputEl.files?.[0] || null),
        { once: true },
      );
      backupRestoreInputEl.click();
    });

    return file;
  }

  async function restoreFullBackup() {
    const confirmed = await openConfirmModal(
      "Restaurar backup ira substituir o banco atual. Deseja continuar?",
    );
    if (!confirmed) return;

    const file = await pickBackupFile();
    if (!file) return;

    await doFetchWithRetry(
      async () => {
      const passphrase = getAndValidatePassphrase(
        "Se o backup estiver criptografado, informe a passphrase. Para backup legado, deixe vazio:",
        showStatus,
      );
      if (passphrase === null) return;

      const archiveBase64 = await readFileAsBase64(file, {
        readErrorMessage: "Falha ao ler arquivo",
        emptyFileMessage: "Arquivo de backup invalido",
      });
      await fetchJson("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveBase64, passphrase: passphrase || null }),
      });

      await onLoadUsers();
      await onLoadChats();
      await onLoadRagDocuments();

      showStatus(
        passphrase
          ? "Backup restaurado com sucesso (modo protegido)."
          : "Backup restaurado com sucesso.",
        {
          type: "success",
          autoHideMs: 3500,
        },
      );
      },
      "Backup restaurado com sucesso.",
      "Nao foi possivel restaurar backup",
    );
  }

  return {
    exportFullBackup,
    restoreFullBackup,
  };
}