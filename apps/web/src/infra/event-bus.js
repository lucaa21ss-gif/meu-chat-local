/**
 * EventBus — barramento de eventos leve para desacoplar módulos.
 *
 * Localização: src/infra/event-bus.js
 *
 * Por que em infra?
 *   O EventBus é uma peça de infraestrutura transversal. No futuro pode ser
 *   substituído por uma versão assíncrona (BroadcastChannel, SharedWorker,
 *   persistente via IndexedDB) sem tocar nas regras de negócio.
 *
 * Uso:
 *   import { createEventBus } from "../infra/event-bus.js";
 *   const bus = createEventBus();
 *   bus.on("chat:send", ({ message }) => { ... });
 *   bus.emit("chat:send", { message: "Olá!" });
 *   bus.off("chat:send", handler);
 *
 * Convenção de nomes de eventos: "domínio:ação"
 *   chat:send        chat:new        chat:switch
 *   chat:rename      chat:delete     chat:favorite     chat:archive
 *   chat:export      backup:start    backup:restore
 *   ui:theme:change  ui:status:show  ui:status:hide
 *   health:refresh   storage:cleanup admin:telemetry
 *
 * @returns {{ on, off, emit, once, clear }}
 */
export function createEventBus() {
  /** @type {Map<string, Set<Function>>} */
  const registry = new Map();

  /**
   * Subscrevido a um evento.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} função de unsubscribe
   */
  function on(event, handler) {
    if (!registry.has(event)) registry.set(event, new Set());
    registry.get(event).add(handler);
    return () => off(event, handler);
  }

  /**
   * Remove um handler de um evento.
   * @param {string} event
   * @param {Function} handler
   */
  function off(event, handler) {
    registry.get(event)?.delete(handler);
  }

  /**
   * Emite um evento, notificando todos os subscribers.
   * @param {string} event
   * @param {unknown} [payload]
   */
  function emit(event, payload) {
    registry.get(event)?.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Erro no handler de "${event}":`, err);
      }
    });
  }

  /**
   * Registra um handler que é chamado uma única vez.
   * @param {string} event
   * @param {Function} handler
   * @returns {() => void} função de unsubscribe
   */
  function once(event, handler) {
    const wrapper = (payload) => {
      handler(payload);
      off(event, wrapper);
    };
    return on(event, wrapper);
  }

  /**
   * Remove todos os handlers de todos os eventos (útil em testes).
   * @param {string} [event] se omitido, limpa tudo
   */
  function clear(event) {
    if (event) registry.delete(event);
    else registry.clear();
  }

  /** Lista todos os eventos registrados (útil para debug). */
  function debugListeners() {
    const result = {};
    registry.forEach((handlers, key) => {
      result[key] = handlers.size;
    });
    return result;
  }

  return { on, off, emit, once, clear, debugListeners };
}
