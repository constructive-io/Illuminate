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

## Deployment

For a live event, run all services on the Windows machine at the venue:

```sh
node packages/simulator/dist/server.js   # :3000 (master controller)
pnpm dev:ui                              # :3003 (artist UI)
node packages/receiver/dist/main.js      # brain → hardware
```

iPads connect to `http://<machine-ip>:3003` for the UI.

## Credits

**Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**
