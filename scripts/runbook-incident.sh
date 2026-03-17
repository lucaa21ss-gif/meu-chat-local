#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:3001}"
RUNBOOK_TYPE=""
MODE="execute"
ACTOR_USER_ID="${ACTOR_USER_ID:-user-default}"
OWNER=""
NEXT_UPDATE_AT=""
SUMMARY=""
BACKUP_PASSPHRASE=""

usage() {
  cat <<'EOF'
Uso:
  bash scripts/runbook-incident.sh --type <runbook-type> [opcoes]

Opcoes:
  --type <valor>            Tipo do runbook (obrigatorio): model-offline|db-degraded|disk-pressure|backup-alert
  --mode <valor>            Modo de execucao: execute|dry-run|rollback (padrao: execute)
  --server <url>            URL base da API (padrao: http://localhost:3001)
  --actor <userId>          Usuario ator enviado no header x-user-id (padrao: user-default)
  --owner <owner>           Campo owner para estado de incidente
  --summary <texto>         Resumo customizado
  --next-update-at <iso>    Timestamp ISO para proxima atualizacao
  --backup-passphrase <v>   Passphrase opcional para validacao de backups
  --help                    Exibe esta ajuda

Exemplos:
  bash scripts/runbook-incident.sh --type model-offline --mode execute
  bash scripts/runbook-incident.sh --type db-degraded --mode rollback
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --type)
      RUNBOOK_TYPE="${2:-}"
      shift 2
      ;;
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    --server)
      SERVER_URL="${2:-}"
      shift 2
      ;;
    --actor)
      ACTOR_USER_ID="${2:-}"
      shift 2
      ;;
    --owner)
      OWNER="${2:-}"
      shift 2
      ;;
    --summary)
      SUMMARY="${2:-}"
      shift 2
      ;;
    --next-update-at)
      NEXT_UPDATE_AT="${2:-}"
      shift 2
      ;;
    --backup-passphrase)
      BACKUP_PASSPHRASE="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Parametro invalido: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$RUNBOOK_TYPE" ]]; then
  echo "Erro: --type e obrigatorio" >&2
  usage
  exit 1
fi

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

PAYLOAD="{\"runbookType\":\"$(json_escape "$RUNBOOK_TYPE")\",\"mode\":\"$(json_escape "$MODE")\""

if [[ -n "$OWNER" ]]; then
  PAYLOAD+=",\"owner\":\"$(json_escape "$OWNER")\""
fi

if [[ -n "$SUMMARY" ]]; then
  PAYLOAD+=",\"summary\":\"$(json_escape "$SUMMARY")\""
fi

if [[ -n "$NEXT_UPDATE_AT" ]]; then
  PAYLOAD+=",\"nextUpdateAt\":\"$(json_escape "$NEXT_UPDATE_AT")\""
fi

if [[ -n "$BACKUP_PASSPHRASE" ]]; then
  PAYLOAD+=",\"backupPassphrase\":\"$(json_escape "$BACKUP_PASSPHRASE")\""
fi

PAYLOAD+="}"

response_file="$(mktemp)"
http_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
  -X POST "$SERVER_URL/api/incident/runbook/execute" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ACTOR_USER_ID" \
  -d "$PAYLOAD")"

if [[ "$http_code" != "200" ]]; then
  echo "Falha ao executar runbook (HTTP $http_code)" >&2
  cat "$response_file" >&2
  rm -f "$response_file"
  exit 1
fi

artifacts_dir="artifacts/runbooks"
mkdir -p "$artifacts_dir"
artifact_file="$artifacts_dir/runbook-${RUNBOOK_TYPE}-$(date -u +%Y%m%dT%H%M%SZ).json"
cp "$response_file" "$artifact_file"
rm -f "$response_file"

echo "Runbook executado com sucesso"
echo "Artefato: $artifact_file"
cat "$artifact_file"
