---
name: wavegrid-distributed-show
description: Run a Wavegrid installation across multiple laptops — one brain (server + UI) plus shard-aware receiver machines. Covers device identity, mDNS discovery, self-registration, naming devices, provisioning new laptops, project export/import, config sync, and doctor diagnostics. Use for multi-machine shows (typically 40+ cannons or hardware split across machines).
---

# Wavegrid · Distributed Show (multiple laptops)

## Overview

The distributed case: one laptop is the **brain** (server + UI + API + WebSocket, one port) and N laptops are **receivers**, each driving its shard of the cannons. Nobody runs `start` here — `start` is the fused single-laptop convenience. Distributed shows run the two halves explicitly.

Core rules that make this sane:

- **Projects are portable; devices are not.** A project export carries config, layout, secrets, and users — never device identity. Every machine keeps its own locally-generated identity (`~/.wavegrid/device.json`: uuid + friendly name) and **registers itself with its own IP** when it joins, so imports can never confuse two machines.
- **Every device carries the whole project** — including the device-scoped configs of *all* other devices (shards, light-maps, OSC targets). Any laptop can view or edit any device's config; sync brings everyone to the same complete picture.
- **The server is the sync authority when present.** Edits push to the server, which bumps the project revision and broadcasts; peers pull. Peer-to-peer sync is the fallback when no server is running. Highest rev wins; `doctor` flags divergence — never a silent merge.

> **Implementation status:** this skill documents the target model from
> [constructive-planning#1465](https://github.com/constructive-io/constructive-planning/issues/1465).
> Shipped today: sharded receivers over WS (`SHARD_START`/`SHARD_END`), shared `receiverKey` auth, receiver `hello`, and the `doctor` system view with coverage.
> Landing with the plan: `wavegrid server` / `wavegrid receiver` commands, mDNS discovery, device identity/registry/naming, `projects export/import`, and config sync (workstreams B–F).

## The flow

**Host laptop (the brain + the screen):**
```sh
wavegrid projects use bigshow
wavegrid server            # server + UI + WS + API on one port
                           # prints every LAN address it's bound on:
                           #   → ws://192.168.1.42:3333
                           # advertises _wavegrid._tcp via mDNS
```
Operators/iPads open `http://<host-ip>:<port>` and paint. The brain drives no cannons itself.

**Each receiver laptop:**
```sh
wavegrid projects import show.wgproj   # if the project isn't on this machine yet
wavegrid receiver                      # discovers the server via mDNS, connects,
                                       # authenticates with the project receiverKey,
                                       # self-registers (deviceId, name, IP, shard)
```
Explicit override for multicast-blocked networks: `wavegrid receiver --server ws://192.168.1.42:3333 --shard 0-24`.

**At showtime:** operator paints → UI → server `broadcastCommand()` → every receiver filters to its shard → OSC to its hardware.

## Devices: identity, naming, management

Each machine generates `~/.wavegrid/device.json` once (uuid + hostname-derived name). Users name the devices that are part of a project — "device one", "stage left" — at first join (graceful prompt) or later:

```sh
wavegrid devices list                    # name, id, IP, shard, version, online/offline
wavegrid devices rename <device> "stage left"
wavegrid devices assign <device> --shard 0-24    # persist shard assignment in the project
wavegrid devices forget <device>
```

The registry lives in project state on the server and survives restarts. Never copy `device.json` between machines.

## Provisioning a new laptop

```sh
npm i -g @wavegrid/cli
wavegrid projects import show.wgproj   # config + layout + secrets + users — no device identity
wavegrid receiver                      # discovers, joins, self-registers with its own IP
```
Zero hand-typed IPs, zero copied identity. Create the bundle on any existing machine: `wavegrid projects export bigshow --file show.wgproj` (add `--no-secrets` to move secrets out-of-band).

## Config sync

The project doc is versioned (`rev` + `updatedAt` + `updatedBy` device). With sync enabled, editing any config — including another device's light-map or shard — propagates: push to server → rev bump → broadcast → peers pull. Scrambled a lighting config five minutes before doors? Fix it on whichever laptop is closest; every machine converges. Secrets sync only over the authenticated WS and only when explicitly enabled; the default is secrets move via export bundles.

## Verifying the installation

```sh
wavegrid doctor
```
The system view shows: server version/layout/port/uptime, every connected device (name, IP, shard, version), **shard coverage with gaps/overlaps** (e.g. "cannons 25–49 unclaimed"), layout/version skew between machines, LAN discovery results, and sync divergence. Run it on the host before doors open — coverage must show no gaps.

## Troubleshooting

| Symptom | Cause → fix |
|---|---|
| Receiver can't find the server | Multicast blocked on the venue Wi-Fi → `--server ws://<host-ip>:<port>` (the server banner prints its addresses). |
| Receiver connects then rejects | `receiverKey` mismatch — the laptop's project is stale. Re-import the bundle or sync. |
| Coverage gap in doctor | A laptop's shard assignment is wrong/missing → `wavegrid devices assign`. |
| Two machines fight over the same cannons | Overlapping shards — doctor flags the overlap; fix assignments. |
| Layout/version skew warning | One laptop has an old project or CLI version → sync/import, `npm i -g @wavegrid/cli`. |
| Same device listed twice | `device.json` was copied between machines. Delete it on the clone; it regenerates and re-registers. |

## Devin Secrets Needed

None — the shared `receiverKey` travels inside project export bundles, generated at project creation.
