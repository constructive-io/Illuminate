# Illuminate

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

## Overview

**Illuminate** is a 7×7 laser grid controller for a 49 Laser Space Cannons on a Global Truss F34 array. This workspace contains the web-based simulation UI and the OSC bridge for controlling BEYOND.

## Getting Started

```sh
# Install dependencies
pnpm install

# Run the simulator dev server
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

### Prerequisites

- Node.js 18+
- pnpm
- Docker (for future pgpm database modules)
- pgpm (`npm install -g pgpm`) — for future database work

## Packages

| Package | Description |
|---------|-------------|
| `@wavegrid/simulator` | 7×7 grid state engine and debug UI — manages the 49-cannon state with smooth interpolation |
| `@wavegrid/canvas` | Artist-facing creative canvas — "painting the sky with light" |
| `wavegrid` | Receiver brain — independent LP filter, 3D sine fallback, adapter pattern for hardware |

## Architecture

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Canvas     │ ──ws──▶ │  Simulator   │ ──ws──▶ │  Receiver    │
│  (artist UI) │ ◀──ws── │ (state + LP) │         │  (brain)     │
│  :3001       │         │  :3000       │         │  own LP      │
└──────────────┘         └──────────────┘         │  sine fbk    │
                                                  │  → OSC/BEYOND│
                                                  └──────────────┘
```

- **Simulator** — state engine with exponential low-pass filtering. All transitions are smooth — no abrupt jumps. Runs at 60fps, broadcasts only on change.
- **Canvas** — artist-facing creative instrument. Paint, gradient, brush, energy, motion, symmetry modes. Connects to the simulator via WebSocket. iPad-optimized, no technical language.
- **Receiver** — the "brain" that controls physical hardware. Runs its own independent low-pass filter (alpha=0.06, even smoother than the simulator) so even if a client disconnects mid-transition, the output never jolts. On signal loss, smoothly transitions into ambient 3D sine waves across the grid. When signal returns, smoothly blends back.

## Running

```sh
# Start the full stack (three terminals)
pnpm dev:sim       # Simulator at :3000
pnpm dev:canvas    # Canvas at :3001
pnpm dev:receiver  # Receiver (brain)

# Or just the canvas (connects to simulator automatically)
pnpm dev:canvas
```

Future phases will add:
- Real OSC bridge to BEYOND laser software
- pgpm database modules for show programming and presets

## Credits

**🛠 Built by the [Constructive](https://constructive.io) team — creators of modular Postgres tooling for secure, composable backends. If you like our work, contribute on [GitHub](https://github.com/constructive-io).**
