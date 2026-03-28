import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ASYNC_STATE_SHAPE,
  ASYNC_STATE_KEYS,
  createAsyncState,
} from "../src/ui/state/async-state-contract.js";

describe("ASYNC_STATE_SHAPE", () => {
  it("deve ser um objeto congelado", () => {
    assert.ok(Object.isFrozen(ASYNC_STATE_SHAPE));
  });

  it("deve conter exatamente as chaves: data, error, loading", () => {
    assert.deepStrictEqual(Object.keys(ASYNC_STATE_SHAPE).sort(), [
      "data",
      "error",
      "loading",
    ]);
  });

  it("deve ter data: null por padrão", () => {
    assert.strictEqual(ASYNC_STATE_SHAPE.data, null);
  });

  it("deve ter error: string vazia por padrão", () => {
    assert.strictEqual(ASYNC_STATE_SHAPE.error, "");
  });

  it("deve ter loading: false por padrão", () => {
    assert.strictEqual(ASYNC_STATE_SHAPE.loading, false);
  });
});

describe("ASYNC_STATE_KEYS", () => {
  it("deve ser um array congelado", () => {
    assert.ok(Object.isFrozen(ASYNC_STATE_KEYS));
  });

  it("deve conter as mesmas chaves do shape", () => {
    assert.deepStrictEqual(
      [...ASYNC_STATE_KEYS].sort(),
      Object.keys(ASYNC_STATE_SHAPE).sort()
    );
  });

  it("deve estar em ordem alfabética", () => {
    const sorted = [...ASYNC_STATE_KEYS].sort();
    assert.deepStrictEqual([...ASYNC_STATE_KEYS], sorted);
  });
});

describe("createAsyncState()", () => {
  it("sem argumentos retorna os valores padrão do shape", () => {
    const state = createAsyncState();
    assert.strictEqual(state.data, null);
    assert.strictEqual(state.error, "");
    assert.strictEqual(state.loading, false);
  });

  it("com null retorna os valores padrão do shape", () => {
    const state = createAsyncState(null);
    assert.strictEqual(state.data, null);
    assert.strictEqual(state.error, "");
    assert.strictEqual(state.loading, false);
  });

  it("com undefined retorna os valores padrão do shape", () => {
    const state = createAsyncState(undefined);
    assert.strictEqual(state.data, null);
    assert.strictEqual(state.error, "");
    assert.strictEqual(state.loading, false);
  });

  it("permite override de data", () => {
    const state = createAsyncState({ data: [1, 2, 3] });
    assert.deepStrictEqual(state.data, [1, 2, 3]);
    assert.strictEqual(state.loading, false);
    assert.strictEqual(state.error, "");
  });

  it("permite override de loading: true", () => {
    const state = createAsyncState({ loading: true });
    assert.strictEqual(state.loading, true);
    assert.strictEqual(state.data, null);
    assert.strictEqual(state.error, "");
  });

  it("permite override de error com string", () => {
    const state = createAsyncState({ error: "Falha na requisição." });
    assert.strictEqual(state.error, "Falha na requisição.");
    assert.strictEqual(state.loading, false);
    assert.strictEqual(state.data, null);
  });

  it("converte error não-string para string", () => {
    const state = createAsyncState({ error: 42 });
    assert.strictEqual(state.error, "42");
  });

  it("trata error null como string vazia", () => {
    const state = createAsyncState({ error: null });
    assert.strictEqual(state.error, "");
  });

  it("converte loading para booleano", () => {
    const state = createAsyncState({ loading: 1 });
    assert.strictEqual(state.loading, true);
  });

  it("retorna um novo objeto a cada chamada (sem referência compartilhada)", () => {
    const a = createAsyncState();
    const b = createAsyncState();
    assert.notStrictEqual(a, b);
  });

  it("não retorna o shape original congelado", () => {
    const state = createAsyncState();
    assert.notStrictEqual(state, ASYNC_STATE_SHAPE);
    assert.ok(!Object.isFrozen(state));
  });
});
