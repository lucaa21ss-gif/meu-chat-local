import { useState } from "react";
import { UI_STATUS_LEVELS } from "../contracts/index.js";
import { buildChatRequest } from "../state/chat-request-contract.js";
import { API_ENDPOINTS } from "../state/api-endpoints-contract.js";

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
    onStatus("Enviando mensagem...", UI_STATUS_LEVELS.INFO);

    try {
      const payload = await fetchJson(API_ENDPOINTS.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildChatRequest(message)),
      });
      setReply(payload?.response || payload?.message || "Sem resposta no payload.");
      onStatus("Mensagem enviada com sucesso.", UI_STATUS_LEVELS.SUCCESS);
    } catch (err) {
      const detail = err?.message || `Falha ao enviar mensagem para ${API_ENDPOINTS.CHAT}.`;
      setError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Chat</h2>
      <form onSubmit={sendMessage} className="chat-form">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Digite sua mensagem..."
          rows={5}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      {reply ? (
        <div className="reply">
          <h3>Resposta</h3>
          <p>{reply}</p>
        </div>
      ) : null}
    </section>
  );
}
