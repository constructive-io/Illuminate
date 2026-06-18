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

**Wavegrid** is a modular laser grid controller for arrays of Laser Space Cannons on Global Truss F34 structures. It includes a web-based simulation UI, an artist-facing creative canvas, a WebSocket relay, and OSC output adapters for BEYOND and FB4 hardware.

Grid size defaults to 7x7 (49 cannons) but is fully configurable for any layout.

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
| `packages/simulator` | `@wavegrid/simulator` | Grid state engine and master controller UI |
| `packages/ui` | `@wavegrid/ui` | Next.js artist UI — Paint, Gradient, Drops, Motion, Scenes, Animations, Flags, Brightness, Audio |
| `packages/receiver` | `wavegrid` | Receiver brain — LP filter, sine fallback, pluggable adapter pattern |
| `packages/relay` | `@wavegrid/relay` | Transparent WebSocket message router |
| `packages/osc` | `@wavegrid/osc` | OSC output adapters for BEYOND and FB4 laser hardware |
| `packages/webgl` | `@wavegrid/webgl` | Three.js 3D Civic Center viewer — volumetric laser beams, bloom, camera presets |

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   UI         │ ──ws──▶ │  Simulator   │ ──ws──▶ │  Receiver    │
│  (artist UI) │ ◀──ws── │ (state + LP) │         │  (brain)     │
│  :3003       │         │  :3000       │         │  own LP      │
└──────────────┘         └──────────────┘         │  sine fbk    │
       │                        │                 │  → hardware  │
       │    ┌──────────────┐    │                 └──────────────┘
       └──▶ │    Relay     │ ◀──┘                        │
            │  (optional)  │                      ┌──────────────┐
            │  :3002       │                      │  @wavegrid/  │
            └──────────────┘                      │  osc         │
                                                  │  → BEYOND    │
                                                  │  → FB4       │
                                                  └──────────────┘
```

- **Simulator** — state engine with exponential low-pass filtering and master controller UI. Scenes, animations, ambient presets, idle timeout. Runs at 60fps, broadcasts only on change.
- **UI** — Next.js artist-facing creative instrument. Paint, Gradient, Drops, Motion, Scenes, Animations, Flags, Brightness, Audio. iPad-optimized touch UI.
- **Receiver** — the "brain" that controls physical hardware. Runs its own independent LP filter so output never jolts. On signal loss, smoothly transitions into ambient 3D sine waves. Pluggable input/output adapters.
- **Relay** — transparent WebSocket message router for remote access or multi-receiver setups. Optional — direct connections still work.
- **OSC** — output adapters for Pangolin BEYOND and FB4 laser hardware. HSB-to-RGB color conversion, per-cannon routing via JSON config.

## Running

```sh
# Start the full stack (each in its own terminal)
pnpm dev:sim       # Simulator at :3000 (master controller)
pnpm dev:ui        # UI at :3003 (artist UI)
pnpm dev:receiver  # Receiver (brain)

# Optional
pnpm dev:relay     # Relay at :3002
pnpm dev:webgl     # 3D Civic Center viewer at :3004
```

## Configurable Grid Size

Everything defaults to 7x7 (49 cannons). Override with environment variables:

```sh
# 10x10 grid (100 cannons)
NUM_CANNONS=100 GRID_COLUMNS=10 pnpm dev:sim
NUM_CANNONS=100 GRID_COLUMNS=10 pnpm dev:ui
NUM_CANNONS=100 GRID_COLUMNS=10 pnpm dev:receiver
```

## Sharding

Split the grid across multiple receivers when hardware limits apply:

```sh
# Laptop A (40 cannons)
SHARD_START=0 SHARD_END=39 pnpm dev:receiver

