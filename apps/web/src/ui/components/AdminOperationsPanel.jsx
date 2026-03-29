import { useEffect, useState } from "react";
import { UI_STATUS_LEVELS } from "../contracts/index.js";
import { API_ENDPOINTS } from "../state/api-endpoints-contract.js";
import {
  RUNBOOK_TYPES,
  RUNBOOK_MODES,
  DEFAULT_RUNBOOK_TYPE,
  DEFAULT_RUNBOOK_MODE,
  DEFAULT_AUTO_HEALING_POLICY,
} from "../state/runbook-contract.js";
import { buildUserIdHeader, buildJsonUserHeaders, API_HEADER_DEFAULTS } from "../state/api-headers-contract.js";
import { HEALTH_STATUSES } from "../state/health-status-contract.js";
import { POLLING_INTERVALS_MS } from "../state/polling-contract.js";
import { buildBackupValidateUrl } from "../state/backup-query-contract.js";
import {
  ADMIN_STATUS_VALUES,
  BACKUP_VALIDATION_LABELS,
  ADMIN_BADGE_VARIANTS,
  HEALTH_CHECK_LABELS,
} from "../state/admin-status-contract.js";
import {
  ADMIN_DISPLAY_DEFAULTS,
  ADMIN_EMPTY_STATE_MESSAGES,
} from "../state/admin-display-contract.js";
import {
  ADMIN_OPERATION_MESSAGES,
  ADMIN_ACTION_LABELS,
  buildRunbookExecutingMessage,
} from "../state/admin-message-contract.js";
import {
  ADMIN_SECTION_TITLES,
  ADMIN_TILE_LABELS,
  ADMIN_STATIC_COPY,
} from "../state/admin-copy-contract.js";
import {
  ADMIN_FORMATTING,
  formatAdminTime,
  formatAdminDate,
  formatAdminFileSizeMb,
  getAdminItemCount,
} from "../state/admin-format-contract.js";
import { ADMIN_PAYLOAD_KEYS } from "../state/admin-payload-contract.js";

