#!/usr/bin/env bash
# Cloud server launcher (machine #1, the internet box at CLOUD_IP).
# Runs the server under PM2 (which serves the UI + API + WS) so it stays up.
#
#   deploy/cloud.sh start     start (or reload) the server under PM2
#   deploy/cloud.sh stop      stop it
#   deploy/cloud.sh restart   restart it (picks up code/.env changes)
#   deploy/cloud.sh logs      tail combined logs
#   deploy/cloud.sh status    show process list
#   deploy/cloud.sh setup     install pm2 if missing + enable boot persistence
#   deploy/cloud.sh deploy    build all packages (incl. the UI) + restart
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ECO="$DEPLOY_DIR/ecosystem.config.js"

# Build every package, including the UI (Vite → dist/) that the server serves.
build_ui() {
  # shellcheck disable=SC1091
  . "$DEPLOY_DIR/load-env.sh" >/dev/null   # sets ILLUMINATE_DIR
  echo "Building all packages (incl. UI) …"
  ( cd "$ILLUMINATE_DIR" && pnpm build )
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
