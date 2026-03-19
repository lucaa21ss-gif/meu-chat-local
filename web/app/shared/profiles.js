export function createProfilesController({
  state,
  userSelectEl,
  fetchJson,
  showStatus,
  onSyncThemeFromCurrentUser,
  onUpdateRbacUi,
  onLoadStorageUsage,
  onLoadChats,
  onLoadRagDocuments,
  onResetChatListPagination,
}) {
  function renderUsers() {
    if (!userSelectEl) return;
    userSelectEl.innerHTML = "";
    state.users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.name;
      if (user.id === state.userId) option.selected = true;
      userSelectEl.appendChild(option);
    });
  }

  function getCurrentUser() {
    return state.users.find((user) => user.id === state.userId);
  }

  function setCurrentUser(userId) {
    state.userId = userId;
    localStorage.setItem("chatUserId", userId);
  }

  function getAndValidateProfileName(promptMessage, currentName = "") {
    const name = window.prompt(promptMessage, currentName);
    if (name === null) return null;
    const trimmed = name.trim();
    return trimmed || null;
  }

  async function loadUsers() {
    try {
      const data = await fetchJson("/api/users");
      state.users = data.users || [];
      if (!state.users.some((user) => user.id === state.userId)) {
        setCurrentUser("user-default");
      }
      renderUsers();
      onSyncThemeFromCurrentUser();
      onUpdateRbacUi();
      await onLoadStorageUsage();
    } catch (error) {
      console.error("Nao foi possivel carregar perfis:", error.message);
    }
  }

  async function switchUser(userId) {
    setCurrentUser(userId);
    onResetChatListPagination();
    try {
      await fetchJson("/api/audit/profile-switch", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error("Falha ao registrar troca de perfil:", error.message);
    }
    renderUsers();
    onSyncThemeFromCurrentUser();
    onUpdateRbacUi();
    await onLoadChats();
    await onLoadRagDocuments();
    await onLoadStorageUsage();
  }

  async function createProfile() {
    const trimmed = getAndValidateProfileName("Nome do novo perfil:");
    if (trimmed === null) return;

    try {
      const payload = await fetchJson("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      await loadUsers();
      await switchUser(payload.user.id);
      showStatus(`Perfil "${trimmed}" criado com sucesso.`, {
        type: "success",
        autoHideMs: 3000,
      });
    } catch (error) {
      showStatus(`Nao foi possivel criar perfil: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function renameCurrentProfile() {
    const current = getCurrentUser();
    if (!current) return;

    const trimmed = getAndValidateProfileName("Novo nome do perfil:", current.name || "");
    if (trimmed === null || trimmed === current.name) return;

    try {
      await fetchJson(`/api/users/${encodeURIComponent(state.userId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      await loadUsers();
      showStatus("Perfil renomeado com sucesso.", {
        type: "success",
        autoHideMs: 3000,
      });
    } catch (error) {
      showStatus(`Nao foi possivel renomear perfil: ${error.message}`, {
        type: "error",
      });
    }
  }

  async function deleteCurrentProfile() {
    if (state.userId === "user-default") {
      showStatus("O perfil padrao nao pode ser excluido.", {
        type: "error",
        autoHideMs: 3000,
      });
      return;
    }

    const current = getCurrentUser();
    const confirmed = window.confirm(
      `Excluir o perfil "${current?.name || state.userId}" e TODAS as suas conversas?`,
    );
    if (!confirmed) return;

    try {
      await fetchJson(`/api/users/${encodeURIComponent(state.userId)}`, {
        method: "DELETE",
      });
      setCurrentUser("user-default");
      await loadUsers();
      await onLoadChats();
      await onLoadRagDocuments();
      showStatus("Perfil excluido com sucesso.", {
        type: "success",
        autoHideMs: 3000,
      });
    } catch (error) {
      showStatus(`Nao foi possivel excluir perfil: ${error.message}`, {
        type: "error",
      });
    }
  }

  return {
    renderUsers,
    loadUsers,
    switchUser,
    createProfile,
    renameCurrentProfile,
    deleteCurrentProfile,
  };
}