export default function AdminOperationsPanel({ fetchJson, onStatus }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [backupValidation, setBackupValidation] = useState(null);
  const [backupsLoading, setBackupsLoading] = useState(true);
  const [backupsError, setBackupsError] = useState("");
  const [incident, setIncident] = useState(null);
  const [incidentLoading, setIncidentLoading] = useState(true);
  const [incidentError, setIncidentError] = useState("");
  const [autoHealingStatus, setAutoHealingStatus] = useState(null);
  const [healingLoading, setHealingLoading] = useState(false);
  const [runbookType, setRunbookType] = useState(DEFAULT_RUNBOOK_TYPE);
  const [runbookMode, setRunbookMode] = useState(DEFAULT_RUNBOOK_MODE);
  const [runbookLoading, setRunbookLoading] = useState(false);
  const [runbookResult, setRunbookResult] = useState(null);

  async function loadAdminHealth() {
    setLoading(true);
    setError("");
    try {
      const payload = await fetchJson(API_ENDPOINTS.HEALTH_ADMIN);
      setHealth(payload || {});
      onStatus(ADMIN_OPERATION_MESSAGES.HEALTH_UPDATED, UI_STATUS_LEVELS.SUCCESS);
    } catch (err) {
      const detail =
        err?.message || `Falha ao carregar ${API_ENDPOINTS.HEALTH_ADMIN}.`;
      setError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    setUsersError("");
    try {
      const payload = await fetchJson(API_ENDPOINTS.USERS, {
        headers: buildUserIdHeader(API_HEADER_DEFAULTS.USER_ID),
      });
      const list = Array.isArray(payload) ? payload : [];
      setUsers(list);
    } catch (err) {
      const detail =
        err?.message || `Falha ao carregar ${API_ENDPOINTS.USERS}.`;
      setUsersError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setUsersLoading(false);
    }
  }

  function getActorUserId() {
    try {
      return window.localStorage.getItem("chatUserId") || API_HEADER_DEFAULTS.USER_ID;
    } catch {
      return API_HEADER_DEFAULTS.USER_ID;
    }
  }

  async function loadBackups() {
    setBackupsLoading(true);
    setBackupsError("");
    try {
      const payload = await fetchJson(buildBackupValidateUrl(), {
        headers: buildUserIdHeader(getActorUserId()),
      });
      setBackupValidation(payload?.[ADMIN_PAYLOAD_KEYS.BACKUP_VALIDATION_ROOT] || null);
    } catch (err) {
      const detail = err?.message || ADMIN_OPERATION_MESSAGES.BACKUPS_VALIDATE_FAILED;
      setBackupsError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setBackupsLoading(false);
    }
  }

  async function exportBackupNow() {
    onStatus(ADMIN_OPERATION_MESSAGES.BACKUP_EXPORT_START, UI_STATUS_LEVELS.INFO);
    try {
      const response = await fetch(API_ENDPOINTS.BACKUP_EXPORT, {
        method: "GET",
        headers: buildUserIdHeader(getActorUserId()),
      });

      if (!response.ok) {
        let detail = ADMIN_OPERATION_MESSAGES.BACKUP_EXPORT_FAILED;
        try {
          const data = await response.json();
          detail = data?.error || detail;
        } catch {
          // fallback mantido
        }
        throw new Error(detail);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const contentDisposition = response.headers.get("content-disposition") || "";
      const fileMatch = /filename="?([^";]+)"?/i.exec(contentDisposition);
      a.href = url;
      a.download = fileMatch?.[1] || `backup-${Date.now()}.tgz`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onStatus(ADMIN_OPERATION_MESSAGES.BACKUP_EXPORT_SUCCESS, UI_STATUS_LEVELS.SUCCESS);
      await loadBackups();
    } catch (err) {
      const detail = err?.message || ADMIN_OPERATION_MESSAGES.BACKUP_EXPORT_FAILED;
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    }
  }

  async function loadIncidentStatus() {
    setIncidentLoading(true);
    setIncidentError("");
    try {
      const [incidentPayload, autoHealingPayload] = await Promise.all([
        fetchJson(API_ENDPOINTS.INCIDENT_STATUS, {
          headers: buildUserIdHeader(getActorUserId()),
        }),
        fetchJson(API_ENDPOINTS.AUTO_HEALING_STATUS, {
          headers: buildUserIdHeader(getActorUserId()),
        }),
      ]);

      setIncident(incidentPayload?.[ADMIN_PAYLOAD_KEYS.INCIDENT_ROOT] || null);
      setAutoHealingStatus(autoHealingPayload?.[ADMIN_PAYLOAD_KEYS.AUTO_HEALING_ROOT] || null);
    } catch (err) {
      const detail = err?.message || ADMIN_OPERATION_MESSAGES.INCIDENT_STATUS_FAILED;
      setIncidentError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setIncidentLoading(false);
    }
  }

  async function runAutoHealing() {
    setHealingLoading(true);
    onStatus(ADMIN_OPERATION_MESSAGES.AUTO_HEALING_START, UI_STATUS_LEVELS.INFO);
    try {
      await fetchJson(API_ENDPOINTS.AUTO_HEALING_EXECUTE, {
        method: "POST",
        headers: buildJsonUserHeaders(getActorUserId()),
        body: JSON.stringify({ policy: DEFAULT_AUTO_HEALING_POLICY }),
      });
      onStatus(ADMIN_OPERATION_MESSAGES.AUTO_HEALING_SUCCESS, UI_STATUS_LEVELS.SUCCESS);
      await loadIncidentStatus();
    } catch (err) {
      const detail = err?.message || ADMIN_OPERATION_MESSAGES.AUTO_HEALING_FAILED;
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setHealingLoading(false);
    }
  }

  async function executeIncidentRunbook() {
    setRunbookLoading(true);
    setRunbookResult(null);
    onStatus(buildRunbookExecutingMessage(runbookMode), UI_STATUS_LEVELS.INFO);

    try {
      const payload = await fetchJson(API_ENDPOINTS.INCIDENT_RUNBOOK_EXECUTE, {
        method: "POST",
        headers: buildJsonUserHeaders(getActorUserId()),
        body: JSON.stringify({
          runbookType,
          mode: runbookMode,
        }),
      });

      setRunbookResult(payload?.runbook || null);
      onStatus(ADMIN_OPERATION_MESSAGES.RUNBOOK_SUCCESS, UI_STATUS_LEVELS.SUCCESS);
      await loadIncidentStatus();
    } catch (err) {
      const detail = err?.message || ADMIN_OPERATION_MESSAGES.RUNBOOK_FAILED;
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setRunbookLoading(false);
    }
  }

  useEffect(() => {
    loadAdminHealth();
    loadUsers();
    loadBackups();
    loadIncidentStatus();
    const timer = window.setInterval(loadAdminHealth, POLLING_INTERVALS_MS.ADMIN_HEALTH);
    return () => window.clearInterval(timer);
  }, [fetchJson]);

  const checks = Object.entries(health?.[ADMIN_PAYLOAD_KEYS.HEALTH_CHECKS] || {});

  const roleLevelMap = { admin: "error", operator: "warning", viewer: "info" };

  return (
    <section className="glass-deep rounded-2xl p-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="ai-gradient-text text-xl font-semibold m-0">{ADMIN_SECTION_TITLES.ROOT}</h2>
          <p className="ai-section-label mt-1">{ADMIN_STATIC_COPY.INTRO_HINT}</p>
        </div>
        <button type="button" className="ai-btn-secondary" onClick={loadAdminHealth} disabled={loading}>
          {loading ? ADMIN_ACTION_LABELS.HEALTH_REFRESH_LOADING : ADMIN_ACTION_LABELS.HEALTH_REFRESH_IDLE}
        </button>
      </div>

      {error ? <p className="text-[#fb7185] text-sm mb-3">{error}</p> : null}

      {/* ── Tiles de saúde ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-surface rounded-xl p-3 grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.STATUS}</span>
          <strong className="text-[#e2e8f0]">{String(health?.status || ADMIN_STATIC_COPY.HEALTH_STATUS_FALLBACK)}</strong>
        </div>
        <div className="glass-surface rounded-xl p-3 grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.UPDATED_AT}</span>
          <strong className="text-[#e2e8f0]">{formatAdminTime(Date.now())}</strong>
        </div>
      </div>

      {/* ── Checks ── */}
      <h3 className="text-[#cbd5e1] text-sm font-semibold mt-5 mb-3">{ADMIN_SECTION_TITLES.CHECKS}</h3>
      {checks.length === 0 ? (
        <p className="ai-section-label">{ADMIN_EMPTY_STATE_MESSAGES.CHECKS}</p>
      ) : (
        <div className="grid gap-2">
          {checks.map(([name, check]) => {
            const isHealthy = check?.status === HEALTH_STATUSES.HEALTHY;
            return (
              <article key={name} className="glass-surface flex justify-between items-center gap-3 rounded-xl p-3">
                <div>
                  <strong className="text-[#e2e8f0] capitalize">{name}</strong>
                  <p className="ai-section-label mt-1">{check?.message || ADMIN_OPERATION_MESSAGES.HEALTH_CHECK_MESSAGE_DEFAULT}</p>
                </div>
                <span className="ai-status-badge" data-level={isHealthy ? "success" : "error"}>
                  {isHealthy ? HEALTH_CHECK_LABELS.OK : HEALTH_CHECK_LABELS.FAIL}
                </span>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Usuários ── */}
      <div className="flex items-center justify-between gap-3 mt-5 mb-3">
        <h3 className="text-[#cbd5e1] text-sm font-semibold m-0">{ADMIN_SECTION_TITLES.USERS}</h3>
        <button type="button" className="ai-btn-secondary" onClick={loadUsers} disabled={usersLoading}>
          {usersLoading ? ADMIN_ACTION_LABELS.USERS_REFRESH_LOADING : ADMIN_ACTION_LABELS.USERS_REFRESH_IDLE}
        </button>
      </div>

      {usersError ? <p className="text-[#fb7185] text-sm mb-2">{usersError}</p> : null}

      {users.length === 0 ? (
        <p className="ai-section-label">{ADMIN_EMPTY_STATE_MESSAGES.USERS}</p>
      ) : (
        <div className="grid gap-2">
          {users.map((user) => {
            const role = String(user[ADMIN_PAYLOAD_KEYS.USERS_ROLE] || ADMIN_STATUS_VALUES.USER_ROLE_DEFAULT).toLowerCase();
            return (
              <article key={user[ADMIN_PAYLOAD_KEYS.USERS_ID] || user[ADMIN_PAYLOAD_KEYS.USERS_NAME]} className="glass-surface flex justify-between items-center gap-3 rounded-xl p-3">
                <div>
                  <strong className="text-[#e2e8f0]">{user[ADMIN_PAYLOAD_KEYS.USERS_NAME] || ADMIN_DISPLAY_DEFAULTS.USER_NAME}</strong>
                  <p className="ai-section-label mt-1">ID: {user[ADMIN_PAYLOAD_KEYS.USERS_ID] || ADMIN_DISPLAY_DEFAULTS.IDENTIFIER}</p>
                </div>
                <span className="ai-status-badge capitalize" data-level={roleLevelMap[role] || "info"}>
                  {String(user[ADMIN_PAYLOAD_KEYS.USERS_ROLE] || ADMIN_STATUS_VALUES.USER_ROLE_DEFAULT)}
                </span>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Backups ── */}
      <div className="flex items-center justify-between gap-3 mt-5 mb-3">
        <h3 className="text-[#cbd5e1] text-sm font-semibold m-0">{ADMIN_SECTION_TITLES.BACKUPS}</h3>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="ai-btn-secondary" onClick={loadBackups} disabled={backupsLoading}>
            {backupsLoading ? ADMIN_ACTION_LABELS.BACKUPS_VALIDATE_LOADING : ADMIN_ACTION_LABELS.BACKUPS_VALIDATE_IDLE}
          </button>
          <button type="button" className="ai-btn-primary" onClick={exportBackupNow}>
            {ADMIN_ACTION_LABELS.BACKUP_EXPORT_IDLE}
          </button>
        </div>
      </div>

      {backupsError ? <p className="text-[#fb7185] text-sm mb-2">{backupsError}</p> : null}

      {!backupValidation ? (
        <p className="ai-section-label">{ADMIN_EMPTY_STATE_MESSAGES.BACKUP_VALIDATION}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-surface rounded-xl p-3 grid gap-1">
              <span className="ai-section-label block">{ADMIN_TILE_LABELS.STATUS}</span>
              <strong className="text-[#e2e8f0]">{String(backupValidation[ADMIN_PAYLOAD_KEYS.BACKUP_STATUS] || ADMIN_STATUS_VALUES.BACKUP_STATUS_DEFAULT)}</strong>
            </div>
            <div className="glass-surface rounded-xl p-3 grid gap-1">
              <span className="ai-section-label block">{ADMIN_TILE_LABELS.VERIFIED_ITEMS}</span>
              <strong className="text-[#e2e8f0]">{getAdminItemCount(backupValidation[ADMIN_PAYLOAD_KEYS.BACKUP_ITEMS])}</strong>
            </div>
          </div>

          {Array.isArray(backupValidation[ADMIN_PAYLOAD_KEYS.BACKUP_ITEMS]) && backupValidation[ADMIN_PAYLOAD_KEYS.BACKUP_ITEMS].length > 0 ? (
            <div className="grid gap-2 mt-2">
              {backupValidation[ADMIN_PAYLOAD_KEYS.BACKUP_ITEMS].map((item) => (
                <article key={item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_FILE_NAME] || item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_ID]} className="glass-surface flex justify-between items-center gap-3 rounded-xl p-3">
                  <div>
                    <strong className="text-[#e2e8f0]">{item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_FILE_NAME] || ADMIN_DISPLAY_DEFAULTS.BACKUP_FILE_NAME}</strong>
                    <p className="ai-section-label mt-1">
                      {formatAdminFileSizeMb(item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_SIZE_BYTES])}
                      {item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_CREATED_AT] ? `${ADMIN_FORMATTING.DATE_PREFIX_SEPARATOR}${formatAdminDate(item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_CREATED_AT])}` : ""}
                    </p>
                  </div>
                  <span className="ai-status-badge" data-level={item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_VALIDATION_STATUS] === ADMIN_STATUS_VALUES.VALIDATION_STATUS_OK ? "success" : "warning"}>
                    {item[ADMIN_PAYLOAD_KEYS.BACKUP_ITEM_VALIDATION_STATUS] === ADMIN_STATUS_VALUES.VALIDATION_STATUS_OK ? BACKUP_VALIDATION_LABELS.OK : BACKUP_VALIDATION_LABELS.REVIEW}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="ai-section-label mt-2">{ADMIN_EMPTY_STATE_MESSAGES.BACKUP_RECENT_FILES}</p>
          )}
        </>
      )}

      {/* ── Incidentes ── */}
      <div className="flex items-center justify-between gap-3 mt-5 mb-3">
        <h3 className="text-[#cbd5e1] text-sm font-semibold m-0">{ADMIN_SECTION_TITLES.INCIDENTS}</h3>
        <div className="flex gap-2 flex-wrap">
          <button type="button" className="ai-btn-secondary" onClick={loadIncidentStatus} disabled={incidentLoading}>
            {incidentLoading ? ADMIN_ACTION_LABELS.INCIDENTS_REFRESH_LOADING : ADMIN_ACTION_LABELS.INCIDENTS_REFRESH_IDLE}
          </button>
          <button type="button" className="ai-btn-primary" onClick={runAutoHealing} disabled={healingLoading}>
            {healingLoading ? ADMIN_ACTION_LABELS.ACTION_LOADING : ADMIN_ACTION_LABELS.AUTO_HEALING_IDLE}
          </button>
        </div>
      </div>

      {incidentError ? <p className="text-[#fb7185] text-sm mb-2">{incidentError}</p> : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-surface rounded-xl p-3 grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.INCIDENT_STATUS}</span>
          <strong className="text-[#e2e8f0]">{String(incident?.[ADMIN_PAYLOAD_KEYS.INCIDENT_STATUS] || ADMIN_STATUS_VALUES.INCIDENT_STATUS_DEFAULT)}</strong>
          {incident?.[ADMIN_PAYLOAD_KEYS.INCIDENT_SUMMARY] ? <p className="ai-section-label mt-1">{incident[ADMIN_PAYLOAD_KEYS.INCIDENT_SUMMARY]}</p> : null}
        </div>
        <div className="glass-surface rounded-xl p-3 grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.SEVERITY}</span>
          <span className="ai-status-badge mt-1" data-level={String(incident?.[ADMIN_PAYLOAD_KEYS.INCIDENT_SEVERITY] || ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO) === ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO ? "info" : "error"}>
            {String(incident?.[ADMIN_PAYLOAD_KEYS.INCIDENT_SEVERITY] || ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="glass-surface rounded-xl p-3 grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.AUTO_HEALING}</span>
          <strong className="text-[#e2e8f0]">{autoHealingStatus?.[ADMIN_PAYLOAD_KEYS.AUTO_HEALING_ENABLED] ? ADMIN_STATIC_COPY.AUTO_HEALING_ENABLED : ADMIN_STATIC_COPY.AUTO_HEALING_DISABLED}</strong>
        </div>
        <div className="glass-surface rounded-xl p-3 grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.CIRCUIT}</span>
          <strong className="text-[#e2e8f0]">{String(autoHealingStatus?.[ADMIN_PAYLOAD_KEYS.AUTO_HEALING_CIRCUIT]?.[ADMIN_PAYLOAD_KEYS.AUTO_HEALING_CIRCUIT_STATE] || ADMIN_STATUS_VALUES.CIRCUIT_STATE_DEFAULT)}</strong>
        </div>
      </div>

      {/* ── Runbook ── */}
      <div className="flex items-center justify-between gap-3 mt-5 mb-3">
        <h3 className="text-[#cbd5e1] text-sm font-semibold m-0">{ADMIN_SECTION_TITLES.RUNBOOK}</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.TYPE}</span>
          <select className="ai-control-input" value={runbookType} onChange={(event) => setRunbookType(event.target.value)}>
            <option value={RUNBOOK_TYPES.MODEL_OFFLINE}>{RUNBOOK_TYPES.MODEL_OFFLINE}</option>
            <option value={RUNBOOK_TYPES.DB_DEGRADED}>{RUNBOOK_TYPES.DB_DEGRADED}</option>
            <option value={RUNBOOK_TYPES.DISK_PRESSURE}>{RUNBOOK_TYPES.DISK_PRESSURE}</option>
            <option value={RUNBOOK_TYPES.BACKUP_ALERT}>{RUNBOOK_TYPES.BACKUP_ALERT}</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="ai-section-label block">{ADMIN_TILE_LABELS.MODE}</span>
          <select className="ai-control-input" value={runbookMode} onChange={(event) => setRunbookMode(event.target.value)}>
            <option value={RUNBOOK_MODES.DRY_RUN}>{RUNBOOK_MODES.DRY_RUN}</option>
            <option value={RUNBOOK_MODES.EXECUTE}>{RUNBOOK_MODES.EXECUTE}</option>
            <option value={RUNBOOK_MODES.ROLLBACK}>{RUNBOOK_MODES.ROLLBACK}</option>
          </select>
        </label>

        <div className="flex items-end">
          <button type="button" className="ai-btn-primary w-full" onClick={executeIncidentRunbook} disabled={runbookLoading}>
            {runbookLoading ? ADMIN_ACTION_LABELS.ACTION_LOADING : ADMIN_ACTION_LABELS.RUNBOOK_EXECUTE_IDLE}
          </button>
        </div>
      </div>

      {runbookResult ? (
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="glass-surface rounded-xl p-3 grid gap-1">
            <span className="ai-section-label block">{ADMIN_TILE_LABELS.RUNBOOK_ID}</span>
            <strong className="text-[#e2e8f0]">{runbookResult[ADMIN_PAYLOAD_KEYS.RUNBOOK_ID] || ADMIN_DISPLAY_DEFAULTS.IDENTIFIER}</strong>
          </div>
          <div className="glass-surface rounded-xl p-3 grid gap-1">
            <span className="ai-section-label block">{ADMIN_TILE_LABELS.RUNBOOK_STEPS}</span>
            <strong className="text-[#e2e8f0]">{getAdminItemCount(runbookResult[ADMIN_PAYLOAD_KEYS.RUNBOOK_STEPS])}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
