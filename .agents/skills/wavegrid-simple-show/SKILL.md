---
name: wavegrid-simple-show
description: Run a complete Wavegrid installation on one laptop — server, UI, and receiver in a single process from the CLI. Covers install, project creation, users, start, doctor, and troubleshooting. Use for any single-machine show (a handful up to ~40 cannons).
---

# Wavegrid · Simple Show (one laptop)

## Overview

The simple case: one laptop runs **everything** — the server (state engine), the artist UI, and the receiver (the brain that drives hardware) — as a single process on the local Wi-Fi, no internet required. This is the golden path for small installations (a 6-cannon ring, a 7×2 wall, a filled 25 circle).

Everything comes from the centralized appstash store (`~/.wavegrid`). There are no local config files, no `.env` to hand-edit, no plaintext user lists. If a value matters, a `wavegrid` command reads or writes it.

**Simple stays simple.** The whole show is two commands (`projects create` → `start`). Device identity, discovery, registries, and config sync exist for distributed shows (see the `wavegrid-distributed-show` skill) but are invisible here — they only activate when a second device joins. No distributed feature may add a prompt or a step to this path.

> **Implementation status:** the unified brain (UI served by the server on the same port) and the explicit `wavegrid server` / `wavegrid receiver` commands land with
> [constructive-planning#1465](https://github.com/constructive-io/constructive-planning/issues/1465) (workstreams A–B).
> Until that ships, the UI is a separate Next.js service (`pnpm start:ui`). Everything else below is current.

## The whole flow

```sh
npm i -g @wavegrid/cli            # ships server + receiver + UI

wavegrid projects create ring-demo   # pick preset (ring-6, grid-7x7, …) + mode
                                     # generates jwtSecret + receiverKey ONCE (0600)
wavegrid projects users add admin    # UI login (scrypt-hashed, stored centrally)
wavegrid start                       # brain (server+UI+API+WS) + receiver, ONE process
```

Open `http://<laptop-ip>:<port>` (port from `wavegrid projects config`, default 3000) from any device on the venue Wi-Fi — iPads included. Log in with the user you added. The status dot top-left must be green.

`Ctrl-C` stops everything.

## What `start` actually does

1. Resolves the **active project** from the store (or `--project <name>`).
2. Loads config: store project config → defaults → `WAVEGRID_*` env (namespaced only — a stray `PORT` in your shell can never hijack it).
3. Injects secrets from the store: `WG_RECEIVER_KEY` (env may override — it's shared in distributed mode) and `WG_JWT_SECRET` (store **always** wins, so UI and server can never desync).
4. Boots the server (UI + `/api/*` + WebSocket on one port) and the receiver in-process. Run mode `auto` resolves simple vs distributed from the layout's cannon count (`simpleModeMax`, default 40).
5. State and logs go to the store: `~/.wavegrid/data/projects/<name>/state/`, `~/.wavegrid/logs/<name>/`.

## Everyday commands

```sh
wavegrid                          # interactive menu — every layer prompts
wavegrid projects list            # all projects, active marked
wavegrid projects use <name>      # switch shows
wavegrid projects config          # resolved config + provenance (secrets masked)
wavegrid projects config set layout ring-6   # fix the physical layout
wavegrid projects config set port 3333       # change the port
wavegrid projects secrets list    # which secrets exist (never prints values)
wavegrid projects users list      # UI logins (admin vs operator)
wavegrid projects guest new       # mint ONE shared passphrase to hand out (printed once)
wavegrid doctor                   # diagnose everything (see below)
```

**Roles & shared guest access.** Every UI login has a role: the first user in a
project is an **admin** (manages users, roles, sessions, secrets); later ones
default to **operator** (drive the show only). For a "public password" everyone
can share, use **guest access** instead of a real account: `wavegrid projects
guest new` mints one shared passphrase — anyone who signs in with it becomes an
**operator**, never an admin. It's printed once (only a hash is stored); rotate
to invalidate it, `guest disable` to pause it, `guest rm` to remove it. In the
desktop app this lives under **Access → Guest access**. The shared receiver key
is unrelated and never grants admin.

The project **name is just a label** — the physical shape comes from `layout.preset`. If the canvas shows a grid when you expected a ring, set the preset.

## Doctor

`wavegrid doctor` is the first move for any problem. Local checks: Node, store perms, project, layout, shard, secrets (0600), users, state/logs dirs, OSC target, ambient env hijacks. If the server is up it adds the system view: server version/layout/uptime, connected receivers + UI count, shard coverage with gaps/overlaps.

```sh
wavegrid doctor           # human output
wavegrid doctor --json    # for scripts
```

## Hardware output

Console-only until an OSC target is set (safe to run with no hardware):

```sh
wavegrid projects config set   # osc.beyond / osc.fb4 / osc.routingConfig
```

`ROUTING_CONFIG` (multi-BEYOND routing) and `BEYOND_HOST` are mutually exclusive.

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `EADDRINUSE` on start | Something else on the configured port (macOS AirPlay squats :5000). `wavegrid projects config set port 3333`. |
| Red status dot in UI | Server not reachable at the UI's origin, or (pre-#1465 two-service setup) a stale `WG_JWT_SECRET` / `.env` desyncing the JWT. The store is authoritative for the JWT on both sides — remove ambient overrides, `wavegrid doctor`. |
| "invalid username or password" | Wrong active project or credential typo. `wavegrid projects users list`, re-add the user. |
| Canvas shows the wrong shape | Label ≠ layout. `wavegrid projects config set layout <preset>`. |
| `doctor` warns "no OSC target" | Expected without hardware; receiver logs to console. |

## Devin Secrets Needed

None — everything is generated locally into the store at project creation.
