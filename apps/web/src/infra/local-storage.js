/**
 * LocalStorageAdapter — abstração sobre localStorage para testabilidade.
 *
 * Por que abstrair?
 *   - Em testes unitários, injetamos um mock em vez do storage real.
 *   - Permite adicionar compressão, TTL, cifra ou migração sem alterar controllers.
 *   - Centraliza serialização/desserialização JSON com fallback seguro.
 *
 * @module infra/local-storage
 */

/**
 * @typedef {Object} StorageAdapter
 * @property {(key: string) => string|null} getRaw
 * @property {(key: string, value: string) => void} setRaw
 * @property {(key: string) => void} remove
 * @property {<T>(key: string, fallback?: T) => T} getJSON
 * @property {(key: string, value: any) => void} setJSON
 * @property {() => void} clear
 */

/**
 * Cria um adapter de localStorage.
 *
 * @param {Storage} [storage=localStorage] — pode ser substituído por memoryStorage em testes
 * @returns {StorageAdapter}
 */
export function createLocalStorage(storage = globalThis.localStorage) {
  /**
   * Lê um valor bruto (string ou null).
   * @param {string} key
   * @returns {string|null}
   */
  function getRaw(key) {
    try { return storage.getItem(key); }
    catch { return null; }
  }

  /**
   * Escreve um valor bruto.
   * @param {string} key
   * @param {string} value
   */
  function setRaw(key, value) {
    try { storage.setItem(key, value); }
    catch (err) { console.warn(`[LocalStorage] Falha ao gravar "${key}":`, err); }
  }

  /**
   * Remove uma chave.
   * @param {string} key
   */
  function remove(key) {
    try { storage.removeItem(key); }
    catch { /* silent */ }
  }

  /**
   * Lê e parseia JSON com fallback seguro.
   * @template T
   * @param {string} key
   * @param {T} [fallback=null]
   * @returns {T}
   */
  function getJSON(key, fallback = null) {
    const raw = getRaw(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); }
    catch { return fallback; }
  }

  /**
   * Serializa um valor como JSON e grava.
   * @param {string} key
   * @param {any} value
   */
  function setJSON(key, value) {
    setRaw(key, JSON.stringify(value));
  }

  /**
   * Limpa todo o storage (útil em testes e reset de app).
   */
  function clear() {
    try { storage.clear(); }
    catch { /* silent */ }
  }

  return { getRaw, setRaw, remove, getJSON, setJSON, clear };
}

/**
 * In-memory storage para testes (mesma interface de Storage).
 * @returns {Storage}
 */
export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem:    (k)    => map.get(k) ?? null,
    setItem:    (k, v) => map.set(k, String(v)),
    removeItem: (k)    => map.delete(k),
    clear:      ()     => map.clear(),
    get length()       { return map.size; },
    key:        (i)    => [...map.keys()][i] ?? null,
  };
}
