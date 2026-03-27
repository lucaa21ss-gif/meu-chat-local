export function bindThemeButton({
  darkModeBtnEl,
  cycleThemeMode,
  saveThemeForCurrentUser,
  showStatus,
}) {
  if (!darkModeBtnEl) return;

  darkModeBtnEl.addEventListener("click", async () => {
    const nextTheme = cycleThemeMode();
    try {
      await saveThemeForCurrentUser(nextTheme);
      showStatus(`Tema atualizado: ${nextTheme}.`, {
        type: "success",
        autoHideMs: 1800,
      });
    } catch (error) {
      showStatus(`Falha ao salvar tema do perfil: ${error.message}`, {
        type: "error",
      });
    }
  });
}