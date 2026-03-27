/**
 * ChatBubble — componente puro de apresentação para mensagens do chat.
 *
 * Extraído de `chat-render.js` como componente independente.
 * Não possui estado próprio, não chama APIs, só cria e retorna DOM.
 *
 * Usa os design tokens para garantir consistência visual e facilitar
 * customização white-label no futuro.
 *
 * @module ui/components/chat-bubble
 */

import { color } from "../tokens/colors.js";
import { typography } from "../tokens/typography.js";
import { motion, prefersReducedMotion } from "../tokens/motion.js";
import { createTTSAdapter } from "../../infra/speech.js";

/** Singleton TTS adapter — compartilhado por todos os botões "Ouvir" */
const tts = createTTSAdapter();

/**
 * Cria o avatar circular de um participante da conversa.
 * @param {"user"|"assistant"} role
 * @returns {HTMLDivElement}
 */
export function createAvatar(role) {
  const avatar = document.createElement("div");
  const isUser = role === "user";

  Object.assign(avatar.style, {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    width:          "32px",
    height:         "32px",
    flexShrink:     "0",
    borderRadius:   "50%",
    fontSize:       typography.size.xs,
    fontWeight:     typography.weight.bold,
    fontFamily:     typography.family.mono,
    letterSpacing:  typography.letterSpacing.wide,
  });

  if (isUser) {
    avatar.style.background = "linear-gradient(135deg, #4f46e5, #0891b2)";
    avatar.style.color       = "#fff";
  } else {
    avatar.style.background = "rgba(34, 211, 238, 0.1)";
    avatar.style.color       = color.brand.cyan;
    avatar.style.border      = `1px solid ${color.border.cyanMedium}`;
  }

  avatar.textContent = isUser ? "EU" : "AI";
  avatar.setAttribute("aria-hidden", "true");
  return avatar;
}

/**
 * Cria o badge "AI" que aparece acima da bolha do assistente.
 * @returns {HTMLSpanElement}
 */
function createAssistantBadge() {
  const badge = document.createElement("span");
  badge.textContent = "AI";
  Object.assign(badge.style, {
    position:      "absolute",
    top:           "-10px",
    left:          "12px",
    fontSize:      typography.size["2xs"],
    fontWeight:    typography.weight.bold,
    letterSpacing: typography.letterSpacing.widest,
    color:         "rgba(34, 211, 238, 0.7)",
    fontFamily:    typography.family.mono,
    background:    "rgba(5, 8, 18, 0.95)",
    padding:       "2px 6px",
    borderRadius:  "4px",
    border:        `1px solid ${color.border.cyanSubtle}`,
    textTransform: "uppercase",
  });
  badge.setAttribute("aria-hidden", "true");
  return badge;
}

/**
 * Cria a galeria de imagens quando a mensagem inclui anexos.
 * @param {string[]} images — URLs base64 ou object URLs
 * @returns {HTMLDivElement}
 */
function createImageGallery(images) {
  const gallery = document.createElement("div");
  gallery.style.cssText = "margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:8px;";

  images.slice(0, 4).forEach((src, idx) => {
    const img = document.createElement("img");
    img.src   = src;
    img.alt   = `Imagem enviada ${idx + 1}`;
    img.style.cssText =
      "max-height:176px; width:100%; border-radius:8px; object-fit:cover;" +
      `border: 1px solid ${color.border.cyanSubtle};`;
    gallery.appendChild(img);
  });

  return gallery;
}

/**
 * Cria o bloco de citações RAG (fontes de documentos).
 * @param {Array<{documentName:string, chunkIndex:number, snippet:string}>} sources
 * @returns {HTMLDivElement}
 */
function createSourcesCitations(sources) {
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    marginTop:    "8px",
    padding:      "8px 10px",
    borderRadius: "8px",
    fontSize:     typography.size.xs,
    background:   "rgba(251, 191, 36, 0.06)",
    border:       "1px solid rgba(251, 191, 36, 0.2)",
    color:        color.text.amber,
  });

  const title = document.createElement("p");
  title.style.cssText = `font-weight:${typography.weight.bold}; letter-spacing:${typography.letterSpacing.wider}; text-transform:uppercase; margin-bottom:4px;`;
  title.textContent   = "Fontes";
  wrap.appendChild(title);

  sources.forEach(({ documentName, chunkIndex, snippet }) => {
    const item = document.createElement("p");
    item.style.cssText = "margin-top:4px; white-space:pre-wrap; opacity:0.85;";
    item.textContent   = `${documentName}#${chunkIndex}: ${snippet}`;
    wrap.appendChild(item);
  });

  return wrap;
}

/**
 * Cria o botão "Copiar mensagem".
 * @param {HTMLElement} contentEl — referência ao nó de texto da mensagem
 * @returns {HTMLButtonElement}
 */
