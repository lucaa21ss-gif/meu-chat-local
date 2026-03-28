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
} from "../state/admin-status-contract.js";

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
      onStatus("Status admin atualizado.", UI_STATUS_LEVELS.SUCCESS);
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
      setBackupValidation(payload?.validation || null);
    } catch (err) {
      const detail = err?.message || "Falha ao validar backups.";
      setBackupsError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setBackupsLoading(false);
    }
  }

  async function exportBackupNow() {
    onStatus("Iniciando exportacao de backup...", UI_STATUS_LEVELS.INFO);
    try {
      const response = await fetch(API_ENDPOINTS.BACKUP_EXPORT, {
        method: "GET",
        headers: buildUserIdHeader(getActorUserId()),
      });

      if (!response.ok) {
        let detail = "Falha ao exportar backup.";
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

      onStatus("Backup exportado com sucesso.", UI_STATUS_LEVELS.SUCCESS);
      await loadBackups();
    } catch (err) {
      const detail = err?.message || "Falha ao exportar backup.";
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

      setIncident(incidentPayload?.incident || null);
      setAutoHealingStatus(autoHealingPayload?.autoHealing || null);
    } catch (err) {
      const detail = err?.message || "Falha ao carregar status de incidentes.";
      setIncidentError(detail);
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setIncidentLoading(false);
    }
  }

  async function runAutoHealing() {
    setHealingLoading(true);
    onStatus("Executando auto-healing manual...", UI_STATUS_LEVELS.INFO);
    try {
      await fetchJson(API_ENDPOINTS.AUTO_HEALING_EXECUTE, {
        method: "POST",
        headers: buildJsonUserHeaders(getActorUserId()),
        body: JSON.stringify({ policy: DEFAULT_AUTO_HEALING_POLICY }),
      });
      onStatus("Auto-healing executado.", UI_STATUS_LEVELS.SUCCESS);
      await loadIncidentStatus();
    } catch (err) {
      const detail = err?.message || "Falha na execucao de auto-healing.";
      onStatus(detail, UI_STATUS_LEVELS.ERROR);
    } finally {
      setHealingLoading(false);
    }
  }

  async function executeIncidentRunbook() {
    setRunbookLoading(true);
    setRunbookResult(null);
    onStatus(`Executando runbook (${runbookMode})...`, UI_STATUS_LEVELS.INFO);

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
      onStatus("Runbook executado com sucesso.", UI_STATUS_LEVELS.SUCCESS);
      await loadIncidentStatus();
    } catch (err) {
      const detail = err?.message || "Falha ao executar runbook de incidente.";
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

  const checks = Object.entries(health?.checks || {});

  return (
    <section className="card">
      <div className="admin-header">
        <div>
          <h2>Admin - Health</h2>
          <p className="hint">Recorte inicial de paridade do painel administrativo.</p>
        </div>
        <button type="button" className="ghost" onClick={loadAdminHealth} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="admin-grid">
        <div className="admin-tile">
          <span className="tile-label">Status</span>
          <strong className="tile-value">{String(health?.status || "desconhecido")}</strong>
        </div>
        <div className="admin-tile">
          <span className="tile-label">Atualizado em</span>
          <strong className="tile-value">{new Date().toLocaleTimeString("pt-BR")}</strong>
        </div>
      </div>

      <h3 className="section-title">Checks</h3>
      {checks.length === 0 ? (
        <p className="hint">Nenhum check disponivel.</p>
      ) : (
        <div className="check-list">
          {checks.map(([name, check]) => {
            const isHealthy = check?.status === HEALTH_STATUSES.HEALTHY;
            return (
              <article key={name} className="check-item">
                <div>
                  <strong className="check-name">{name}</strong>
                  <p className="hint">{check?.message || "Status verificado."}</p>
                </div>
                <span className={`check-badge ${isHealthy ? "ok" : "fail"}`}>
                  {isHealthy ? "Saudavel" : "Falha"}
                </span>
              </article>
            );
          })}
        </div>
      )}

      <div className="admin-users-header">
        <h3 className="section-title">Usuarios</h3>
        <button type="button" className="ghost" onClick={loadUsers} disabled={usersLoading}>
          {usersLoading ? "Carregando..." : "Atualizar usuarios"}
        </button>
      </div>

      {usersError ? <p className="error">{usersError}</p> : null}

      {users.length === 0 ? (
        <p className="hint">Nenhum usuario retornado pela API.</p>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <article key={user.id || user.name} className="user-item">
              <div>
                <strong>{user.name || "Sem nome"}</strong>
                <p className="hint">ID: {user.id || "n/a"}</p>
              </div>
              <span className={`role-badge ${String(user.role || ADMIN_STATUS_VALUES.USER_ROLE_DEFAULT).toLowerCase()}`}>
                {String(user.role || ADMIN_STATUS_VALUES.USER_ROLE_DEFAULT)}
              </span>
            </article>
          ))}
        </div>
      )}

      <div className="admin-users-header">
        <h3 className="section-title">Backups</h3>
        <div className="admin-actions-inline">
          <button type="button" className="ghost" onClick={loadBackups} disabled={backupsLoading}>
            {backupsLoading ? "Validando..." : "Validar backups"}
          </button>
          <button type="button" onClick={exportBackupNow}>
            Exportar backup
          </button>
        </div>
      </div>

      {backupsError ? <p className="error">{backupsError}</p> : null}

      {!backupValidation ? (
        <p className="hint">Nenhuma validacao de backup disponivel.</p>
      ) : (
        <>
          <div className="admin-grid">
            <div className="admin-tile">
              <span className="tile-label">Status</span>
              <strong className="tile-value">{String(backupValidation.status || ADMIN_STATUS_VALUES.BACKUP_STATUS_DEFAULT)}</strong>
            </div>
            <div className="admin-tile">
              <span className="tile-label">Itens verificados</span>
              <strong className="tile-value">{Array.isArray(backupValidation.items) ? backupValidation.items.length : 0}</strong>
            </div>
          </div>

          {Array.isArray(backupValidation.items) && backupValidation.items.length > 0 ? (
            <div className="users-list">
              {backupValidation.items.map((item) => (
                <article key={item.fileName || item.id} className="user-item">
                  <div>
                    <strong>{item.fileName || "backup"}</strong>
                    <p className="hint">
                      {(Number(item.sizeBytes || 0) / 1024 / 1024).toFixed(2)} MB
                      {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <span className={`check-badge ${item.validationStatus === ADMIN_STATUS_VALUES.VALIDATION_STATUS_OK ? "ok" : "fail"}`}>
                    {item.validationStatus === ADMIN_STATUS_VALUES.VALIDATION_STATUS_OK ? BACKUP_VALIDATION_LABELS.OK : BACKUP_VALIDATION_LABELS.REVIEW}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <p className="hint">Sem arquivos de backup recentes.</p>
          )}
        </>
      )}

      <div className="admin-users-header">
        <h3 className="section-title">Incidentes</h3>
        <div className="admin-actions-inline">
          <button type="button" className="ghost" onClick={loadIncidentStatus} disabled={incidentLoading}>
            {incidentLoading ? "Verificando..." : "Verificar incidentes"}
          </button>
          <button type="button" onClick={runAutoHealing} disabled={healingLoading}>
            {healingLoading ? "Executando..." : "Auto-healing"}
          </button>
        </div>
      </div>

      {incidentError ? <p className="error">{incidentError}</p> : null}

      <div className="admin-grid">
        <div className="admin-tile">
          <span className="tile-label">Status incidente</span>
          <strong className="tile-value">{String(incident?.status || ADMIN_STATUS_VALUES.INCIDENT_STATUS_DEFAULT)}</strong>
          {incident?.summary ? <p className="hint">{incident.summary}</p> : null}
        </div>
        <div className="admin-tile">
          <span className="tile-label">Severidade</span>
          <span className={`check-badge ${String(incident?.severity || ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO) === ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO ? "ok" : "fail"}`}>
            {String(incident?.severity || ADMIN_STATUS_VALUES.INCIDENT_SEVERITY_INFO)}
          </span>
        </div>
      </div>

      <div className="admin-grid">
        <div className="admin-tile">
          <span className="tile-label">Auto-healing</span>
          <strong className="tile-value">{autoHealingStatus?.enabled ? "habilitado" : "desabilitado"}</strong>
        </div>
        <div className="admin-tile">
          <span className="tile-label">Circuit</span>
          <strong className="tile-value">{String(autoHealingStatus?.circuit?.state || ADMIN_STATUS_VALUES.CIRCUIT_STATE_DEFAULT)}</strong>
        </div>
      </div>

      <div className="admin-users-header">
        <h3 className="section-title">Runbook</h3>
      </div>

      <div className="runbook-form-grid">
        <label className="runbook-field">
          <span className="tile-label">Tipo</span>
          <select value={runbookType} onChange={(event) => setRunbookType(event.target.value)}>
            <option value={RUNBOOK_TYPES.MODEL_OFFLINE}>{RUNBOOK_TYPES.MODEL_OFFLINE}</option>
            <option value={RUNBOOK_TYPES.DB_DEGRADED}>{RUNBOOK_TYPES.DB_DEGRADED}</option>
            <option value={RUNBOOK_TYPES.DISK_PRESSURE}>{RUNBOOK_TYPES.DISK_PRESSURE}</option>
            <option value={RUNBOOK_TYPES.BACKUP_ALERT}>{RUNBOOK_TYPES.BACKUP_ALERT}</option>
          </select>
        </label>

        <label className="runbook-field">
          <span className="tile-label">Modo</span>
          <select value={runbookMode} onChange={(event) => setRunbookMode(event.target.value)}>
            <option value={RUNBOOK_MODES.DRY_RUN}>{RUNBOOK_MODES.DRY_RUN}</option>
            <option value={RUNBOOK_MODES.EXECUTE}>{RUNBOOK_MODES.EXECUTE}</option>
            <option value={RUNBOOK_MODES.ROLLBACK}>{RUNBOOK_MODES.ROLLBACK}</option>
          </select>
        </label>

        <div className="runbook-actions">
          <button type="button" onClick={executeIncidentRunbook} disabled={runbookLoading}>
            {runbookLoading ? "Executando..." : "Executar runbook"}
          </button>
        </div>
      </div>

      {runbookResult ? (
        <div className="admin-grid">
          <div className="admin-tile">
            <span className="tile-label">Runbook ID</span>
            <strong className="tile-value">{runbookResult.id || "n/a"}</strong>
          </div>
          <div className="admin-tile">
            <span className="tile-label">Passos executados</span>
            <strong className="tile-value">{Array.isArray(runbookResult.steps) ? runbookResult.steps.length : 0}</strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}
