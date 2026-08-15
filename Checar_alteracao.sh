#!/usr/bin/env bash
set -uo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log_dir="$repo_dir/logs/alteracoes"
timestamp="$(date +%Y%m%d_%H%M%S)"
log_file="$log_dir/checar_alteracao_$timestamp.log"
step_timeout="${CHECK_STEP_TIMEOUT:-300s}"

mkdir -p "$log_dir"

status=0

duration() {
  local elapsed="$1"
  printf '%02dm%02ds' "$((elapsed / 60))" "$((elapsed % 60))"
}

run_step() {
  local title="$1"
  shift
  local started_at
  local finished_at
  local elapsed
  started_at="$(date +%s)"

  echo "RUN  - $title"

  {
    echo
    echo "================================================================"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $title"
    echo "COMMAND: $*"
    echo "================================================================"
  } >> "$log_file"

  if "$@" >> "$log_file" 2>&1; then
    finished_at="$(date +%s)"
    elapsed="$((finished_at - started_at))"
    echo "OK   - $title ($(duration "$elapsed"))"
    echo "OK   - $title ($(duration "$elapsed"))" >> "$log_file"
  else
    local exit_code=$?
    finished_at="$(date +%s)"
    elapsed="$((finished_at - started_at))"
    echo "FAIL - $title ($(duration "$elapsed"), exit code $exit_code)"
    echo "FAIL - $title ($(duration "$elapsed"), exit code $exit_code)" >> "$log_file"
    status=$exit_code
  fi
}

run_timed_step() {
  local title="$1"
  shift
  run_step "$title" timeout --foreground "$step_timeout" "$@"
}

{
  echo "FinControl - Checagem de alteracao"
  echo "Inicio: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Repositorio: $repo_dir"
  echo "Branch: $(git -C "$repo_dir" branch --show-current 2>/dev/null || echo 'desconhecida')"
  echo "Commit atual: $(git -C "$repo_dir" rev-parse --short HEAD 2>/dev/null || echo 'desconhecido')"
  echo "Timeout por etapa: $step_timeout"
} > "$log_file"

trap 'echo; echo "INTERRUPTED - checagem interrompida. LOG: '"$log_file"'"; echo "INTERRUPTED - checagem interrompida em $(date "+%Y-%m-%d %H:%M:%S")" >> "'"$log_file"'"; exit 130' INT TERM

echo "FinControl - Checagem de alteracao"
echo "LOG: $log_file"

run_step "Checar whitespace do diff" git -C "$repo_dir" diff --check
run_step "Validar migrations" bash "$repo_dir/scripts/validate-migrations.sh"
run_timed_step "Typecheck API" npm --prefix "$repo_dir" run typecheck --workspace @fincontrol/api
run_timed_step "Typecheck Web" npm --prefix "$repo_dir" run typecheck --workspace @fincontrol/web
run_timed_step "Lint API" npm --prefix "$repo_dir" run lint --workspace @fincontrol/api
run_timed_step "Lint Web" npm --prefix "$repo_dir" run lint --workspace @fincontrol/web
run_timed_step "Testes API" npm --prefix "$repo_dir" test --workspace @fincontrol/api
run_timed_step "Testes Web - Payables" npm --prefix "$repo_dir" test --workspace @fincontrol/web -- src/payables
run_timed_step "Testes Web - Administracao" npm --prefix "$repo_dir" test --workspace @fincontrol/web -- src/administration
run_timed_step "Testes Web - Cadastros" npm --prefix "$repo_dir" test --workspace @fincontrol/web -- src/master-data
run_timed_step "Testes Web - Inteligencia" npm --prefix "$repo_dir" test --workspace @fincontrol/web -- src/intelligence
run_timed_step "Testes Web - Base" npm --prefix "$repo_dir" test --workspace @fincontrol/web -- src/app src/pages
run_timed_step "Build API" npm --prefix "$repo_dir" run build --workspace @fincontrol/api
run_timed_step "Build Web" npm --prefix "$repo_dir" run build --workspace @fincontrol/web

{
  echo
  echo "Fim: $(date '+%Y-%m-%d %H:%M:%S')"
  if [[ "$status" -eq 0 ]]; then
    echo "STATUS: OK"
  else
    echo "STATUS: FAIL"
  fi
} >> "$log_file"

if [[ "$status" -eq 0 ]]; then
  echo "STATUS: OK"
  echo "LOG: $log_file"
else
  echo "STATUS: FAIL"
  echo "LOG: $log_file"
fi

exit "$status"