function createCopyButton(contentEl) {
  const btn = document.createElement("button");
  btn.type        = "button";
  btn.textContent = "Copiar";
  btn.className   = "ai-btn-secondary";
  btn.style.cssText = "padding:3px 10px; font-size:11px;";

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(contentEl.textContent ?? "");
      btn.textContent = "✓ Copiado";
      setTimeout(() => { btn.textContent = "Copiar"; }, 1200);
    } catch {
      btn.textContent = "Erro";
      setTimeout(() => { btn.textContent = "Copiar"; }, 1200);
    }
  });

  return btn;
}

/**
 * Cria o botão "Ouvir resposta" (Text-to-Speech via adapter de infra).
 * @param {HTMLElement} contentEl
 * @returns {HTMLButtonElement}
 */
function createSpeakButton(contentEl) {
  const btn = document.createElement("button");
  btn.type        = "button";
  btn.textContent = "🔊 Ouvir";
  btn.className   = "ai-btn-secondary";
  btn.style.cssText = "padding:3px 10px; font-size:11px;";

  btn.addEventListener("click", () => {
    const text = contentEl.textContent?.trim() ?? "";
    if (!text) return;

    if (!tts.isAvailable) {
      btn.textContent = "TTS indisponível";
      setTimeout(() => { btn.textContent = "🔊 Ouvir"; }, 1500);
      return;
    }

    btn.textContent = "⏹ Pausar";
    tts.speak(text, {
      onEnd:   () => { btn.textContent = "🔊 Ouvir"; },
      onError: () => {
        btn.textContent = "Falha";
        setTimeout(() => { btn.textContent = "🔊 Ouvir"; }, 1500);
      },
    });
  });

  return btn;
}

/**
 * Cria uma bolha de chat completa (bubble + ações + imagens + fontes RAG).
 *
 * @param {"user"|"assistant"} role
 * @param {string} content — texto da mensagem
 * @param {object} [options]
 * @param {string[]}  [options.images]  — imagens em base64/URL
 * @param {Array}     [options.sources] — fontes RAG
 *
 * @returns {{ wrapper: HTMLDivElement, contentEl: HTMLDivElement }}
 *   `wrapper`   — elemento raiz (adicione ao DOM)
 *   `contentEl` — nó de texto da mensagem (para atualização durante streaming)
 */
export function createChatBubble(role, content, options = {}) {
  const isUser = role === "user";
  const animationValue = prefersReducedMotion() ? "none" : motion.animation.bubbleIn;

  /* ── Wrapper externo (alinha à direita ou esquerda) ─────── */
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `display:flex; justify-content:${isUser ? "flex-end" : "flex-start"};`;

  /* ── Row (avatar + bolha) ────────────────────────────────── */
  const row = document.createElement("div");
  row.style.cssText = `
    display: flex;
    align-items: flex-end;
    gap: 8px;
    max-width: ${isUser ? "80%" : "85%"};
  `;

  /* ── Bolha ────────────────────────────────────────────────── */
  const bubble = document.createElement("article");
  bubble.style.animation = animationValue;
  bubble.style.position  = "relative";

  if (isUser) {
    bubble.className = "ai-bubble-user";
  } else {
    bubble.className = "ai-bubble-assistant";
    bubble.appendChild(createAssistantBadge());
  }

  /* ── Conteúdo de texto ───────────────────────────────────── */
  const contentEl = document.createElement("div");
  contentEl.style.cssText = `
    white-space: pre-wrap;
    line-height: ${typography.lineHeight.relaxed};
    font-family: ${typography.family.sans};
  `;
  contentEl.textContent = content;
  bubble.appendChild(contentEl);

  /* ── Galeria de imagens (opcional) ────────────────────────── */
  if (Array.isArray(options.images) && options.images.length > 0) {
    bubble.appendChild(createImageGallery(options.images));
  }

  /* ── Fontes RAG (apenas para assistant) ───────────────────── */
  if (!isUser && Array.isArray(options.sources) && options.sources.length > 0) {
    bubble.appendChild(createSourcesCitations(options.sources));
  }

  /* ── Barra de ações ──────────────────────────────────────── */
  const actionsRow = document.createElement("div");
  actionsRow.style.cssText = "margin-top:6px; display:flex; flex-wrap:wrap; gap:6px;";

  actionsRow.appendChild(createCopyButton(contentEl));

  if (!isUser) {
    actionsRow.appendChild(createSpeakButton(contentEl));
  }

  bubble.appendChild(actionsRow);

  /* ── Montar row (avatar + bolha) ─────────────────────────── */
  if (isUser) {
    row.appendChild(bubble);
    row.appendChild(createAvatar(role));
  } else {
    row.appendChild(createAvatar(role));
    row.appendChild(bubble);
  }

  wrapper.appendChild(row);

  return { wrapper, contentEl };
}
