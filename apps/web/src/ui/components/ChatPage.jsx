import { useState } from "react";
import { UI_STATUS_LEVELS } from "../contracts/index.js";
import { buildChatRequest } from "../state/chat-request-contract.js";
import { API_ENDPOINTS } from "../state/api-endpoints-contract.js";
import {
  API_HEADER_DEFAULTS,
  API_HEADER_NAMES,
} from "../state/api-headers-contract.js";
import {
  CHAT_STATUS_MESSAGES,
  CHAT_UI_COPY,
  resolveChatReply,
  buildChatSendErrorMessage,
} from "../state/chat-ui-contract.js";

export default function ChatPage({ fetchJson, onStatus }) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setError("");
    setReply("");
    onStatus(CHAT_STATUS_MESSAGES.SENDING, UI_STATUS_LEVELS.INFO);

    try {
      const payload = await fetchJson(API_ENDPOINTS.CHAT, {
        method: "POST",
        headers: {
          [API_HEADER_NAMES.CONTENT_TYPE]: API_HEADER_DEFAULTS.CONTENT_TYPE,
        },
        body: JSON.stringify(buildChatRequest(message)),
      });
      setReply(resolveChatReply(payload));
      onStatus(CHAT_STATUS_MESSAGES.SUCCESS, UI_STATUS_LEVELS.SUCCESS);
    } catch (err) {
      const detail =
        err?.message || buildChatSendErrorMessage(API_ENDPOINTS.CHAT);
      setError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>{CHAT_UI_COPY.TITLE}</h2>
      <form onSubmit={sendMessage} className="chat-form">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={CHAT_UI_COPY.TEXTAREA_PLACEHOLDER}
          rows={5}
        />
        <button type="submit" disabled={loading}>
          {loading ? CHAT_UI_COPY.BUTTON_SENDING : CHAT_UI_COPY.BUTTON_SEND}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {reply ? (
        <div className="reply">
          <h3>{CHAT_UI_COPY.RESPONSE_TITLE}</h3>
          <p>{reply}</p>
        </div>
      ) : null}
    </section>
  );
}
