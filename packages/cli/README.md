# @wavegrid/cli

The `wavegrid` command-line tool — scaffold a layout configuration and launch an
installation (server + UI + receiver) from a single command. New physical
arrangements are pure configuration: no shape-specific code.

## Install

```bash
pnpm add -g @wavegrid/cli
# or run from the workspace
pnpm --filter @wavegrid/cli run dev -- <command>
```

## Commands

### `wavegrid init`

Interactively scaffold a `wavegrid.json` in the current directory.
Prompts for the layout shape (a built-in preset, or a custom `grid` / `ring` /
`filledRing` with parameters), the run mode, and server/UI ports.

```bash
wavegrid init
```

### `wavegrid start`

Load the resolved configuration and launch the installation. In **simple** mode
(auto-selected when the cannon count is under the single-laptop threshold) it
runs server + UI + receiver together on one machine — LAN-only, no internet
required. In **distributed** mode it still boots the local trio but expects
per-laptop receivers to be sharded via `SHARD_START` / `SHARD_END`.

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
