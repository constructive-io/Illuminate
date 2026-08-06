<p align="center">
  <a href="https://constructive.io">
    <img src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" width="400" alt="Constructive" />
  </a>
</p>

# @wavegrid/ui

Static Vite + React frontend for the Wavegrid laser grid controller, served by `@wavegrid/server` on one origin. Built with React 19 and Tailwind CSS v4.

## Features

| Tab | Description |
|-----|-------------|
| **Paint** | Tap or drag to color individual cannons with HSB color picker |
| **Scenes** | Preset color palettes — civic, pride, gold, ocean, sunset, etc. |
| **Animations** | Continuous patterns — wave, breathe, rainbow, pac-man, spiral, rain, heartbeat |
| **Audio** | Drag-and-drop an audio file for music-reactive lighting via Web Audio API FFT |

### Audio Reactive Modes

- **Spectrum** — frequency bands map to grid columns, amplitude controls row brightness (graphic equalizer style)
- **Energy** — overall audio energy drives brightness, bass frequencies shift hue
- **Beat** — onset detection flashes the grid on transients with frequency-based coloring

### Controls

- **Brightness** — global master brightness
- **Smooth** — how quickly lights converge to target colors (release/glide)
- **Attack** — how aggressively new inputs take hold

## Running

In production the server serves the built UI — there is no separate UI server. Build it once and the server picks it up:

```bash
pnpm --filter @wavegrid/ui build   # → packages/ui/dist (served by @wavegrid/server)
```

For a hot-reload dev loop, run the server and the Vite dev server side by side:
```bash
pnpm dev:server    # :3000 — API + WebSocket
pnpm dev:ui        # http://localhost:3003 — proxies /api to :3000
```

## Configuration

The UI is configuration-free: it fetches the resolved layout and its same-origin
WebSocket URL from the server's `GET /api/config` at runtime. There are no
build-time env vars — layout (cannon count, columns) comes from the server's
project config, and the WebSocket URL is derived from the page origin.

## Tech Stack

- Vite (static SPA build)
- React 19
- Tailwind CSS v4 (CSS-first config, `@tailwindcss/vite`)
- Web Audio API (FFT analysis, BPM detection)
- TypeScript 5
