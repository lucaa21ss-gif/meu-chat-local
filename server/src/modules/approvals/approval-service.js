import path from "node:path";
import { mkdir as fsMkdir, readFile as fsReadFile, writeFile as fsWriteFile } from "node:fs/promises";
import { HttpError } from "../../shared/errors/HttpError.js";
import { parsePositiveInt } from "../../shared/parsers.js";

export function createDefaultOperationalApprovalService({ approvalsPath, now = () => Date.now() }) {
  async function readApprovals() {
    try {
      const raw = await fsReadFile(approvalsPath, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.approvals) ? parsed.approvals : [];
    } catch {
      return [];
    }
  }

  async function writeApprovals(approvals) {
    await fsMkdir(path.dirname(approvalsPath), { recursive: true });
    await fsWriteFile(
      approvalsPath,
      JSON.stringify({ approvals, updatedAt: new Date(now()).toISOString() }, null, 2),
      "utf-8",
    );
  }

  function applyExpiration(approvals) {
    const nowIso = new Date(now()).toISOString();
    let changed = false;
    const next = approvals.map((item) => {
      if (
        item.status === "approved" &&
        item.windowEndAt &&
        new Date(item.windowEndAt).getTime() < now()
      ) {
        changed = true;
        return {
          ...item,
          status: "expired",
          result: "expired",
          updatedAt: nowIso,
        };
      }
      return item;
    });
    return { approvals: next, changed };
  }

  async function createRequest({ action, requestedBy, reason, windowMinutes }) {
    const approvals = await readApprovals();
    const timestamp = now();
    const createdAt = new Date(timestamp).toISOString();
    const request = {
      id: `approval-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      status: "pending",
      requestedBy,
      requestReason: reason,
      decisionReason: null,
      approvedBy: null,
      deniedBy: null,
      consumedBy: null,
      result: "pending",
      windowMinutes,
      windowStartAt: null,
      windowEndAt: null,
      createdAt,
      decidedAt: null,
      consumedAt: null,
      updatedAt: createdAt,
    };
    approvals.unshift(request);
    await writeApprovals(approvals);
    return request;
  }

  async function decide({ approvalId, decision, decidedBy, reason }) {
    const approvals = await readApprovals();
    const { approvals: withExpiration } = applyExpiration(approvals);
    const idx = withExpiration.findIndex((item) => item.id === approvalId);
    if (idx < 0) throw new HttpError(404, "Aprovacao nao encontrada");

    const current = withExpiration[idx];
    if (current.status !== "pending") {
      throw new HttpError(409, "Aprovacao nao esta pendente");
    }

    const decidedAt = new Date(now()).toISOString();
    if (decision === "approve") {
      withExpiration[idx] = {
        ...current,
        status: "approved",
        result: "approved",
        approvedBy: decidedBy,
        decisionReason: reason,
        decidedAt,
        windowStartAt: decidedAt,
        windowEndAt: new Date(now() + current.windowMinutes * 60 * 1000).toISOString(),
        updatedAt: decidedAt,
      };
    } else {
      withExpiration[idx] = {
        ...current,
        status: "denied",
        result: "denied",
        deniedBy: decidedBy,
        decisionReason: reason,
        decidedAt,
        updatedAt: decidedAt,
      };
    }

    await writeApprovals(withExpiration);
    return withExpiration[idx];
  }

  async function consume({ approvalId, action, actorUserId }) {
    const approvals = await readApprovals();
    const { approvals: withExpiration } = applyExpiration(approvals);
    const idx = withExpiration.findIndex((item) => item.id === approvalId);
    if (idx < 0) throw new HttpError(403, "Aprovacao operacional invalida");

    const approval = withExpiration[idx];
    if (approval.action !== action) {
      throw new HttpError(403, "Aprovacao nao corresponde a acao solicitada");
    }
    if (approval.status === "expired") {
      await writeApprovals(withExpiration);
      throw new HttpError(410, "Aprovacao operacional expirada");
    }
    if (approval.status === "denied") {
      throw new HttpError(403, "Aprovacao operacional negada");
    }
    if (approval.status !== "approved") {
      throw new HttpError(403, "Aprovacao operacional pendente");
    }
    if (approval.consumedAt) {
      throw new HttpError(409, "Aprovacao operacional ja consumida");
    }

    const consumedAt = new Date(now()).toISOString();
    withExpiration[idx] = {
      ...approval,
      status: "consumed",
      result: "executed",
      consumedBy: actorUserId,
      consumedAt,
      updatedAt: consumedAt,
    };
    await writeApprovals(withExpiration);
    return withExpiration[idx];
  }

  async function list({ status = "all", page = 1, limit = 20 } = {}) {
    const approvals = await readApprovals();
    const { approvals: withExpiration, changed } = applyExpiration(approvals);
    if (changed) {
      await writeApprovals(withExpiration);
    }
    const filtered =
      status === "all"
        ? withExpiration
        : withExpiration.filter((item) => item.status === status);
    const safePage = parsePositiveInt(page, 1, 1, 1000);
    const safeLimit = parsePositiveInt(limit, 20, 1, 200);
    const start = (safePage - 1) * safeLimit;
    const items = filtered.slice(start, start + safeLimit);
    return {
      items,
      page: safePage,
      limit: safeLimit,
      total: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit)),
    };
  }

  return {
    createRequest,
    decide,
    consume,
    list,
  };
}
