import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createAppServicePaths } from "../src/http/app-services-wiring.js";

test("createAppServicePaths usa repoRoot e artifacts canônicos", () => {
  const serverDir = "/tmp/repo/apps/api";
  const deps = { dbPath: "/tmp/repo/platform/persistence/sqlite/chat.db" };

  const paths = createAppServicePaths({ deps, serverDir });

  assert.equal(paths.dbPath, deps.dbPath);
  assert.equal(paths.repoRoot, "/tmp/repo");
  assert.equal(paths.artifactsDir, path.join("/tmp/repo", "artifacts"));
});
