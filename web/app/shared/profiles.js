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

  async function loadUsers() {
    try {
      const data = await fetchJson("/api/users");
      state.users = data.users || [];
      if (!state.users.some((user) => user.id === state.userId)) {
        state.userId = "user-default";
        localStorage.setItem("chatUserId", state.userId);
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
    state.userId = userId;
    onResetChatListPagination();
    localStorage.setItem("chatUserId", userId);
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
    const name = window.prompt("Nome do novo perfil:");
    if (name === null) return;

    const trimmed = name.trim();
    if (!trimmed) return;

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
    const current = state.users.find((user) => user.id === state.userId);
    if (!current) return;

    const name = window.prompt("Novo nome do perfil:", current.name || "");
    if (name === null) return;

    const trimmed = name.trim();
    if (!trimmed || trimmed === current.name) return;

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

    const current = state.users.find((user) => user.id === state.userId);
    const confirmed = window.confirm(
      `Excluir o perfil "${current?.name || state.userId}" e TODAS as suas conversas?`,
    );
    if (!confirmed) return;

    try {
      await fetchJson(`/api/users/${encodeURIComponent(state.userId)}`, {
        method: "DELETE",
      });
      state.userId = "user-default";
      localStorage.setItem("chatUserId", state.userId);
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