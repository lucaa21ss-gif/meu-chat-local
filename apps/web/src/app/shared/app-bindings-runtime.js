export function bindStatusRetryButton({
  statusRetryBtnEl,
  statusPresenter,
}) {
  if (!statusRetryBtnEl) return;

  statusRetryBtnEl.addEventListener("click", async () => {
    const action = statusPresenter.getRetryAction();
    if (!action) return;
    try {
      await action();
    } catch (error) {
      console.error(error);
    }
  });
}

export function bindChatListButtons({
  state,
  tabsEl,
  chatListLoadMoreBtnEl,
  loadChats,
}) {
  if (chatListLoadMoreBtnEl) {
    chatListLoadMoreBtnEl.addEventListener("click", () => {
      if (state.chatList.page >= state.chatList.totalPages) return;
      state.chatList.page += 1;
      loadChats({ appendPage: true }).catch(console.error);
    });
  }
  if (tabsEl) {
    tabsEl.addEventListener("scroll", () => {
      state.chatList.scrollTop = tabsEl.scrollTop;
    });
  }
}