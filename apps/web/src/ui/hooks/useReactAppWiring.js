import { useEffect, useMemo, useRef } from "react";
import { createApiClient } from "../../app/shared/api.js";
import { createReactAppWiringContract } from "../../app/shared/app-wiring-react.js";
import { UI_STATE_ACTION_TYPES } from "../state/ui-state-contract.js";
import { DEFAULT_UI_STATUS_LEVEL } from "../state/status-level-contract.js";

export default function useReactAppWiring({ uiStatus, dispatch }) {
  const stateRef = useRef({});

  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      status: uiStatus,
    };
  }, [uiStatus]);

  const apiClient = useMemo(() => createApiClient({ baseUrl: "" }), []);

  const wiring = useMemo(
    () =>
      createReactAppWiringContract({
        stateRef,
        dispatch,
        fetchers: {
          fetchJson: apiClient.fetchJson,
        },
        elements: {
          statusBarEl: null,
          statusTextEl: null,
          statusRetryBtnEl: null,
          chatEl: null,
          tabsEl: null,
        },
        callbacks: {
          buildChatsQueryString: () => "",
          renderTabs: () => {},
          appendMessage: () => {},
          hideTyping: () => {},
          hideStatus: () => {},
          showStatus: (message) =>
            dispatch({
              type: UI_STATE_ACTION_TYPES.STATUS,
              payload: { message, level: DEFAULT_UI_STATUS_LEVEL },
            }),
          loadRagDocuments: async () => {},
          runHistorySearch: async () => {},
          clearSearchResults: () => {},
          getCurrentUser: () => null,
          getMainModelSelect: () => null,
          applyThemeMode: () => {},
          openConfirmModal: async () => false,
          openDuplicateModal: async () => null,
          uid: () => `chat-${Date.now()}`,
          onLoadChats: async () => {},
          onSwitchChat: async () => {},
        },
      }),
    [apiClient.fetchJson, dispatch],
  );

  return {
    fetchJson: apiClient.fetchJson,
    showStatus: wiring.reactUi.dispatchStatus,
  };
}
