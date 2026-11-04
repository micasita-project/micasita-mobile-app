#!/usr/bin/env bash
set -euo pipefail
app_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$app_root/../micasita-ai-backend"
export PYTHONPATH="$PWD"
export SENDGRID_API_KEY=e2e-sin-correo
if [[ "${E2E_PLATFORM:-android}" == "ios" ]]; then
  export E2E_MEDIA_BASE_URL="${E2E_MEDIA_BASE_URL:-http://localhost:8001}"
fi
export OSRM_DRIVING_URL="https://routing.openstreetmap.de/routed-car/route/v1/driving"
export OSRM_CYCLING_URL="https://routing.openstreetmap.de/routed-bike/route/v1/driving"
export OSRM_WALKING_URL="https://routing.openstreetmap.de/routed-foot/route/v1/driving"
exec venv/bin/python "$app_root/e2e/support/backend.py"
