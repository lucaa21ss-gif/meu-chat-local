import { HttpError } from "../../shared/errors/HttpError.js";
import { INCIDENT_STATUS_TRANSITIONS } from "../../shared/app-constants.js";
import {
  parseIncidentNextUpdateAt,
  parseIncidentOwner,
  parseIncidentRecommendationType,
  parseIncidentSeverity,
  parseIncidentStatus,
  parseIncidentSummary,
} from "../../shared/parsers.js";

export function createDefaultIncidentService(config = {}) {
  const now = new Date().toISOString();
  const initial = {
    version: 1,
    status: parseIncidentStatus(config.status, "normal"),
    severity: parseIncidentSeverity(config.severity, "info"),
    summary:
      parseIncidentSummary(config.summary) ||
      "Operacao normal - nenhum incidente ativo",
    owner: parseIncidentOwner(config.owner),
    recommendationType: parseIncidentRecommendationType(
      config.recommendationType,
    ),
    startedAt: now,
    nextUpdateAt: parseIncidentNextUpdateAt(config.nextUpdateAt),
    updatedAt: now,
    updatedBy: null,
    history: [],
  };

  let state = initial;

  return {
    getStatus() {
      return {
        ...state,
        history: [...state.history],
      };
    },
    updateStatus(patch = {}, actorUserId = null) {
      const nextStatus = patch.status || state.status;
      const hasStatusChange = patch.status && patch.status !== state.status;

      if (hasStatusChange) {
        const allowed = INCIDENT_STATUS_TRANSITIONS[state.status] || new Set();
        if (!allowed.has(nextStatus)) {
          throw new HttpError(
            400,
            `Transicao de incidente invalida: ${state.status} -> ${nextStatus}`,
          );
        }
      }

      const timestamp = new Date().toISOString();
      const updated = {
        ...state,
        ...patch,
        status: nextStatus,
        severity: patch.severity || state.severity,
        summary: patch.summary === null ? state.summary : patch.summary || state.summary,
        owner: patch.owner === undefined ? state.owner : patch.owner,
        recommendationType:
          patch.recommendationType === undefined
            ? state.recommendationType
            : patch.recommendationType,
        nextUpdateAt:
          patch.nextUpdateAt === undefined ? state.nextUpdateAt : patch.nextUpdateAt,
        updatedAt: timestamp,
        updatedBy: actorUserId,
      };

      const transitionEntry = {
        at: timestamp,
        fromStatus: state.status,
        toStatus: updated.status,
        severity: updated.severity,
        by: actorUserId,
      };

      updated.history = [transitionEntry, ...(state.history || [])].slice(0, 20);
      state = updated;
      return this.getStatus();
    },
  };
}