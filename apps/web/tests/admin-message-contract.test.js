import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_OPERATION_MESSAGES,
  ADMIN_OPERATION_MESSAGE_KEYS,
  ADMIN_ACTION_LABELS,
  ADMIN_ACTION_LABEL_KEYS,
  buildRunbookExecutingMessage,
} from "../src/ui/state/admin-message-contract.js";

describe("ADMIN_OPERATION_MESSAGES", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_OPERATION_MESSAGES));
  });

  it("deve expor mensagens operacionais esperadas", () => {
    assert.equal(ADMIN_OPERATION_MESSAGES.HEALTH_UPDATED, "Status admin atualizado.");
    assert.equal(ADMIN_OPERATION_MESSAGES.BACKUP_EXPORT_FAILED, "Falha ao exportar backup.");
    assert.equal(ADMIN_OPERATION_MESSAGES.RUNBOOK_SUCCESS, "Runbook executado com sucesso.");
  });
});

describe("ADMIN_OPERATION_MESSAGE_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(
      ADMIN_OPERATION_MESSAGE_KEYS,
      Object.keys(ADMIN_OPERATION_MESSAGES).sort(),
    );
  });
});

describe("ADMIN_ACTION_LABELS", () => {
  it("deve ser objeto congelado", () => {
    assert.ok(Object.isFrozen(ADMIN_ACTION_LABELS));
  });

  it("deve expor labels de ação esperadas", () => {
    assert.equal(ADMIN_ACTION_LABELS.HEALTH_REFRESH_IDLE, "Atualizar");
    assert.equal(ADMIN_ACTION_LABELS.BACKUPS_VALIDATE_LOADING, "Validando...");
    assert.equal(ADMIN_ACTION_LABELS.RUNBOOK_EXECUTE_IDLE, "Executar runbook");
  });
});

describe("ADMIN_ACTION_LABEL_KEYS", () => {
  it("deve refletir as chaves em ordem alfabética", () => {
    assert.deepEqual(
      ADMIN_ACTION_LABEL_KEYS,
      Object.keys(ADMIN_ACTION_LABELS).sort(),
    );
  });
});

describe("buildRunbookExecutingMessage()", () => {
  it("deve interpolar o modo informado", () => {
    assert.equal(buildRunbookExecutingMessage("dry-run"), "Executando runbook (dry-run)...");
  });
});