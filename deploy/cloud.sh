#!/usr/bin/env bash
# Cloud server launcher (machine #1, the internet box at CLOUD_IP).
# Runs the simulator + ui under PM2 so they stay up unattended.
#
#   deploy/cloud.sh start     start (or reload) sim + ui under PM2
#   deploy/cloud.sh stop      stop both
#   deploy/cloud.sh restart   restart both (picks up code/.env changes)
#   deploy/cloud.sh logs      tail combined logs
#   deploy/cloud.sh status    show process list
#   deploy/cloud.sh setup     install pm2 if missing + enable boot persistence
#   deploy/cloud.sh deploy    production build the UI (env baked in) + restart
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ECO="$DEPLOY_DIR/ecosystem.config.js"

# Production-build the UI with NEXT_PUBLIC_SIMULATOR_URL baked in from .env.
build_ui() {
  # shellcheck disable=SC1091
  . "$DEPLOY_DIR/load-env.sh" >/dev/null   # sets ILLUMINATE_DIR + NEXT_PUBLIC_SIMULATOR_URL
  echo "Building UI with NEXT_PUBLIC_SIMULATOR_URL=$NEXT_PUBLIC_SIMULATOR_URL …"
  ( cd "$ILLUMINATE_DIR" && pnpm build:ui )
}

ensure_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo "pm2 not found — installing globally with pnpm…"
    pnpm add -g pm2
  fi
}

cmd="${1:-status}"
case "$cmd" in
  start)
    ensure_pm2
    pm2 start "$ECO"
    pm2 save
    ;;
  stop)    pm2 stop "$ECO" ;;
  restart) pm2 restart "$ECO" ;;
  logs)    pm2 logs ;;
  status)  pm2 status ;;
  deploy)
    ensure_pm2
    build_ui
    pm2 restart "$ECO" --update-env
    pm2 save
    ;;
  setup)
    ensure_pm2
    build_ui
    pm2 start "$ECO"
    pm2 save
    echo
    echo "To survive reboots, run the command pm2 prints below (needs sudo):"
    pm2 startup
    ;;
  *)
    echo "usage: $0 {start|stop|restart|logs|status|setup|deploy}" >&2
    exit 1
    ;;
esac
