import test from "node:test";
import assert from "node:assert/strict";

import { createEventBus } from "../src/infra/event-bus.js";
import {
  createLocalStorage,
  createMemoryStorage,
} from "../src/infra/local-storage.js";
import {
  isDarkForMode,
  normalizeThemeMode,
} from "../src/app/shared/theme.js";
import {
  buildHeaderPresentation,
  computePollDelayMs,
  createHealthPoller,
} from "../health-indicators.js";
import {
  buildQuickPrompt,
  formatSelectionSnippet,
  normalizeHealthSummary,
} from "../src/app/shared/context-rail.js";

test("createEventBus publica, remove e limpa handlers", () => {
  const bus = createEventBus();
  const received = [];
  const handler = (payload) => received.push(payload);

  const unsubscribe = bus.on("chat:send", handler);
  bus.emit("chat:send", { text: "ola" });
  assert.deepEqual(received, [{ text: "ola" }]);

  unsubscribe();
  bus.emit("chat:send", { text: "ignorado" });
  assert.deepEqual(received, [{ text: "ola" }]);

  bus.on("chat:new", handler);
  bus.clear("chat:new");
  assert.deepEqual(bus.debugListeners(), { "chat:send": 0 });
});

test("createEventBus once executa apenas uma vez", () => {
  const bus = createEventBus();
  let count = 0;

  bus.once("ui:theme:change", () => {
    count += 1;
  });

  bus.emit("ui:theme:change");
  bus.emit("ui:theme:change");

  assert.equal(count, 1);
});

test("createLocalStorage le e grava valores raw e JSON", () => {
  const storage = createMemoryStorage();
  const adapter = createLocalStorage(storage);

  adapter.setRaw("themeMode", "dark");
  adapter.setJSON("prefs", { model: "llama3", temp: 0.7 });

  assert.equal(adapter.getRaw("themeMode"), "dark");
  assert.deepEqual(adapter.getJSON("prefs"), { model: "llama3", temp: 0.7 });

  adapter.remove("themeMode");
  assert.equal(adapter.getRaw("themeMode"), null);

  adapter.clear();
  assert.equal(storage.length, 0);
});

test("normalizeThemeMode normaliza entradas invalidas", () => {
  assert.equal(normalizeThemeMode("light"), "light");
  assert.equal(normalizeThemeMode("dark"), "dark");
  assert.equal(normalizeThemeMode("system"), "system");
  assert.equal(normalizeThemeMode("qualquer-coisa"), "system");
});

test("isDarkForMode respeita modo explicito e preferencia do sistema", () => {
  const originalWindow = globalThis.window;

  globalThis.window = {
    matchMedia: () => ({ matches: true }),
  };

  assert.equal(isDarkForMode("dark"), true);
  assert.equal(isDarkForMode("light"), false);
  assert.equal(isDarkForMode("system"), true);

  globalThis.window = {
    matchMedia: () => ({ matches: false }),
  };

  assert.equal(isDarkForMode("system"), false);

  globalThis.window = originalWindow;
});

test("buildHeaderPresentation gera badge e tooltip coerentes", () => {
  const view = buildHeaderPresentation({
    status: "degraded",
    checks: {
      db: { status: "healthy" },
      model: { status: "degraded" },
      disk: { status: "healthy" },
    },
    latencyMs: 920,
    alerts: ["latencia elevada"],
  });

  assert.equal(view.badgeText, "Saude: Degradado");
  assert.match(view.badgeClassName, /amber/);
  assert.match(view.badgeTitle, /DB: healthy/);
  assert.match(view.badgeTitle, /latencia elevada/);
  assert.equal(view.latencyText, "Latencia: 920ms");
  assert.match(view.latencyClassName, /amber/);
});

test("computePollDelayMs aplica backoff com teto", () => {
  assert.equal(computePollDelayMs(0, 30000, 300000), 30000);
  assert.equal(computePollDelayMs(1, 30000, 300000), 60000);
  assert.equal(computePollDelayMs(2, 30000, 300000), 120000);
  assert.equal(computePollDelayMs(10, 30000, 300000), 300000);
});

test("createHealthPoller usa backoff e reseta apos sucesso", async () => {
  const queue = [];
  const cycles = [];
  const results = [false, false, true];

  const poller = createHealthPoller({
    checkHealth: async () => results.shift(),
    schedule: (fn, delay) => {
      queue.push({ fn, delay });
      return queue.length;
    },
    clear: () => {},
    baseIntervalMs: 30000,
    maxIntervalMs: 300000,
    onCycle: (info) => cycles.push(info),
  });

  poller.start();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(cycles[0].ok, false);
  assert.equal(cycles[0].delayMs, 60000);

  await queue.shift().fn();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(cycles[1].ok, false);
  assert.equal(cycles[1].delayMs, 120000);

  await queue.shift().fn();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(cycles[2].ok, true);
  assert.equal(cycles[2].delayMs, 30000);

  poller.stop();
});

test("normalizeHealthSummary converte estados para resumo de UI", () => {
  assert.equal(normalizeHealthSummary("healthy"), "ok");
  assert.equal(normalizeHealthSummary("degraded"), "alerta");
  assert.equal(normalizeHealthSummary("down"), "falha");
  assert.equal(normalizeHealthSummary("qualquer"), "desconhecido");
});

test("formatSelectionSnippet limita preview da selecao", () => {
  assert.equal(formatSelectionSnippet("abc"), "abc");

  const longText = "x".repeat(190);
  const snippet = formatSelectionSnippet(longText);
  assert.equal(snippet.length, 163);
  assert.ok(snippet.endsWith("..."));
});

test("buildQuickPrompt anexa contexto selecionado quando existir", () => {
  const basePrompt = "Explique o trecho";
  const selectedText = "const value = 42;";

  assert.equal(buildQuickPrompt(basePrompt, ""), basePrompt);

  const promptWithContext = buildQuickPrompt(basePrompt, selectedText);
  assert.match(promptWithContext, /Trecho de contexto/);
  assert.match(promptWithContext, /const value = 42;/);
});