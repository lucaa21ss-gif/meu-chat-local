import test from "node:test";
import assert from "node:assert/strict";
import {
  buildApiRunbookSuggestions,
  buildStructuralRunbookSuggestions,
} from "./runbook-suggestions.mjs";

function getPaths(suggestions) {
  return suggestions.map((item) => item.path);
}

test("buildApiRunbookSuggestions mapeia falhas gerais de canary", () => {
  const checks = [
    {
      name: "health",
      ok: false,
      details: { alerts: [] },
    },
    {
      name: "diagnostics",
      ok: false,
      details: { error: "fetch failed" },
    },
    {
      name: "chat-flow",
      ok: false,
      details: { error: "fetch failed" },
    },
  ];

  const suggestions = buildApiRunbookSuggestions(checks);
  assert.deepEqual(getPaths(suggestions), [
    "docs/runbooks/README.md",
    "docs/runbooks/incident-model-offline.md",
    "docs/runbooks/incident-db-degraded.md",
    "docs/runbooks/backup-restore.md",
  ]);
});

test("buildApiRunbookSuggestions deduplica e usa alertas do health", () => {
  const checks = [
    {
      name: "health",
      ok: false,
      details: { alerts: ["Modelo indisponivel", "Banco degradado", "Disco baixo"] },
    },
    {
      name: "diagnostics",
      ok: true,
      details: {},
    },
    {
      name: "chat-flow",
      ok: true,
      details: {},
    },
  ];

  const suggestions = buildApiRunbookSuggestions(checks);
  assert.deepEqual(getPaths(suggestions), [
    "docs/runbooks/README.md",
    "docs/runbooks/incident-model-offline.md",
    "docs/runbooks/incident-db-degraded.md",
    "docs/runbooks/incident-disk-pressure.md",
  ]);
});

test("buildStructuralRunbookSuggestions mapeia refs estruturais com dedupe", () => {
  const checks = [
    { name: "filesystem", ref: "platform/persistence/sqlite/db.js", ok: false, details: {} },
    { name: "filesystem", ref: "modules/backup/application/backup-service.js", ok: false, details: {} },
    { name: "import", ref: "shared/config/app-constants.js", ok: false, details: {} },
  ];

  const suggestions = buildStructuralRunbookSuggestions(checks);
  assert.deepEqual(getPaths(suggestions), [
    "docs/runbooks/README.md",
    "docs/runbooks/incident-db-degraded.md",
    "docs/runbooks/backup-restore.md",
  ]);
});
