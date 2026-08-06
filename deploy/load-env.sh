#!/usr/bin/env bash
# Load env vars into the current shell, then run the dev server manually.
#
#   source deploy/load-env.sh && pnpm dev:server   # serves UI + API + WS
#   source deploy/load-env.sh && pnpm dev:receiver # pangolin/receiver box
#
# Works in bash and zsh. Must be *sourced* (not executed) so exports stick.

# Resolve this script's directory in both bash and zsh, sourced or not.
if [ -n "${BASH_SOURCE:-}" ]; then
  _src="${BASH_SOURCE[0]}"
elif [ -n "${ZSH_VERSION:-}" ]; then
  _src="${(%):-%x}"
else
  _src="$0"
fi
DEPLOY_DIR="$(cd "$(dirname "$_src")" && pwd)"
export ILLUMINATE_DIR="${ILLUMINATE_DIR:-$(cd "$DEPLOY_DIR/.." && pwd)}"

# Prefer the real .env; fall back to the example so a fresh checkout still works.
_envfile="$DEPLOY_DIR/.env"
[ -f "$_envfile" ] || _envfile="$DEPLOY_DIR/.env.example"

if [ -f "$_envfile" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$_envfile"
  set +a
fi

# The server binds WAVEGRID_PORT and serves the UI + WebSocket on it. The
# receiver's upstream is derived from CLOUD_IP (the single source of truth).
: "${SIM_PORT:=3000}"
: "${WAVEGRID_PORT:=$SIM_PORT}"; export WAVEGRID_PORT SIM_PORT
if [ -n "${CLOUD_IP:-}" ]; then
  : "${SIMULATOR_URL:=ws://${CLOUD_IP}:${SIM_PORT}}"
  export SIMULATOR_URL
fi

echo "WaveGrid env loaded from: $_envfile"
echo "  ILLUMINATE_DIR  = $ILLUMINATE_DIR"
echo "  CLOUD_IP        = ${CLOUD_IP:-<unset>}"
echo "  WAVEGRID_PORT   = $WAVEGRID_PORT"
echo "  SIMULATOR_URL   = ${SIMULATOR_URL:-<unset>}"
echo
echo "Now run:"
echo "  pnpm dev:server     # cloud box (serves UI + API + WebSocket)"
echo "  pnpm dev:receiver   # pangolin (or use deploy/receiver.cmd on Windows)"
