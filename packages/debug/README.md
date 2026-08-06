# @wavegrid/debug

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>


Interactive 7×7 grid debugger for the Wavegrid laser cannon array.

## Features

- Visual grid layout showing all 49 cannons (A1–G7)
- Click to toggle individual cannons on/off
- Per-cell dropdown to assign BEYOND zone indices (0–48)
- Orientation controls (origin corner + traversal order)
- Auto-assign identity mapping based on orientation
- Flash sequence for calibration
- JSON export/import of zone mappings
- WebSocket connection to server for live control

## Usage

```sh
pnpm dev:debug
# → http://localhost:3005
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMULATOR_URL` | `ws://localhost:3000` | WebSocket URL of the server |
| `DEBUG_PORT` | `3005` | HTTP server port |

Example on a remote droplet:

```sh
SIMULATOR_URL=ws://localhost:3000 pnpm dev:debug
```
