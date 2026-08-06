#!/usr/bin/env bash
# Build the UI (Vite → packages/ui/dist). The server serves this build on its
# own port; the browser derives its WebSocket URL from the page origin, so
# there is nothing to bake in at build time.
set -euo pipefail

exec pnpm --filter @wavegrid/ui build
