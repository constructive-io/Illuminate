# Wavegrid

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

## Overview

**Wavegrid** is a modular laser grid controller for arrays of Laser Space Cannons on Global Truss F34 structures. It includes a grid state server, an artist-facing creative canvas, and OSC output adapters for BEYOND and FB4 hardware.

Grid size defaults to 7x7 (49 cannons) but is fully configurable for any layout.

## Run Locally 

The stack is two processes. The **server serves the UI + API + WebSocket on one port** (the UI is a static Vite build — no separate UI server), and the receiver drives OSC. The browser derives its WebSocket URL from the page origin, so there is no `NEXT_PUBLIC_SIMULATOR_URL` / UI URL to configure.

| Process | Script | Port | Role |
|---|---|---|---|
| Server | `pnpm dev:server` | `:3000` | grid state engine + UI + API + WebSocket |
| Receiver | `pnpm dev:receiver` | — | brain → OSC to BEYOND |

For a prod-parity run on localhost (builds the UI, then boots server + receiver in one terminal, `Ctrl-C` stops everything):

```sh
deploy/local.sh                # build UI (Vite) + start server + receiver
deploy/local.sh --skip-build   # reuse the last UI build
```

Then open **http://localhost:3000**. The receiver emits OSC only when `BEYOND_HOST` / `ROUTING_CONFIG` is set, so it's safe to run with no hardware attached.

For a real installation, prefer the CLI: `wavegrid start` (one laptop: server + UI + receiver) or `wavegrid server` + `wavegrid receiver` (distributed). See the operator skills under `.agents/skills/`.

## Getting Started

```sh
pnpm install
pnpm test
pnpm build
```

### Prerequisites

- Node.js 18+
- pnpm

## Packages

| Package | Name | Description |
|---------|------|-------------|
| `packages/server` | `@wavegrid/server` | Grid state engine and master controller UI |
| `packages/ui` | `@wavegrid/ui` | Next.js artist UI — Paint, Gradient, Drops, Motion, Scenes, Animations, Flags, Brightness, Audio |
| `packages/receiver` | `@wavegrid/receiver` | Receiver brain — LP filter, sine fallback, pluggable adapter pattern |
| `packages/osc` | `@wavegrid/osc` | OSC output adapters for BEYOND and FB4 laser hardware |
| `packages/webgl` | `@wavegrid/webgl` | Three.js 3D Civic Center viewer — volumetric laser beams, bloom, camera presets |

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   UI         │ ──ws──▶ │   Server     │ ──ws──▶ │  Receiver    │
│  (artist UI) │ ◀──ws── │ (state + LP) │         │  (brain)     │
│  :3003       │         │  :3000       │         │  own LP      │
└──────────────┘         └──────────────┘         │  sine fbk    │
                                                    │  → hardware  │
                                                    └──────────────┘
                                                           │
                                                    ┌──────────────┐
                                                    │  @wavegrid/  │
                                                    │  osc         │
                                                    │  → BEYOND    │
                                                    │  → FB4       │
                                                    └──────────────┘
```

- **Server** — grid state engine with exponential low-pass filtering. Scenes, animations, ambient presets, idle timeout. Runs at 60fps, broadcasts only on change.
- **UI** — a static Vite/React artist-facing creative instrument served by the server on its own port. Paint, Gradient, Drops, Motion, Scenes, Animations, Flags, Brightness, Audio. iPad-optimized touch UI.
- **Receiver** — the "brain" that controls physical hardware. Runs its own independent LP filter so output never jolts. On signal loss, smoothly transitions into ambient 3D sine waves. Pluggable input/output adapters.
- **OSC** — output adapters for Pangolin BEYOND and FB4 laser hardware. HSB-to-RGB color conversion, per-cannon routing via JSON config.

## Running

```sh
# Start the stack (each in its own terminal)
pnpm dev:server    # Server at :3000 — also serves the UI + API + WebSocket
pnpm dev:receiver  # Receiver (brain)

# The UI in watch mode (Vite dev server; proxies /api to :3000)
pnpm dev:ui        # http://localhost:3003

