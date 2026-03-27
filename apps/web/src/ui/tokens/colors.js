/**
 * Design tokens de COR — fonte única de verdade para todos os valores de cor.
 * Espelha as custom properties definidas em style.css.
 *
 * Uso:
 *   import { color } from "../tokens/colors.js";
 *   element.style.borderColor = color.border.cyanSubtle;
 *
 * Benefícios:
 *   - White-label / temas por cliente sem tocar no CSS
 *   - Validação de tipagem em todos os componentes JS
 *   - Base para planos Enterprise com cores customizadas
 */
export const color = {
  /** Fundos */
  bg: {
    canvas:  "#030712",   // fundo global (neural-dark)
    surface: "#0a0f1e",   // painéis/cards principais
    panel:   "#0d1224",   // painéis internos / sidebar
    input:   "rgba(15, 23, 42, 0.8)",  // campos de entrada
    overlay: "rgba(3, 7, 18, 0.8)",    // backdrop dos modais
  },

  /** Bordas */
  border: {
    cyanSubtle:   "rgba(56, 189, 248, 0.12)",
    cyanMedium:   "rgba(56, 189, 248, 0.25)",
    cyanStrong:   "rgba(34, 211, 238, 0.5)",
    violetSubtle: "rgba(167, 139, 250, 0.08)",
    neutral:      "rgba(51, 65, 85, 0.5)",
  },

  /** Texto */
  text: {
    primary:   "#e2e8f0",     // conteúdo principal
    secondary: "#cbd5e1",     // conteúdo secundário
    muted:     "#64748b",     // texto desabilitado / placeholder
    label:     "rgba(56, 189, 248, 0.5)", // rótulos de seção (AI monospace)
    cyan:      "#22d3ee",
    violet:    "#a78bfa",
    emerald:   "#34d399",
    amber:     "#fbbf24",
    rose:      "#fb7185",
  },

  /** Accent / Brand */
  brand: {
    cyan:   "#22d3ee",
    violet: "#a78bfa",
    indigo: "#4f46e5",
    ocean:  "#0891b2",
  },

  /** Glow / sombras de luz */
  glow: {
    cyan:   "rgba(34, 211, 238, 0.35)",
    violet: "rgba(167, 139, 250, 0.3)",
    indigo: "rgba(99, 102, 241, 0.4)",
  },

  /** Bolhas de chat */
  bubble: {
    user: {
      bg:     "linear-gradient(135deg, rgba(79,70,229,0.25) 0%, rgba(8,145,178,0.2) 100%)",
      border: "rgba(99, 102, 241, 0.3)",
      glow:   "rgba(99, 102, 241, 0.15)",
    },
    assistant: {
      bg:         "rgba(13, 18, 36, 0.85)",
      border:     "rgba(34, 211, 238, 0.15)",
      borderLeft: "rgba(34, 211, 238, 0.5)",
    },
  },
};