# Laptop B (9 cannons)
SHARD_START=40 SHARD_END=48 pnpm dev:receiver
```

Both connect to the same Simulator (or Relay). The UI stays unified.

## Data Flow

The UI never sends OSC — only the **Receiver** talks to laser hardware:

```
┌──────────┐   HSB grid (WebSocket)   ┌──────────┐   HSB grid (WebSocket)   ┌──────────┐   OSC/UDP   ┌──────────┐
│    UI    │ ────────────────────────► │Simulator │ ────────────────────────► │ Receiver │ ──────────► │  BEYOND  │
│ (browser)│                           │  :3000   │                           │  (brain) │            │  (laser) │
└──────────┘                           └──────────┘                           └──────────┘            └──────────┘
  Paints colors                     Broadcasts state                     Smooths + converts            Drives
  & scenes                          to all clients                       HSB → RGB/OSC                 hardware
```

- **UI** sends high-level grid state (HSB colors per cell) over WebSocket
- **Simulator** broadcasts that state to all connected WebSocket clients
- **Receiver** applies LP smoothing, converts HSB to the configured color format, and sends OSC messages over UDP to BEYOND
- The UI has no knowledge of OSC, projectors, or zones

## Deployment

### Local (all-in-one)

For a live event where everything runs on a single machine at the venue:

```sh
pnpm dev:sim                             # :3000 (master controller)
pnpm dev:ui                              # :3003 (artist UI)
pnpm dev:receiver                        # brain → hardware
```

iPads connect to `http://<machine-ip>:3003` for the UI.

### Remote (cloud server + on-site hardware)

When the UI/Simulator run on a cloud server and the laser hardware is on-site:

```
┌───────────────────────────────────┐              ┌──────────────────────────────┐
│        Cloud Server               │              │       On-Site (Pangolin PC)  │
│                                   │   WebSocket  │                              │
│  Simulator (:3000)  ◄─────────────┼──────────────┼──  Receiver                  │
│  UI (:3003)                       │              │       │                      │
│                                   │              │       ▼ OSC/UDP (localhost)  │
│  Artists connect via browser      │              │    BEYOND (:7001)            │
└───────────────────────────────────┘              └──────────────────────────────┘
```

**On the cloud server** (e.g. DigitalOcean):

```sh
# Terminal 1 — Simulator (WebSocket server)
pnpm dev:sim

# Terminal 2 — UI (Next.js, tells browsers where the simulator is)
NEXT_PUBLIC_SIMULATOR_URL=ws://203.0.113.50:3000 pnpm dev:ui
```

Replace `203.0.113.50` with your server's public IP. Ensure ports **3000** and **3003** are open in the firewall.

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

The receiver connects outward to the cloud simulator and sends OSC locally to BEYOND. `BEYOND_HOST=127.0.0.1` when BEYOND runs on the same machine; use the LAN IP if BEYOND is on a different box.

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

The UI has a login screen that protects access. Create a `.users` file in the repo root with one `username:password` per line:

```sh
cp .users.example .users
# Edit .users with real credentials
```

When `.users` exists and contains entries, the UI shows a login screen. When it's missing or empty, the UI is open (no login required).

The `.users` file is gitignored — only `.users.example` (with fake credentials) is tracked.

### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `USERS_FILE` | `../../.users` | Path to credentials file (UI only) |
| `SIMULATOR_URL` | `ws://localhost:3000` | WebSocket upstream for the receiver |
| `NEXT_PUBLIC_SIMULATOR_URL` | `ws://localhost:3000` | WebSocket URL the browser UI connects to |
| `BEYOND_HOST` | — | BEYOND PC IP (enables OSC output) |
| `BEYOND_PORT` | `7001` | BEYOND OSC receive port |
| `BEYOND_GRID_ORDER` | `row` | Grid-to-zone mapping: `row` or `column` |
| `SHARD_START` / `SHARD_END` | — | Cannon index range for this receiver |
| `NUM_CANNONS` | `49` | Total cannons in grid |
| `GRID_COLUMNS` | `7` | Number of columns |
| `DEBUG_OSC` | — | Set to `1` to log every OSC message |
| `RECEIVER_ALPHA` | `0.06` | LP filter smoothing factor |
| `FALLBACK_DELAY` | `3000` | Ms before sine fallback on signal loss |
| `FB4_HOST` / `FB4_PORT` | — | FB4 device IP and port (default port 8000) |
| `ROUTING_CONFIG` | — | Path to JSON routing config file |

## Credits

**Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**
