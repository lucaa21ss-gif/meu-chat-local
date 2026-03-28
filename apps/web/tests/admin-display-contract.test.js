import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_DISPLAY_DEFAULTS,
  ADMIN_DISPLAY_DEFAULT_KEYS,
  ADMIN_EMPTY_STATE_MESSAGES,
  ADMIN_EMPTY_STATE_MESSAGE_KEYS,
} from "../src/ui/state/admin-display-contract.js";

describe("ADMIN_DISPLAY_DEFAULTS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_DISPLAY_DEFAULTS));
  });

  it("deve conter defaults esperados", () => {
    assert.equal(ADMIN_DISPLAY_DEFAULTS.USER_NAME, "Sem nome");
    assert.equal(ADMIN_DISPLAY_DEFAULTS.IDENTIFIER, "n/a");
    assert.equal(ADMIN_DISPLAY_DEFAULTS.BACKUP_FILE_NAME, "backup");
  });
});

describe("ADMIN_DISPLAY_DEFAULT_KEYS", () => {
  it("deve ser array congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_DISPLAY_DEFAULT_KEYS));
  });

  it("deve refletir as chaves dos defaults em ordem alfabética", () => {
    assert.deepEqual(ADMIN_DISPLAY_DEFAULT_KEYS, Object.keys(ADMIN_DISPLAY_DEFAULTS).sort());
  });
});

describe("ADMIN_EMPTY_STATE_MESSAGES", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_EMPTY_STATE_MESSAGES));
  });

  it("deve conter mensagens esperadas", () => {
    assert.equal(ADMIN_EMPTY_STATE_MESSAGES.CHECKS, "Nenhum check disponivel.");
    assert.equal(ADMIN_EMPTY_STATE_MESSAGES.USERS, "Nenhum usuario retornado pela API.");
    assert.equal(ADMIN_EMPTY_STATE_MESSAGES.BACKUP_VALIDATION, "Nenhuma validacao de backup disponivel.");
    assert.equal(ADMIN_EMPTY_STATE_MESSAGES.BACKUP_RECENT_FILES, "Sem arquivos de backup recentes.");
  });
});

describe("ADMIN_EMPTY_STATE_MESSAGE_KEYS", () => {
  it("deve ser array congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_EMPTY_STATE_MESSAGE_KEYS));
  });

  it("deve refletir as chaves das mensagens em ordem alfabética", () => {
    assert.deepEqual(
      ADMIN_EMPTY_STATE_MESSAGE_KEYS,
      Object.keys(ADMIN_EMPTY_STATE_MESSAGES).sort(),
    );
  });
});
