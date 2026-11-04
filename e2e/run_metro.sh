#!/usr/bin/env bash
# Servidor de la app apuntando al backend de pruebas según el simulador.
# El entorno se inyecta sin modificar los archivos .env del desarrollador.
set -euo pipefail
cd "$(dirname "$0")/.."
export EXPO_NO_DOTENV=1
if [[ "${E2E_PLATFORM:-android}" == "ios" ]]; then
  export EXPO_PUBLIC_API_BASE_URL=http://localhost:8001
  metro_port="${E2E_METRO_PORT:-8082}"
else
  export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8001
  metro_port="${E2E_METRO_PORT:-8081}"
fi
export EXPO_PUBLIC_OSM_TILE_URL='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
exec npx expo start --no-dev --clear --port "$metro_port"
