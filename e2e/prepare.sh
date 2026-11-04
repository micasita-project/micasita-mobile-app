#!/usr/bin/env bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$app_root/../micasita-ai-backend"
PYTHONPATH=. venv/bin/python "$app_root/e2e/prepare.py"
