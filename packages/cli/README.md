# @wavegrid/cli

The `wavegrid` command-line tool — scaffold a layout configuration and run an
installation (server + receiver, in-process) from a single command. New physical
arrangements are pure configuration: no shape-specific code. The CLI bakes in
the server and receiver as dependencies, so a fresh `npm i -g @wavegrid/cli`
plus a `wavegrid.json` is all an operator needs — no monorepo checkout, no pnpm.

## Install

```bash
npm i -g @wavegrid/cli
# then, in a directory containing a wavegrid.json:
wavegrid start
```

## Commands

### `wavegrid init`

Interactively scaffold a `wavegrid.json` in the current directory.
Prompts for the layout shape (a built-in preset, or a custom `grid` / `ring` /
`filledRing` with parameters), the run mode, and server/UI ports (the UI port is
recorded for the separate UI app; the CLI itself does not launch the UI).

```bash
wavegrid init
```

### `wavegrid start`

Load the resolved configuration and run the installation **in-process** — the
server and receiver together in a single Node process, wired to talk to each
other over a local WebSocket (an ephemeral receiver key is generated if none is
set). In **simple** mode (auto-selected when the cannon count is under the
single-laptop threshold) this is the whole installation on one machine —
LAN-only, no internet required. In **distributed** mode it runs the same pair
but the receiver shards via `SHARD_START` / `SHARD_END`. The artist UI is a
separate app that reads the same `wavegrid.json`; it is not launched here.

```bash
wavegrid start
```

### `wavegrid print-config` (or `wavegrid --print-config`)

Resolve the configuration and print it with per-key provenance so it is obvious
which layer supplied each value (defaults → preset → file → env → overrides).

```bash
wavegrid print-config
```

## Configuration

Configuration is discovered by [`confstash`](https://www.npmjs.com/package/confstash)
via walk-up search (`wavegrid.json`, `.wavegridrc`, `package.json` keys,
…) and layered with environment variables:

| Variable | Maps to |
| --- | --- |
| `WAVEGRID_LAYOUT` | `layout.preset` |
| `WAVEGRID_MODE` | `mode` (`auto` \| `simple` \| `distributed`) |
| `WAVEGRID_SIMPLE_MAX` | `simpleModeMax` |
| `PORT` / `SIM_PORT` | `server.port` |
| `HOST` | `server.host` |
| `UI_PORT` | `ui.port` |

### Example `wavegrid.json`

```json
{
  "layout": { "preset": "ring-6" },
  "mode": "auto",
  "simpleModeMax": 40,
  "server": { "host": "0.0.0.0", "port": 3000 },
  "ui": { "port": 3003 }
}
```

Built-in presets: `grid-7x7`, `grid-7x2`, `ring-6`, `ring-25-filled`.
