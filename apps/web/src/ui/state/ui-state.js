export const INITIAL_UI_STATE = {
  status: {
    message: "",
    level: "info",
  },
};

export function uiReducer(state, action) {
  if (action?.type === "ui/status") {
    return {
      ...state,
      status: {
        message: action.payload?.message || "",
        level: action.payload?.level || "info",
      },
    };
  }

  if (action?.type === "chat/setActive") {
    return state;
  }

  return state;
}
