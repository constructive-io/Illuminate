#!/usr/bin/env bash
# Local prod-parity launcher — runs the full stack (server + receiver) the way
# prod does, but entirely on localhost and without PM2.
#
# The server now serves the UI + API + WebSocket on one port, so there is no
# separate UI process: build the UI once (Vite → dist/), then boot the server
# (which serves it) and the receiver in one terminal, tearing them down
# together on Ctrl-C.
#
#   deploy/local.sh                build the UI, then start server + receiver
#   deploy/local.sh --skip-build   skip the build (reuse the last one)
#
# Override before the command (defaults shown):
#   WAVEGRID_PORT=3000   WAVEGRID_LAYOUT=grid-7x7
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

# ── localhost-pinned config (the receiver points at the local server) ──
export WAVEGRID_PORT="${WAVEGRID_PORT:-3000}"
export SIMULATOR_URL="${SIMULATOR_URL:-ws://localhost:${WAVEGRID_PORT}}"   # receiver → server

SKIP_BUILD=0
[ "${1:-}" = "--skip-build" ] && SKIP_BUILD=1

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "▶ Building the UI (Vite → dist/) that the server serves …"
  pnpm build:ui
else
  echo "▶ Skipping UI build (--skip-build)"
fi

# ── start both; kill them together on exit ──────────────────────────
pids=()
cleanup() {
  echo
  echo "▶ Shutting down …"
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "▶ server    → http://localhost:${WAVEGRID_PORT}  (server + UI + API + WebSocket)"
pnpm dev:server & pids+=("$!")

echo "▶ receiver  → upstream ${SIMULATOR_URL}  (no OSC unless BEYOND_HOST/ROUTING_CONFIG set)"
pnpm dev:receiver & pids+=("$!")

echo
echo "All up. Open http://localhost:${WAVEGRID_PORT} — Ctrl-C stops everything."
wait
