#!/usr/bin/env bash
set -uo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
log_dir="$repo_dir/logs/alteracoes"
timestamp="$(date +%Y%m%d_%H%M%S)"
log_file="$log_dir/checar_alteracao_$timestamp.log"

mkdir -p "$log_dir"

status=0

run_step() {
  local title="$1"
  shift

  {
    echo
    echo "================================================================"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $title"
    echo "COMMAND: $*"
    echo "================================================================"
  } >> "$log_file"

  if "$@" >> "$log_file" 2>&1; then
    echo "OK   - $title" >> "$log_file"
  else
    local exit_code=$?
    echo "FAIL - $title (exit code $exit_code)" >> "$log_file"
    status=$exit_code
  fi
}

{
  echo "FinControl - Checagem de alteracao"
  echo "Inicio: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Repositorio: $repo_dir"
  echo "Branch: $(git -C "$repo_dir" branch --show-current 2>/dev/null || echo 'desconhecida')"
  echo "Commit atual: $(git -C "$repo_dir" rev-parse --short HEAD 2>/dev/null || echo 'desconhecido')"
} > "$log_file"

run_step "Checar whitespace do diff" git -C "$repo_dir" diff --check
run_step "Validar migrations" bash "$repo_dir/scripts/validate-migrations.sh"
run_step "Typecheck" npm --prefix "$repo_dir" run typecheck
run_step "Lint" npm --prefix "$repo_dir" run lint
run_step "Testes" npm --prefix "$repo_dir" test
run_step "Build" npm --prefix "$repo_dir" run build

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
