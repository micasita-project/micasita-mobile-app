#!/usr/bin/env bash
# Ejecuta un flujo de Maestro y conserva el informe y los artefactos.
# Uso: e2e/run_flow.sh CP038 [CLAVE=valor ...]
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.maestro/maestro/bin:$PATH"
cp_id="${1:?Uso: e2e/run_flow.sh CP038 [CLAVE=valor ...]}"; shift
flow="e2e/flows/${cp_id}.yaml"
[[ -f "$flow" ]] || { echo "No existe el flujo: $flow" >&2; exit 1; }
# Bash 3.2 (macOS) falla al expandir arrays vacíos con nounset.
env_args=(--format junit)
for kv in "$@"; do env_args+=(-e "$kv"); done
result_dir="${E2E_RESULTS_DIR:-e2e/results}/$cp_id"
mkdir -p "$result_dir"
maestro --udid "${E2E_DEVICE:-emulator-5554}" test "${env_args[@]}" \
  --output "$result_dir/report.xml" --test-output-dir "$result_dir" "$flow" \
  2>&1 | tee "$result_dir/console.log"
