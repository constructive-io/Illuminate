# wavegrid

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

<p align="center" width="100%">
  <a href="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml">
    <img height="20" src="https://github.com/constructive-io/Illuminate/actions/workflows/ci.yml/badge.svg" />
  </a>
</p>

The **brain** of the Illuminate installation. Sits between the control layer (Canvas/Simulator) and the physical hardware (BEYOND/OSC).

## Design Principles

1. **Never jolt** — runs its own independent low-pass filter on all incoming state, so even if a client disconnects mid-transition, the output always flows smoothly
2. **Always alive** — on signal loss, gracefully falls back to ambient 3D sine wave animations instead of freezing or going dark
3. **Hardware bridge** — translates HSB grid state into OSC messages for BEYOND (future phase)

## Architecture

```
Canvas ──ws──▶ Simulator ──ws──▶ Receiver ──osc──▶ BEYOND
                                    │
                              own LP filter
                              sine fallback
                              health monitor
```

## Usage

```sh
pnpm dev:receiver
# Connects to simulator at ws://localhost:3000
# Outputs state to console (or OSC when configured)
```

## Fallback Behavior

When the upstream WebSocket connection drops:
- The receiver continues running its own tick loop at 60fps
- Current state smoothly transitions into a 3D sine wave pattern
- Sine waves sweep through hue/brightness across the 7×7 grid
- When connection restores, sine wave smoothly blends back to received state

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `SIMULATOR_URL` | `ws://localhost:3000` | Upstream WebSocket |
| `RECEIVER_ALPHA` | `0.06` | Low-pass filter smoothing (lower = smoother) |
| `FALLBACK_DELAY` | `3000` | ms before switching to sine fallback |
| `OSC_HOST` | — | BEYOND OSC target host (future) |
| `OSC_PORT` | — | BEYOND OSC target port (future) |
