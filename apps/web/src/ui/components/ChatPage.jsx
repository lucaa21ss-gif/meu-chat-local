import { useState } from "react";

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
    onStatus("Enviando mensagem...", "info");

    try {
      const payload = await fetchJson("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          model: "meu-llama3",
          temperature: 0.7,
          userId: "user-default",
        }),
      });
      setReply(payload?.response || payload?.message || "Sem resposta no payload.");
      onStatus("Mensagem enviada com sucesso.", "success");
    } catch (err) {
      const detail = err?.message || "Falha ao enviar mensagem para /api/chat.";
      setError(detail);
      onStatus(detail, "error");
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
