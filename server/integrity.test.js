import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createIntegrityRuntimeService } from "./index.js";

async function sha256(filePath) {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(filePath);
    return createHash("sha256").update(content).digest("hex");
}

test("integrity service: artefato integro retorna status ok", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "integrity-ok-"));
    await mkdir(path.join(tempDir, "scripts"), { recursive: true });

    const target = "scripts/install.sh";
    const targetPath = path.join(tempDir, target);
    await writeFile(targetPath, "echo install\n", "utf8");

    const expectedHash = await sha256(targetPath);
    const manifestPath = path.join(tempDir, ".integrity-manifest.sha256");
    await writeFile(manifestPath, `${expectedHash}  ${target}\n`, "utf8");

    const service = createIntegrityRuntimeService({
        baseDir: tempDir,
        manifestPath,
        targets: [target],
        staleAfterMs: 0,
    });

    const result = await service.runCheck();
    assert.equal(result.status, "ok");
    assert.equal(result.mismatches.length, 0);
    assert.equal(result.missingFiles.length, 0);
});

test("integrity service: artefato alterado retorna status failed", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "integrity-fail-"));
    await mkdir(path.join(tempDir, "scripts"), { recursive: true });

    const target = "scripts/install.sh";
    const targetPath = path.join(tempDir, target);
    await writeFile(targetPath, "echo install\n", "utf8");

    const expectedHash = await sha256(targetPath);
    const manifestPath = path.join(tempDir, ".integrity-manifest.sha256");
    await writeFile(manifestPath, `${expectedHash}  ${target}\n`, "utf8");

    await writeFile(targetPath, "echo install modificado\n", "utf8");

    const service = createIntegrityRuntimeService({
        baseDir: tempDir,
        manifestPath,
        targets: [target],
        staleAfterMs: 0,
    });

    const result = await service.runCheck();
    assert.equal(result.status, "failed");
    assert.equal(result.mismatches.length, 1);
    assert.equal(result.mismatches[0].file, target);
    assert.equal(result.mismatches[0].reason, "hash-mismatch");
});
