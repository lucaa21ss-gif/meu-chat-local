/**
 * Design tokens de TIPOGRAFIA — fontes, tamanhos, pesos e espaçamentos de letra.
 *
 * Valores em px/em para uso em componentes JS que criam DOM dinamicamente.
 * Em templates HTML, use as classes Tailwind correspondentes.
 */
export const typography = {
  /** Famílias de fonte (correspondem às declaradas em style.css @theme) */
  family: {
    sans: "'Inter', 'ui-sans-serif', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'ui-monospace', monospace",
  },

  /** Escala de tamanhos (px) */
  size: {
    "2xs": "9px",   // rótulos de seção (AI badge, section-label)
    xs:    "11px",  // metadados, timestamps
    sm:    "12px",  // labels, badges
    base:  "14px",  // texto principal das bolhas
    md:    "15px",  // texto do textarea
    lg:    "16px",  // botões, subtítulos
    xl:    "18px",  // títulos de modal
    "2xl": "20px",  // h1/h2 do header
  },

  /** Pesos */
  weight: {
    normal:    "400",
    medium:    "500",
    semibold:  "600",
    bold:      "700",
  },

  /** Altura de linha */
  lineHeight: {
    tight:   "1.4",
    normal:  "1.6",
    relaxed: "1.7",
  },

  /** Espaçamento entre letras */
  letterSpacing: {
    tight:  "-0.01em",
    normal: "0",
    wide:   "0.05em",
    wider:  "0.08em",
    widest: "0.2em",   // seção-labels AI (caps)
  },
};
