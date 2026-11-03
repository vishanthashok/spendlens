#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ ! -d "$ROOT/apps/api/.venv" ]]; then
  python3 -m venv "$ROOT/apps/api/.venv"
  "$ROOT/apps/api/.venv/bin/pip" install -r "$ROOT/apps/api/requirements.txt"
fi

(cd "$ROOT/apps/api" && .venv/bin/pytest -q)
