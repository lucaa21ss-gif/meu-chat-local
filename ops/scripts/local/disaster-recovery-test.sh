#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:4000}"
ACTOR_USER_ID="${ACTOR_USER_ID:-user-default}"
SCENARIO_ID="dr-$(date -u +%Y%m%dT%H%M%SZ)"
PASSPHRASE=""

usage() {
  cat <<'EOF'
Uso:
  bash ops/scripts/local/disaster-recovery-test.sh [opcoes]

Opcoes:
  --server <url>         URL base da API (padrao: http://localhost:4000)
  --actor <userId>       Usuario admin para execucao (padrao: user-default)
  --scenario <id>        Identificador do cenario (a-z0-9:_-, 3-80)
  --passphrase <valor>   Passphrase opcional para backup criptografado
  --help                 Exibe esta ajuda
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server)
      SERVER_URL="${2:-}"
      shift 2
      ;;
    --actor)
      ACTOR_USER_ID="${2:-}"
      shift 2
      ;;
    --scenario)
      SCENARIO_ID="${2:-}"
      shift 2
      ;;
    --passphrase)
      PASSPHRASE="${2:-}"
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

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

payload="{\"scenarioId\":\"$(json_escape "$SCENARIO_ID")\""
if [[ -n "$PASSPHRASE" ]]; then
  payload+=",\"passphrase\":\"$(json_escape "$PASSPHRASE")\""
fi
payload+="}"

response_file="$(mktemp)"
http_code="$(curl -sS -o "$response_file" -w "%{http_code}" \
  -X POST "$SERVER_URL/api/disaster-recovery/test" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $ACTOR_USER_ID" \
  -d "$payload")"

if [[ "$http_code" != "200" ]]; then
  echo "Falha no teste DR (HTTP $http_code)" >&2
  cat "$response_file" >&2
  rm -f "$response_file"
  exit 1
fi

cat "$response_file"

ok="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(!!p.ok));" "$response_file")"
report_status="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String((p.report&&p.report.status)||''));" "$response_file")"
rto_ms="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));const v=p.report&&p.report.indicators?p.report.indicators.rtoMs:null;process.stdout.write(String(v===null?'n/a':v));" "$response_file")"
report_path="$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(p.reportPath||''));" "$response_file")"

rm -f "$response_file"

echo
echo "Resumo DR:"
echo "- status: $report_status"
echo "- rtoMs: $rto_ms"
echo "- reportPath: $report_path"

if [[ "$ok" != "true" ]]; then
  echo "Cenario DR bloqueado" >&2
  exit 1
fi

echo "Cenario DR aprovado"
