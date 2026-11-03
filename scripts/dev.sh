#!/usr/bin/env bash
# Start the SpendLens API (43124) and the Vite app (43123).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "$ROOT/apps/api/.venv" ]]; then
  python3 -m venv "$ROOT/apps/api/.venv"
  "$ROOT/apps/api/.venv/bin/pip" install -r "$ROOT/apps/api/requirements.txt"
fi

if [[ ! -d "$ROOT/apps/web/node_modules" ]]; then
  npm install --prefix "$ROOT/apps/web"
fi

(cd "$ROOT/apps/api" && .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 43124) &
API_PID=$!
(cd "$ROOT/apps/web" && npm run dev -- --host 0.0.0.0 --port 43123) &
WEB_PID=$!

trap 'kill "$API_PID" "$WEB_PID" 2>/dev/null || true' EXIT INT TERM
wait
