/**
 * Design tokens de ESPAÇAMENTO — escalas de padding, margin, gap e border-radius.
 *
 * Segue a escala T-shirt (xs → 2xl) com valores fixos em px para uso em JS.
 * Em CSS puro, prefira as utilities do Tailwind (p-4, gap-3 etc.).
 */
export const spacing = {
  /** Escala base (rem × 4 = px) */
  xs:  "4px",
  sm:  "8px",
  md:  "12px",
  lg:  "16px",
  xl:  "20px",
  "2xl": "24px",

  /** Border-radius semântico */
  radius: {
    sm:    "6px",
    md:    "10px",
    lg:    "12px",
    xl:    "16px",
    "2xl": "20px",
    full:  "9999px",

    /** Bolhas de chat (assimétrico para dar "cauda") */
    bubble: {
      user:      "18px 18px 4px 18px",
      assistant: "4px 18px 18px 18px",
    },
  },

  /** Larguras máximas dos modais */
  modal: {
    sm:  "384px",  // max-w-sm  ≈ confirmações
    md:  "448px",  // max-w-md  ≈ duplicar aba
    lg:  "512px",  // max-w-lg  ≈ shortcuts, onboarding
  },
};
