/**
 * Design tokens de ANIMAÇÃO / MOVIMENTO — durações, curvas e keyframe-names.
 *
 * Centraliza os valores de motion para garantir consistência e preparar
 * suporte a `prefers-reduced-motion`.
 *
 * Uso:
 *   import { motion } from "../tokens/motion.js";
 *   element.style.transition = `transform ${motion.duration.fast} ${motion.easing.spring}`;
 *
 * Suporte a acessibilidade:
 *   const safeDuration = prefersReducedMotion() ? "0ms" : motion.duration.normal;
 */

/** Verifica se o usuário prefere movimento reduzido */
export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const motion = {
  /**
   * Durações de transição.
   * "instant" é para mudanças de estado discretas sem interpolação visual.
   */
  duration: {
    instant: "0ms",
    fast:    "150ms", // hover, focus rings
    normal:  "200ms", // botões, tooltips
    slow:    "350ms", // modais entrando
    spring:  "450ms", // bubble-in (com overshoot)
  },

  /**
   * Curvas de easing semânticas.
   */
  easing: {
    /** Entrada suave */
    easeIn:  "cubic-bezier(0.4, 0, 1, 1)",
    /** Saída suave */
    easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    /** Entrada e saída */
    ease:    "cubic-bezier(0.4, 0, 0.2, 1)",
    /** Efeito mola (bounce leve) — usado nos botões */
    spring:  "cubic-bezier(0.34, 1.56, 0.64, 1)",
    /** Bounce forte — usado em bubble-in */
    bounce:  "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    /** Linear — usado em animações periódicas (scan-line, gradient) */
    linear:  "linear",
  },

  /**
   * Animações CSS nomeadas (referenciam @keyframes de style.css).
   * Permite usar o token em style.animation via JS.
   */
  animation: {
    bubbleIn:    "bubble-in 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
    typingDot:   "typing-dot 1.4s infinite ease-in-out",
    pulseGlow:   "pulse-glow 3s ease-in-out infinite",
    scanLine:    "scan-line 6s linear infinite",
    float:       "float 4s ease-in-out infinite",
    borderFlow:  "border-flow 4s linear infinite",
  },

  /**
   * Delays escalonados — para animações sequenciais (typing dots).
   */
  stagger: {
    xs: "0.1s",
    sm: "0.2s",
    md: "0.3s",
    lg: "0.4s",
  },
};
