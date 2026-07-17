#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migrations_dir="$repo_dir/database/migrations"

mapfile -t migrations < <(find "$migrations_dir" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort)

if (( ${#migrations[@]} == 0 )); then
  echo "No migrations found" >&2
  exit 1
fi

previous=""
declare -A versions=()
for migration in "${migrations[@]}"; do
  if [[ ! "$migration" =~ ^([0-9]{12})_[a-z0-9_]+\.sql$ ]]; then
    echo "Invalid migration filename: $migration" >&2
    exit 1
  fi
  version="${BASH_REMATCH[1]}"
  if [[ -n "${versions[$version]:-}" ]]; then
    echo "Duplicate migration version: $version" >&2
    exit 1
  fi
  versions[$version]=1
  if [[ -n "$previous" && "$migration" < "$previous" ]]; then
    echo "Migrations are not ordered: $previous then $migration" >&2
    exit 1
  fi
  if ! grep -q '^BEGIN;' "$migrations_dir/$migration" || ! grep -q '^COMMIT;' "$migrations_dir/$migration"; then
    echo "Migration must have an explicit transaction: $migration" >&2
    exit 1
  fi
  previous="$migration"
done

echo "Validated ${#migrations[@]} ordered, unique and transactional migrations"
