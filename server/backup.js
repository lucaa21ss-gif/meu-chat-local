import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  randomUUID,
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import * as tar from "tar";

const ENCRYPTED_BACKUP_MAGIC = "MCLBK1\n";
const ENCRYPTED_BACKUP_FORMAT = "mcl-backup-encrypted-v1";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KDF = "scrypt";
const ENCRYPTION_SCRYPT_N = 16384;
const ENCRYPTION_SCRYPT_R = 8;
const ENCRYPTION_SCRYPT_P = 1;
const ENCRYPTION_KEY_BYTES = 32;
const ENCRYPTION_SALT_BYTES = 16;
const ENCRYPTION_IV_BYTES = 12;
const BASE64_REGEX = /^[A-Za-z0-9+/=\r\n]+$/;

function sanitizeDirName(dirName) {
  const normalized = String(dirName || "")
    .trim()
    .replace(/\\/g, "/");
  if (!normalized) return null;
  if (normalized.includes("..")) return null;
  return normalized.split("/")[0] || null;
}

async function safeRm(targetPath) {
  await fsp.rm(targetPath, { recursive: true, force: true });
}

async function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  await fsp.cp(sourcePath, targetPath, { recursive: true, force: true });
  return true;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizePassphrase(passphrase) {
  return String(passphrase ?? "").trim();
}

