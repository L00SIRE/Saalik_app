#!/usr/bin/env bash
# Starts the whole live stack from the repo root:
#   CLIP worker        http://127.0.0.1:8099   (skipped if ml_pipeline/.venv is missing)
#   API                http://localhost:4000
#   NTB command center http://localhost:3000
#   Expo dev server    in the foreground, with mock data switched off
# Ctrl-C stops all four. On a physical phone, set EXPO_PUBLIC_API_URL to this machine's
# LAN address first, e.g. EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api npm run live:all
set -euo pipefail
cd "$(dirname "$0")/.."

# One signal to the process group takes down every server started below.
trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT

if [ -x ml_pipeline/.venv/bin/python ]; then
  ml_pipeline/.venv/bin/python -m ml_pipeline.inference_server &
else
  echo "ml_pipeline/.venv not found: skipping the CLIP worker. Photo scans will use the deterministic fallback." >&2
fi

npm --prefix backend run dev &
npm --prefix apps/ntb-command-center run dev &

EXPO_PUBLIC_USE_MOCK=false npm --prefix frontend/saalik-mobile run start
