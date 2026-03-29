import { useState, useRef, useEffect, useCallback } from "react";
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
  buildChatSendErrorMessage,
} from "../state/chat-ui-contract.js";

/** Sugestões de prompts para o estado vazio */
const EMPTY_STATE_PROMPTS = [
  "Como posso otimizar meu ambiente local?",
  "Explique o conceito de Domain-Driven Design.",
  "Quais são as boas práticas para streaming de tokens?",
  "Como funciona o protocolo SSE?",
];

export default function ChatPage({ onStatus }) {
  const [inputMessage, setInputMessage]   = useState("");
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [aiProvider, setAiProvider]       = useState("Identificando Motor...");
  const abortControllerRef = useRef(null);
  const messagesEndRef     = useRef(null);
  const textareaRef        = useRef(null);

  /* ── scroll automático ── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  /* ── identifica motor de IA ── */
  useEffect(() => {
    fetch(API_ENDPOINTS.HEALTH)
      .then((res) => res.json())
      .then((data) => setAiProvider(data.aiProvider || "Desconhecido"))
      .catch(() => setAiProvider("Servidor Indisponível"));
  }, []);

  /* ── auto-resize do textarea ── */
  const handleInputResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "52px";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  /* ── envio de mensagem ── */
  async function sendMessage(event) {
    if (event) event.preventDefault();
    const currentInput = inputMessage.trim();
    if (!currentInput || loading) return;

    const userMessage       = { id: Date.now(), role: "user",      content: currentInput };
    const assistantMsgId    = Date.now() + 1;
    const assistantMessage  = { id: assistantMsgId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputMessage("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "52px";
    onStatus(CHAT_STATUS_MESSAGES.SENDING, UI_STATUS_LEVELS.INFO);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch(API_ENDPOINTS.CHAT_STREAM, {
        method: "POST",
        headers: { [API_HEADER_NAMES.CONTENT_TYPE]: API_HEADER_DEFAULTS.CONTENT_TYPE },
        body:    JSON.stringify(buildChatRequest(currentInput)),
        signal:  abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errMessage = buildChatSendErrorMessage(API_ENDPOINTS.CHAT_STREAM);
        try { const j = await response.json(); errMessage = j.error || errMessage; } catch { /* vazio */ }
        throw new Error(errMessage);
      }

      onStatus(CHAT_STATUS_MESSAGES.SUCCESS, UI_STATUS_LEVELS.SUCCESS);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + chunk }
              : msg,
          ),
        );
      }
    } catch (err) {
      if (err.name === "AbortError") {
        onStatus(CHAT_STATUS_MESSAGES.ABORTED, UI_STATUS_LEVELS.INFO);
        return;
      }
      const detail = err?.message || buildChatSendErrorMessage(API_ENDPOINTS.CHAT_STREAM);
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId));
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleSuggestion = (text) => {
    setInputMessage(text);
    textareaRef.current?.focus();
  };

  return (
    <section className="ai-main glass-deep flex flex-col rounded-2xl overflow-hidden"
      style={{ flex: 1, height: "calc(100vh - 100px)", padding: "1.5rem" }}>

      {/* ── Header ── */}
      <header className="ai-header animate-fade-slide-up flex items-center justify-between pb-4 mb-4 -mx-6 px-6 rounded-t-2xl">
        <div>
          <h2 className="ai-gradient-text m-0 text-xl font-semibold tracking-wide">
            {CHAT_UI_COPY.TITLE}
          </h2>
          <p className="ai-section-label mt-1">Motor Ativo: {aiProvider}</p>
        </div>
        <div className="ai-status-online flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[--color-ai-emerald]
                          shadow-[0_0_6px_var(--color-ai-glow-e)]" />
          Online
        </div>
      </header>

      {/* ── Stream de mensagens ── */}
      <div className="ai-main-stream flex-1 overflow-y-auto flex flex-col gap-7 pr-1 scrollbar-hide">

        {/* Empty state */}
        {messages.length === 0 && !loading && (
          <div className="m-auto text-center space-y-6 animate-fade-slide-up">
            <div>
              <div className="inline-block w-14 h-14 rounded-2xl glass-surface
                              flex items-center justify-center mb-4
                              shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                <span className="text-3xl">✦</span>
              </div>
              <h3 className="ai-gradient-text text-lg font-semibold m-0">
                Como posso ajudar?
              </h3>
              <p className="ai-section-label mt-1">
                Seus sistemas locais, uma conversa de distância.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {EMPTY_STATE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSuggestion(prompt)}
                  className="glass-surface ai-focus-glow hover-glow rounded-xl px-3 py-2 text-xs
                             text-[#94a3b8] hover:text-[#e2e8f0] transition-colors duration-200 cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensagens */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={msg.role === "user" ? "ai-bubble-user" : "ai-bubble-assistant"}
              style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {msg.role === "assistant" && !msg.content && loading ? (
                /* Typing indicator */
                <div className="ai-typing">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              ) : (
                <>
                  {msg.content}
                  {/* Cursor pulsante durante streaming */}
                  {msg.role === "assistant" && loading &&
                   msg.id === messages[messages.length - 1]?.id &&
                   msg.content && (
                    <span className="ai-stream-cursor" aria-hidden="true" />
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Footer / Input ── */}
      <div className="mt-4 pt-3 ai-footer -mx-6 px-6 pb-2 rounded-b-2xl animate-fade-slide-up">
        <form
          onSubmit={sendMessage}
          className="ai-area-shell glass-surface flex flex-row gap-3 items-end"
        >
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={inputMessage}
            onChange={(e) => { setInputMessage(e.target.value); handleInputResize(); }}
            placeholder={CHAT_UI_COPY.TEXTAREA_PLACEHOLDER}
            className="ai-input ai-focus-glow flex-1 resize-none bg-transparent border-none shadow-none"
            style={{ minHeight: "52px", height: "52px" }}
            onKeyDown={handleKeyDown}
            aria-label="Mensagem para o assistente de IA"
          />

          {loading ? (
            <button
              id="chat-stop-button"
              type="button"
              className="ai-btn-primary hover-lift flex items-center justify-center gap-2"
              style={{ height: "48px", minWidth: "108px",
                       background: "linear-gradient(135deg, rgba(190,18,60,0.7), rgba(220,38,38,0.6))",
                       borderColor: "rgba(220,38,38,0.6)" }}
              onClick={() => abortControllerRef.current?.abort()}
            >
              <span>Parar</span>
              <span aria-hidden="true">⬛</span>
            </button>
          ) : (
            <button
              id="chat-send-button"
              type="submit"
              className="ai-btn-primary hover-lift flex items-center justify-center gap-2"
              style={{ height: "48px", minWidth: "108px" }}
              disabled={!inputMessage.trim()}
            >
              <span>{CHAT_UI_COPY.BUTTON_SEND}</span>
              <span aria-hidden="true">↑</span>
            </button>
          )}
        </form>

        <p className="ai-section-label text-center mt-2" style={{ fontSize: "9px" }}>
          Enter para enviar · Shift+Enter para quebrar linha · SSE via {aiProvider}
        </p>
      </div>
    </section>
  );
}
