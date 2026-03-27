export const USER_ROLES = ["admin", "operator", "viewer"];

export const ROLE_LEVEL = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

export const INCIDENT_STATUSES = [
  "normal",
  "investigating",
  "mitigating",
  "monitoring",
  "resolved",
];

export const INCIDENT_SEVERITIES = ["info", "low", "medium", "high", "critical"];

export const INCIDENT_STATUS_TRANSITIONS = {
  normal: new Set(["investigating"]),
  investigating: new Set(["mitigating", "monitoring", "resolved"]),
  mitigating: new Set(["investigating", "monitoring", "resolved"]),
  monitoring: new Set(["normal", "investigating", "resolved"]),
  resolved: new Set(["normal", "monitoring", "investigating"]),
};

export const INCIDENT_RUNBOOK_TYPES = {
  "model-offline": {
    severity: "high",
    recommendationType: "health",
    triageSummary: "Modelo principal indisponivel; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para modelo indisponivel (fallback/retry)",
  },
  "db-degraded": {
    severity: "critical",
    recommendationType: "health",
    triageSummary: "Banco degradado; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para degradacao de banco",
  },
  "disk-pressure": {
    severity: "high",
    recommendationType: "security",
    triageSummary: "Pressao de disco detectada; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para pressao de disco",
  },
  "backup-alert": {
    severity: "medium",
    recommendationType: "backup",
    triageSummary: "Alerta de backup detectado; triagem iniciada via runbook",
    mitigationSummary: "Mitigacao aplicada para alerta de backup",
  },
};

export const AUTO_HEALING_POLICIES = ["model-offline", "db-lock"];

export const OPERATIONAL_APPROVAL_ACTIONS = [
  "backup.restore",
  "disaster-recovery.test",
  "incident.runbook.execute",
  "storage.cleanup.execute",
];

export const CONFIG_KEYS = {
  CHAT_SYSTEM_PROMPT: "chat.systemPrompt",
  USER_DEFAULT_SYSTEM_PROMPT: "user.defaultSystemPrompt",
  USER_THEME: "user.theme",
  USER_STORAGE_LIMIT_MB: "user.storageLimitMb",
  APP_TELEMETRY_ENABLED: "app.telemetryEnabled",
};

export const HEALTH_STATUS = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  UNHEALTHY: "unhealthy",
};