function deriveEncryptionKey(passphrase, salt) {
  return scryptSync(passphrase, salt, ENCRYPTION_KEY_BYTES, {
    N: ENCRYPTION_SCRYPT_N,
    r: ENCRYPTION_SCRYPT_R,
    p: ENCRYPTION_SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
}

function buildEncryptedEnvelope(archiveBuffer, passphrase) {
  const salt = randomBytes(ENCRYPTION_SALT_BYTES);
  const iv = randomBytes(ENCRYPTION_IV_BYTES);
  const key = deriveEncryptionKey(passphrase, salt);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(archiveBuffer),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload = {
    format: ENCRYPTED_BACKUP_FORMAT,
    algorithm: ENCRYPTION_ALGORITHM,
    kdf: ENCRYPTION_KDF,
    kdfParams: {
      N: ENCRYPTION_SCRYPT_N,
      r: ENCRYPTION_SCRYPT_R,
      p: ENCRYPTION_SCRYPT_P,
      keyBytes: ENCRYPTION_KEY_BYTES,
    },
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  return Buffer.from(`${ENCRYPTED_BACKUP_MAGIC}${JSON.stringify(payload)}`, "utf8");
}

function parseEnvelopeBase64(fieldName, value) {
  const text = String(value || "").trim();
  if (!text || !BASE64_REGEX.test(text)) {
    throw new Error(`Envelope criptografado invalido (${fieldName})`);
  }
  return Buffer.from(text, "base64");
}

function decryptEncryptedEnvelope(archiveBuffer, passphrase) {
  const envelopeText = archiveBuffer
    .subarray(ENCRYPTED_BACKUP_MAGIC.length)
    .toString("utf8");

  let payload;
  try {
    payload = JSON.parse(envelopeText);
  } catch {
    throw new Error("Backup criptografado invalido");
  }

  if (
    !payload ||
    payload.format !== ENCRYPTED_BACKUP_FORMAT ||
    payload.algorithm !== ENCRYPTION_ALGORITHM ||
    payload.kdf !== ENCRYPTION_KDF
  ) {
    throw new Error("Backup criptografado invalido");
  }

  const salt = parseEnvelopeBase64("salt", payload.salt);
  const iv = parseEnvelopeBase64("iv", payload.iv);
  const tag = parseEnvelopeBase64("tag", payload.tag);
  const ciphertext = parseEnvelopeBase64("ciphertext", payload.ciphertext);

  if (iv.length !== ENCRYPTION_IV_BYTES || tag.length !== 16 || !ciphertext.length) {
    throw new Error("Backup criptografado invalido");
  }

  const key = deriveEncryptionKey(passphrase, salt);
  try {
    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Passphrase invalida para backup criptografado");
  }
}

function decodeBackupArchive(archiveBuffer, passphrase) {
  const hasEncryptedHeader =
    archiveBuffer.length > ENCRYPTED_BACKUP_MAGIC.length &&
    archiveBuffer
      .subarray(0, ENCRYPTED_BACKUP_MAGIC.length)
      .toString("utf8") === ENCRYPTED_BACKUP_MAGIC;

  if (!hasEncryptedHeader) {
    return {
      archiveBuffer,
      encrypted: false,
    };
  }

  const normalizedPassphrase = normalizePassphrase(passphrase);
  if (!normalizedPassphrase) {
    throw new Error(
      "Backup criptografado: informe a passphrase para restauracao",
    );
  }

  return {
    archiveBuffer: decryptEncryptedEnvelope(archiveBuffer, normalizedPassphrase),
    encrypted: true,
  };
}

export async function createBackupArchive({
  dbPath,
  includeDirs = [],
  backupRoot,
  createDbSnapshot,
  passphrase,
}) {
  const safeDbPath = String(dbPath || "").trim();
  if (!safeDbPath) throw new Error("dbPath obrigatorio para backup");
  if (typeof createDbSnapshot !== "function") {
    throw new Error("createDbSnapshot obrigatorio para backup");
  }

  const safeBackupRoot = String(backupRoot || "").trim();
  if (!safeBackupRoot) throw new Error("backupRoot obrigatorio");

  const baseDir = path.dirname(safeDbPath);
  const dirs = Array.from(
    new Set(includeDirs.map(sanitizeDirName).filter(Boolean)),
  );

  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "chat-backup-"));
  try {
    const snapshotPath = path.join(workDir, "chat.db");
    await createDbSnapshot(snapshotPath);

    const dataDir = path.join(workDir, "data");
    await fsp.mkdir(dataDir, { recursive: true });

    const copiedDirs = [];
    for (const dirName of dirs) {
      const sourcePath = path.join(baseDir, dirName);
      const targetPath = path.join(dataDir, dirName);
      const copied = await copyIfExists(sourcePath, targetPath);
      if (copied) copiedDirs.push(dirName);
    }

    const manifest = {
      version: 1,
      createdAt: new Date().toISOString(),
      includes: ["chat.db", ...copiedDirs.map((name) => `data/${name}`)],
    };

    await fsp.writeFile(
      path.join(workDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8",
    );

    await fsp.mkdir(safeBackupRoot, { recursive: true });
    const fileName = `meu-chat-local-backup-${nowStamp()}.tgz`;
    const archivePath = path.join(safeBackupRoot, fileName);

    await tar.create(
      {
        gzip: true,
        cwd: workDir,
        file: archivePath,
      },
      ["chat.db", "manifest.json", "data"],
    );

    const rawArchiveBuffer = await fsp.readFile(archivePath);
    const normalizedPassphrase = normalizePassphrase(passphrase);
    const isEncrypted = normalizedPassphrase.length > 0;
    const archiveBuffer = isEncrypted
      ? buildEncryptedEnvelope(rawArchiveBuffer, normalizedPassphrase)
      : rawArchiveBuffer;

    return {
      fileName: isEncrypted ? `${fileName}.enc` : fileName,
      archivePath,
      sizeBytes: archiveBuffer.length,
      archiveBuffer,
      includes: manifest.includes,
      isEncrypted,
      contentType: isEncrypted ? "application/octet-stream" : "application/gzip",
    };
  } finally {
    await safeRm(workDir);
  }
}

export async function restoreBackupArchive({
  archiveBuffer,
  dbPath,
  includeDirs = [],
  closeDb,
  initDb,
  passphrase,
}) {
  if (!Buffer.isBuffer(archiveBuffer) || archiveBuffer.length === 0) {
    throw new Error("Arquivo de backup invalido");
  }

  const safeDbPath = String(dbPath || "").trim();
  if (!safeDbPath) throw new Error("dbPath obrigatorio para restauracao");
  if (typeof closeDb !== "function" || typeof initDb !== "function") {
    throw new Error("closeDb e initDb obrigatorios para restauracao");
  }

  const baseDir = path.dirname(safeDbPath);
  const dirs = Array.from(
    new Set(includeDirs.map(sanitizeDirName).filter(Boolean)),
  );

  const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "chat-restore-"));
  let dbClosed = false;
  try {
    const normalizedArchive = decodeBackupArchive(archiveBuffer, passphrase);

    const archivePath = path.join(workDir, `${randomUUID()}.tgz`);
    const extractDir = path.join(workDir, "extract");
    await fsp.mkdir(extractDir, { recursive: true });

    await fsp.writeFile(archivePath, normalizedArchive.archiveBuffer);
    await tar.extract({
      cwd: extractDir,
      file: archivePath,
      gzip: true,
      strict: true,
    });

    const restoredDb = path.join(extractDir, "chat.db");
    const restoredManifest = path.join(extractDir, "manifest.json");

    if (!fs.existsSync(restoredDb) || !fs.existsSync(restoredManifest)) {
      throw new Error("Backup invalido: estrutura obrigatoria ausente");
    }

    await closeDb();
    dbClosed = true;

    await safeRm(safeDbPath);
    await safeRm(`${safeDbPath}-wal`);
    await safeRm(`${safeDbPath}-shm`);

    await fsp.mkdir(path.dirname(safeDbPath), { recursive: true });
    await fsp.copyFile(restoredDb, safeDbPath);

    for (const dirName of dirs) {
      const targetPath = path.join(baseDir, dirName);
      const sourcePath = path.join(extractDir, "data", dirName);
      await safeRm(targetPath);
      if (fs.existsSync(sourcePath)) {
        await fsp.cp(sourcePath, targetPath, { recursive: true, force: true });
      }
    }

    await initDb();
    dbClosed = false;

    return {
      restored: true,
      restoredAt: new Date().toISOString(),
      dbPath: safeDbPath,
      restoredDirs: dirs,
      encrypted: normalizedArchive.encrypted,
    };
  } catch (error) {
    if (dbClosed) {
      try {
        await initDb();
      } catch {
        // Mantem erro original de restauracao; initDb sera tentado no proximo request.
      }
    }
    throw error;
  } finally {
    await safeRm(workDir);
  }
}
