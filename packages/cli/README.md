# @wavegrid/cli

The `wavegrid` command-line tool — create a laser installation as a **project**
in a centralized store, and run it (server + receiver, in-process) from a single
command. New physical arrangements are pure configuration: no shape-specific
code. The CLI bakes in the server and receiver as dependencies, so a fresh
`npm i -g @wavegrid/cli` is all an operator needs — no monorepo checkout, no pnpm.

Projects, secrets, users, runtime state, and logs live in a per-user store at
`~/.wavegrid` (via [`appstash`](https://www.npmjs.com/package/appstash)). Set
`APPSTASH_BASE_DIR` to relocate the whole store; the config layer resolves the
same way, so the store and config never diverge.

## Install

```bash
npm i -g @wavegrid/cli
wavegrid init                 # create a project + generate its secrets
wavegrid users add            # add a UI login (prompted)
wavegrid start                # run server + receiver
```

## Commands

| Command | Purpose |
| --- | --- |
| `wavegrid init [name]` | Create a project in the store; **generates secrets once**; optionally add a first user. |
| `wavegrid start` | Load the active project and run server + receiver in-process. |
| `wavegrid projects` | List projects, marking the active one. |
| `wavegrid use <name>` | Set the active project. |
| `wavegrid config` | Print the resolved config + provenance (secret values masked). |
| `wavegrid secrets list` | List required secrets and whether each is set (never values). |
| `wavegrid secrets init` | Generate any missing secrets (`--force` rotates). |
| `wavegrid users add [name]` | Add/replace a UI login user (password hashed). |
| `wavegrid users rm <name>` | Remove a UI login user. |
| `wavegrid users list` | List UI usernames. |
| `wavegrid config set <k> <v>` | Update a project config field without re-`init` or editing JSON. Keys: `layout`/`preset` (a built-in preset id), `mode` (`auto`/`simple`/`distributed`), `port`, `host`, `ui-port`. |
| `wavegrid env export` | Write a `.env` for the current project (`--file` to override). |
| `wavegrid doctor` | Diagnose this laptop (env hijacks, ports, secrets, users, shard) and — if a server is reachable — the whole installation: connected receivers + shard coverage (gaps/overlaps). `--json` for scripting, `--server ws://host:port` to point at a remote server. |

Every command acts on the active project unless you pass `--project <name>`
(or set `WAVEGRID_PROJECT`).

### Secrets & setup are explicit and one-time

Secrets (`jwtSecret`, `receiverKey`) are generated **only** during `wavegrid init`
/ `wavegrid secrets init`, stored `0600` in the project. Runtime never invents or
defaults a secret: `wavegrid start` and the UI fail with an actionable error if a
required secret is missing. Re-running `init`/`secrets init` preserves existing
values unless `--force` is given.

### `wavegrid start`

Runs the server and receiver together in a single Node process. In **simple**
mode (auto-selected when the cannon count is under the single-laptop threshold)
this is the whole installation on one machine — LAN-only, no internet required.
In **distributed** mode it runs the same pair but the receiver shards via the
project's `receiver.shard` (`SHARD_START` / `SHARD_END`). The artist UI is a
separate app that reads the same store; it is not launched here.

### `wavegrid config` (or `wavegrid --print-config`)

Resolves the configuration and prints it with per-key provenance so it is obvious
which layer supplied each value (defaults → store → file → env → flags), plus a
set/unset status for each required secret. Secret values are never printed.

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