# Optional
pnpm dev:webgl     # 3D Civic Center viewer at :3004
```

## Configurable Grid Size

Everything defaults to 7x7 (49 cannons). Layout is config-driven — pick a built-in preset (or author a custom layout) via the project config:

```sh
wavegrid projects config set layout grid-7x7   # or ring-6, ring-25-filled, …
```

The server resolves the layout once and broadcasts it; the UI and receiver render from it — no per-process `NUM_CANNONS`/`GRID_COLUMNS` to keep in sync.

## Sharding

Split the grid across multiple receivers when hardware limits apply:

```sh
# Laptop A (40 cannons)
SHARD_START=0 SHARD_END=39 pnpm dev:receiver

# Laptop B (9 cannons)
SHARD_START=40 SHARD_END=48 pnpm dev:receiver
```

Both connect to the same server. The UI stays unified.

## Data Flow

The UI never sends OSC — only the **Receiver** talks to laser hardware:

```
┌──────────┐   HSB grid (WebSocket)   ┌──────────┐   HSB grid (WebSocket)   ┌──────────┐   OSC/UDP   ┌──────────┐
│    UI    │ ────────────────────────► │  Server  │ ────────────────────────► │ Receiver │ ──────────► │  BEYOND  │
│ (browser)│                           │  :3000   │                           │  (brain) │            │  (laser) │
└──────────┘                           └──────────┘                           └──────────┘            └──────────┘
  Paints colors                     Broadcasts state                     Smooths + converts            Drives
  & scenes                          to all clients                       HSB → RGB/OSC                 hardware
```

- **UI** sends high-level grid state (HSB colors per cell) over WebSocket
- **Server** broadcasts that state to all connected WebSocket clients
- **Receiver** applies LP smoothing, converts HSB to the configured color format, and sends OSC messages over UDP to BEYOND
- The UI has no knowledge of OSC, projectors, or zones

## Deployment

### Local (all-in-one)

For a live event where everything runs on a single machine at the venue:

```sh
pnpm dev:server                          # :3000 (master controller)
pnpm dev:ui                              # :3003 (artist UI)
pnpm dev:receiver                        # brain → hardware
```

iPads connect to `http://<machine-ip>:3003` for the UI.

### Remote (cloud server + on-site hardware)

When the UI/Server run on a cloud server and the laser hardware is on-site:

```
┌───────────────────────────────────┐              ┌──────────────────────────────┐
│        Cloud Server               │              │       On-Site (Pangolin PC)  │
│                                   │   WebSocket  │                              │
│  Server (:3000)     ◄─────────────┼──────────────┼──  Receiver                  │
│  UI (:3003)                       │              │       │                      │
│                                   │              │       ▼ OSC/UDP (localhost)  │
│  Artists connect via browser      │              │    BEYOND (:7001)            │
└───────────────────────────────────┘              └──────────────────────────────┘
```

**On the cloud server** (e.g. DigitalOcean):

```sh
# Server — grid state engine + UI + API + WebSocket, all on one port
pnpm dev:server
```

Open **http://203.0.113.50:3000** in the browser (replace `203.0.113.50` with your server's public IP). The browser derives its WebSocket URL from the page origin, so there is no UI URL to configure. Ensure port **3000** is open in the firewall.

**On the Pangolin PC** (on-site, Windows — same network as BEYOND):

PowerShell:
```powershell
$env:SIMULATOR_URL = "ws://203.0.113.50:3000"
$env:BEYOND_HOST = "127.0.0.1"
$env:BEYOND_PORT = "7001"
$env:SHARD_START = "0"
$env:SHARD_END = "23"
$env:DEBUG_OSC = "1"
pnpm dev:receiver
```

Bash (Linux/macOS):
```sh
SIMULATOR_URL=ws://203.0.113.50:3000 \
BEYOND_HOST=127.0.0.1 \
BEYOND_PORT=7001 \
SHARD_START=0 \
SHARD_END=23 \
DEBUG_OSC=1 \
pnpm dev:receiver
```

The receiver connects outward to the cloud server and sends OSC locally to BEYOND. `BEYOND_HOST=127.0.0.1` when BEYOND runs on the same machine; use the LAN IP if BEYOND is on a different box.

### Multi-Target Routing (multiple BEYOND machines)

When a single BEYOND PC can't handle all 49 zones, split the grid across multiple machines using a **routing config** JSON file. One receiver dispatches OSC to multiple BEYOND targets over the LAN — no extra Node.js installs needed on the other machines.

