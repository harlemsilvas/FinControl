#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API_PORT="${API_PORT:-3000}"
API_HOST="${API_HOST:-0.0.0.0}"
WEB_HOST="${WEB_HOST:-0.0.0.0}"
WEB_PORT="${WEB_PORT:-5173}"
EXTRA_WEB_PORTS="${EXTRA_WEB_PORTS:-4173 8080}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-fincontrol-postgres}"
DB_TCP_HOST="${DB_TCP_HOST:-127.0.0.1}"
DB_TCP_PORT="${DB_TCP_PORT:-5434}"
API_CONTAINER="${API_CONTAINER:-fincontrol-api-1}"
WEB_CONTAINER="${WEB_CONTAINER:-fincontrol-web-1}"
WSL_IP="${WSL_IP:-$(hostname -I | awk '{print $1}')}"
RUN_DIR="$ROOT_DIR/.local/dev"
API_LOG="$RUN_DIR/api.log"
WEB_LOG="$RUN_DIR/web.log"
API_PID_FILE="$RUN_DIR/api.pid"
WEB_PID_FILE="$RUN_DIR/web.pid"

mkdir -p "$RUN_DIR"

echo "== FinControl local dev (WSL) =="
echo "Projeto: $ROOT_DIR"
echo "API:    http://127.0.0.1:$API_PORT (bind $API_HOST)"
echo "Web:    http://127.0.0.1:$WEB_PORT (bind $WEB_HOST)"
echo "Banco:  PostgreSQL Docker publicado em $DB_TCP_HOST:$DB_TCP_PORT"
echo

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

remove_app_container() {
  local name="$1"
  if command_exists docker.exe; then
    echo "Removendo container de app, se existir: $name"
    docker.exe rm -f "$name" >/dev/null 2>&1 || true
    return 0
  fi

  if command_exists docker; then
    echo "Removendo container de app, se existir: $name"
    docker rm -f "$name" >/dev/null 2>&1 || true
  fi
}

pids_on_port() {
  local port="$1"
  ss -ltnp "sport = :$port" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' \
    | sort -u
}

kill_pid_file() {
  local file="$1"
  local label="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "Parando $label anterior (pid $pid)"
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$file"
  fi
}

kill_port() {
  local port="$1"
  local label="$2"
  local pids
  pids="$(pids_on_port "$port" || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  echo "Liberando porta $port ($label): $pids"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  local remaining
  remaining="$(pids_on_port "$port" || true)"
  if [[ -n "$remaining" ]]; then
    # shellcheck disable=SC2086
    kill -9 $remaining 2>/dev/null || true
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries="${3:-30}"
  for _ in $(seq 1 "$tries"); do
    if node - "$url" <<'NODE' >/dev/null 2>&1
const http = require('node:http');
const target = process.argv[2];
const request = http.get(target, (response) => {
  response.resume();
  process.exit(response.statusCode && response.statusCode < 500 ? 0 : 1);
});
request.setTimeout(1500, () => request.destroy(new Error('timeout')));
request.on('error', () => process.exit(1));
NODE
    then
      echo "$label OK: $url"
      return 0
    fi
    sleep 1
  done
  echo "ERRO: $label nao respondeu em $url" >&2
  return 1
}

if ! command_exists npm; then
  echo "ERRO: npm nao encontrado no WSL. Rode scripts/setup-wsl-dev.sh." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERRO: arquivo .env nao encontrado na raiz do projeto." >&2
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "ERRO: node_modules nao encontrado. Rode npm install antes." >&2
  exit 1
fi

if ! node - "$DB_TCP_HOST" "$DB_TCP_PORT" <<'NODE'
const net = require('node:net');
const [host, port] = process.argv.slice(2);
const socket = net.createConnection(Number(port), host);
socket.setTimeout(3000);
socket.on('connect', () => {
  socket.end();
  process.exit(0);
});
socket.on('timeout', () => process.exit(1));
socket.on('error', () => process.exit(1));
NODE
then
  echo "ERRO: nao foi possivel conectar no PostgreSQL em $DB_TCP_HOST:$DB_TCP_PORT." >&2
  echo "Confira se o Docker Desktop esta ativo e se $POSTGRES_CONTAINER esta publicado em 127.0.0.1:5434." >&2
  exit 1
fi

echo "PostgreSQL OK em $DB_TCP_HOST:$DB_TCP_PORT."

# O modo dev oficial usa PostgreSQL no Docker e API/Web no WSL.
# Portanto removemos apenas containers de app, nunca o banco.
remove_app_container "$API_CONTAINER"
remove_app_container "$WEB_CONTAINER"

kill_pid_file "$API_PID_FILE" "API"
kill_pid_file "$WEB_PID_FILE" "Web"
kill_port "$API_PORT" "API"
kill_port "$WEB_PORT" "Web"
for extra_port in $EXTRA_WEB_PORTS; do
  if [[ "$extra_port" != "$WEB_PORT" && "$extra_port" != "$API_PORT" ]]; then
    kill_port "$extra_port" "Web antigo"
  fi
done

: > "$API_LOG"
: > "$WEB_LOG"

echo "Subindo API WSL... log: $API_LOG"
setsid env API_HOST="$API_HOST" API_PORT="$API_PORT" npm --workspace @fincontrol/api run dev > "$API_LOG" 2>&1 < /dev/null &
echo $! > "$API_PID_FILE"

echo "Subindo Web WSL... log: $WEB_LOG"
setsid env VITE_API_URL=/ VITE_BASE_PATH=/ npm --workspace @fincontrol/web run dev -- --host "$WEB_HOST" --port "$WEB_PORT" --strictPort > "$WEB_LOG" 2>&1 < /dev/null &
echo $! > "$WEB_PID_FILE"

wait_for_url "http://127.0.0.1:$API_PORT/health/live" "API"
wait_for_url "http://127.0.0.1:$WEB_PORT" "Web"

echo
echo "Ambiente local WSL pronto."
echo "Acesse: http://127.0.0.1:$WEB_PORT"
echo "Se o Windows nao encaminhar localhost, use: http://$WSL_IP:$WEB_PORT"
echo "API:    http://127.0.0.1:$API_PORT"
echo "Logs:"
echo "  tail -f $API_LOG"
echo "  tail -f $WEB_LOG"
echo "Para parar depois:"
echo "  kill \$(cat $API_PID_FILE) \$(cat $WEB_PID_FILE)"
