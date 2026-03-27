/**
 * SpeechAdapter — abstração sobre Web Speech API (Recognition + Synthesis).
 *
 * Centraliza SpeechRecognition e SpeechSynthesis num adapter testável.
 * Em ambiente sem suporte (Node, testes), retorna gracefully com `isAvailable: false`.
 *
 * @module infra/speech
 */

/**
 * Cria o adapter de Text-to-Speech (leitura de texto em voz alta).
 * @returns {{ isAvailable: boolean, speak: Function, cancel: Function }}
 */
export function createTTSAdapter() {
  const isAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  /**
   * Lê um texto em voz alta usando a voz padrão pt-BR.
   *
   * @param {string} text
   * @param {{ lang?: string, rate?: number, pitch?: number, onEnd?: Function, onError?: Function }} [opts]
   * @returns {SpeechSynthesisUtterance|null}
   */
  function speak(text, opts = {}) {
    if (!isAvailable || !text?.trim()) return null;

    const synthesis = window.speechSynthesis;
    if (synthesis.speaking) synthesis.cancel();

    const utterance  = new SpeechSynthesisUtterance(text.trim());
    utterance.lang   = opts.lang  ?? "pt-BR";
    utterance.rate   = opts.rate  ?? 1;
    utterance.pitch  = opts.pitch ?? 1;

    if (opts.onEnd)   utterance.onend   = opts.onEnd;
    if (opts.onError) utterance.onerror = opts.onError;

    synthesis.speak(utterance);
    return utterance;
  }

  /** Cancela qualquer fala em andamento. */
  function cancel() {
    if (isAvailable) window.speechSynthesis.cancel();
  }

  return { isAvailable, speak, cancel };
}

/**
 * Cria o adapter de Speech-to-Text (ditado por voz).
 *
 * @param {{ lang?: string, continuous?: boolean, interimResults?: boolean }} [opts]
 * @returns {{ isAvailable: boolean, start, stop, onResult, onStateChange }}
 */
export function createSTTAdapter(opts = {}) {
  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isAvailable = !!SpeechRecognition;

  /** @type {SpeechRecognition|null} */
  let recognition = null;

  /** @type {((text: string, isFinal: boolean) => void)|null} */
  let resultCallback = null;

  /** @type {((listening: boolean) => void)|null} */
  let stateCallback = null;

  if (isAvailable) {
    recognition = new SpeechRecognition();
    recognition.lang           = opts.lang           ?? "pt-BR";
    recognition.interimResults = opts.interimResults  ?? true;
    recognition.continuous     = opts.continuous      ?? false;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      resultCallback?.(transcript.trim(), event.results[0]?.isFinal ?? false);
    };

    recognition.onstart = () => stateCallback?.(true);
    recognition.onend   = () => stateCallback?.(false);
  }

  /** Inicia a captura de voz. */
  function start() { recognition?.start(); }

  /** Para a captura de voz. */
  function stop() { recognition?.stop(); }

  /**
   * Registra callback de resultado de transcrição.
   * @param {(text: string, isFinal: boolean) => void} cb
   */
  function onResult(cb) { resultCallback = cb; }

  /**
   * Registra callback de mudança de estado (listening true/false).
   * @param {(listening: boolean) => void} cb
   */
  function onStateChange(cb) { stateCallback = cb; }

  return { isAvailable, start, stop, onResult, onStateChange };
}