```
┌──────────────────────────────┐
│     Receiver (one machine)   │
│                              │
│  reads routing.json          │
│  ┌────────┐   ┌────────┐    │
│  │ grid   │──►│ routed │    │
│  │ state  │   │ output │    │
│  └────────┘   └───┬────┘    │
│                   │         │
└───────────────────┼─────────┘
          ┌─────────┼─────────┐
          ▼                   ▼
  ┌──────────────┐    ┌──────────────┐
  │  BEYOND A    │    │  BEYOND B    │
  │  .1.68:7001  │    │  .1.69:7001  │
  │  zones 0–23  │    │  zones 0–24  │
  └──────────────┘    └──────────────┘
```

Create a `routing.json` file (see `examples/routing-two-beyond.json` for a full 49-cannon example):

```json
{
  "targets": {
    "beyond-a": { "type": "beyond", "host": "192.168.1.68", "port": 7001 },
    "beyond-b": { "type": "beyond", "host": "192.168.1.69", "port": 7001 }
  },
  "flushHz": 30,
  "cannons": [
    { "logical": 0,  "target": "beyond-a", "projectorIndex": 0,  "label": "row0 col0" },
    { "logical": 1,  "target": "beyond-a", "projectorIndex": 1,  "label": "row0 col1" },
    ...
    { "logical": 24, "target": "beyond-b", "projectorIndex": 0,  "label": "row3 col3" },
    { "logical": 25, "target": "beyond-b", "projectorIndex": 1,  "label": "row3 col4" },
    ...
  ]
}
```

Each cannon entry maps a logical grid index to a target and zone index:
- **`logical`** — grid cell index (0–48 for a 7×7 grid)
- **`target`** — name of a target defined in `targets`
- **`projectorIndex`** — the BEYOND zone index on that target (resets to 0 for each target)
- **`label`** — optional human-readable name for debugging
- **`safeDisabled`** — set `true` to disable a cannon in software

Run with:

PowerShell (Windows):
```powershell
$env:ROUTING_CONFIG = "routing.json"
$env:SIMULATOR_URL = "ws://203.0.113.50:3000"
$env:DEBUG_OSC = "1"
pnpm dev:receiver
```

Bash:
```sh
ROUTING_CONFIG=routing.json SIMULATOR_URL=ws://203.0.113.50:3000 DEBUG_OSC=1 pnpm dev:receiver
```

The startup banner will show: `Routed OSC → [beyond-a, beyond-b]`

> **Note:** When using `ROUTING_CONFIG`, do not set `BEYOND_HOST` — they are mutually exclusive.

### BEYOND Color Control

The receiver sends 5 OSC messages per changed cannon: `alpha` (255 = full override) + `red` + `green` + `blue` (0–255) + `Brightness` (0–100). This requires BEYOND's RGBA panel to be enabled: **Settings → Configuration → Live Control → Extra Controls → "Show R-G-B-A panel"**.


### User Authentication

The UI has a login screen that protects access. Users live in the appstash store per project (scrypt-hashed), managed via the CLI:

```sh
wavegrid projects users add admin
wavegrid projects users list
```

When a project has at least one user, the UI shows a login screen; the server verifies against the store and issues a JWT signed with the store-authoritative secret.

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `SIMULATOR_URL` | `ws://localhost:3000` | WebSocket upstream for the receiver |
| `BEYOND_HOST` | — | BEYOND PC IP (enables OSC output) |
| `BEYOND_PORT` | `7001` | BEYOND OSC receive port |
| `BEYOND_GRID_ORDER` | `row` | Grid-to-zone mapping: `row` or `column` |
| `SHARD_START` / `SHARD_END` | — | Cannon index range for this receiver |
| `DEBUG_OSC` | — | Set to `1` to log every OSC message |
| `RECEIVER_ALPHA` | `0.06` | LP filter smoothing factor |
| `FALLBACK_DELAY` | `3000` | Ms before sine fallback on signal loss |
| `FB4_HOST` / `FB4_PORT` | — | FB4 device IP and port (default port 8000) |
| `ROUTING_CONFIG` | — | Path to JSON routing config file |

## Credits

**Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**
