# Light indexing: logical → physical → device → OSC zone

Reverse-engineered from `examples/routing-*.json`, `packages/osc/src/osc-adapters.ts`,
and `packages/receiver/src/{main,receiver,adapters}.ts`. This is the definitive
reference for how a light is numbered at each stage and where the numbering
"restarts at 0" — the thing that keeps confusing us.

## TL;DR

There are **four** distinct index spaces. They are easy to conflate because in a
simple one-laptop grid they happen to be identical (0,1,2,…). They diverge the
moment you split across machines or the physical wiring isn't in grid order.

| Stage | Space | Based | Who owns it |
|-------|-------|-------|-------------|
| 1. Logical grid index | `logical` | **0-based, global** (0…N-1) | animations, UI, server |
| 2. Physical light map | `physicalLights[logical] = physical` | 0-based, global | `light-map.json` (per project) |
| 3. Shard slice | output array re-based at `shard.start` | **0-based, per device** | receiver, distributed mode |
| 4. OSC target zone | `projectorIndex` (BEYOND) / `fb4Serial` (FB4) | **0-based, per target** | routing config |

**"Numbering starts from 0 on the second device"** is real and happens in *two*
independent places: the shard slice (stage 3) and the per-target `projectorIndex`
(stage 4). Both restart at 0 for each machine.

## Stage 1 — logical grid index (0-based, global)

The animation engine and UI address every fixture by a single global index
`0 … N-1`, assigned **row-major** for grids. For a 7×7:

```
A1..A7 = 0..6
B1..B7 = 7..13
...
G1..G7 = 42..48      (49 cannons → indices 0..48, NOT 1..49)
```

The `A1`/`G7` labels are 1-based cosmetic names; the index behind them is 0-based.
This is the source of the "0 through 49 vs 1 to 49" confusion — **software is
always 0..48**; only the labels and the raw hardware zone numbers look 1-based.

## Stage 2 — physical light map (`light-map.json`)

`physicalLights[logicalIndex] = physicalIndex` — a permutation over `0..N-1` that
reorders the *animation* order into the *wiring/output* order on a single device.
Used when the lasers aren't physically cabled in grid order. **Identity
(`physicalLights[i] = i`) is the default** — no `light-map.json` needs to exist for
a healthy install. The map is purely a *correction layer* for when hardware and
software drift out of sync, which is why it lives in the debug panel.

Normalized (dedup, range-check, identity back-fill) identically in the receiver
(`main.ts loadPhysicalLightMap`), the server (`/api/light-map`), and the desktop
debugger (`packages/desktop/src/main/light-map.ts normalizeLightMap`). All three
read/write the **same file**: `WG_STATE_DIR/light-map.json` (the per-project state
dir), so a correction saved in the UI is exactly what the running brain loads.

This is the *only* remap the desktop **Lights** panel currently visualizes. It does
**not** yet show stages 3–4 (the per-device re-basing), which is why the panel
"just lists 0..48".

## Stage 3 — shard slice (per-device, re-based to 0)

In distributed mode a receiver runs the full grid through the filter, then
`Receiver.getOutputState()` does:

```ts
return remapped.slice(shard.start, shard.end + 1);
```

So the output array handed to the OSC/WebSocket adapter is **re-based to 0**:
output index `0` = global logical `shard.start`. A receiver-to-receiver
(`WebSocketOutput` → downstream `WebSocketInput`) forwards this already-sliced,
0-based grid. That is why the second laptop sees its lights starting at 0 even
though they're globally logical 25..48, say.

## Stage 4 — OSC target zone (`projectorIndex`, per target, 0-based)

The routing config maps each cannon to a target machine + a per-target index:

```json
{ "logical": 3, "target": "pc2", "projectorIndex": 0, "label": "A4" }
```

`projectorIndex` **restarts at 0 for each `target`** (pc1: 0,1,2…; pc2: 0,1,2…).
BEYOND is addressed as `/beyond/zone/{projectorIndex}/livecontrol/...`
(`encodeBeyondMessages`). FB4 targets don't use an index at all — they're
addressed by serial: `/FB4-{fb4Serial}/color_red`.

## The historically "weird" part — scrambled vs sequential zones

`examples/` preserves the actual confusion from the 7×7 production install:

- `routing-production-hardware.json` — the zones **as physically installed**:
  `projectorIndex` is **1-based and scrambled** (pc1: 1..21, pc2: 1..28; logical 0 → zone 19).
- `routing-production.json` — the corrected map (commit `afab9bc`):
  `projectorIndex` re-indexed to **0-based sequential per PC** (pc1: 0..20, pc2: 0..27).
- `routing-production-2-unscrambled.json` — same fix for the second set of laptops.

So the "something weird": the physical BEYOND zone numbers were 1-based and not in
grid order, while everything in software is 0-based grid order. Bridging those two
is exactly what `projectorIndex` (stage 4) and, optionally, `physicalLights`
(stage 2) exist to do.

## Two distributed conventions — don't mix them

1. **Routing-config convention** (`-lead` / `-standalone` files): every PC runs the
   **full** grid (no `SHARD_START/END`). Each PC loads a routing config that maps
   only *its* cannons by **global** `logical` → its local `projectorIndex`; unmapped
   logicals are skipped (`if (projIndex === undefined) continue`).
2. **Shard-slice convention** (`SHARD_START/END`): the output is sliced and re-based
   to 0 (stage 3), pairing with an identity/0-based BEYOND map or a downstream
   receiver.

⚠️ Combining a shard slice (re-based grid) with a routing config keyed by **global**
`logical` double-rebases and misaddresses. Pick one convention per receiver.

## Don't hand-write either one — generate them

Both conventions above are hand-maintenance traps, so a project no longer carries
per-machine routing files. It carries **one unified spec** in global logical order
(`osc.routing` in the project config): targets, which target each global cannon
belongs to, and an explicit `zoneBase` (0 or 1). Zones are *not* authored.

Each laptop's file is generated from it (`@wavegrid/layout`'s
`generateDeviceRouting`), re-basing both index spaces at once:

| | authored (unified) | generated (device) |
|---|---|---|
| grid index | global `0…48` | `logical` = `global − shard.start` (stage 3) |
| BEYOND zone | — | `projectorIndex`, restarting at `zoneBase` per target (stage 4) |
| provenance | — | `globalLogical` + a `generated` block |

```
49 cannons, pc-a shard 0–24, pc-b shard 25–48
  pc-b: global 25 → { logical: 0, globalLogical: 25, projectorIndex: 0 }
```

The generator refuses rather than emitting a config that would light the wrong
fixture: overlapping shards, a gap nobody drives, a duplicate global index, an
unknown target, an FB4 cannon with no serial, two fixtures pinned to one zone —
and specifically **a device-local file fed back in as if it were global** (it
carries the `generated` block, so the double-rebase is caught, not silent).

A cannon may still pin `projectorIndex` in the unified spec, for rigs whose zone
list can't be renumbered (`routing-production-hardware.json` above); generation
then routes the other zones around the pin.

```bash
wavegrid projects routing import examples/routing-4x7-lead.json  # zones regenerated
wavegrid projects routing import ... --keep-zones                # zones as installed
wavegrid projects routing show                                   # per-device preview
wavegrid projects routing generate [--device pc-b]               # write the files
```

`wavegrid receiver` regenerates *this* laptop's file into the project state dir on
every start, so nothing is copied between machines. A one-laptop show is the
degenerate case — one device, no shard, zones `0…N-1` — and needs no spec at all:
`wavegrid projects osc` points it straight at BEYOND or FB4.
