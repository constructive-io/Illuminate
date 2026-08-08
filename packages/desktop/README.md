# @wavegrid/desktop

A thin **Electron** shell around the Wavegrid "one brain" runtime, with a
[Constructive Blocks](https://constructive-io.github.io/blocks/) admin UI
wrapping the **existing, untouched** laser UI (`@wavegrid/ui`).

This is Phase 0 + Phase 1 of the desktop plan
([constructive-planning#1466](https://github.com/constructive-io/constructive-planning/issues/1466)):
a runnable shell that starts the brain in-process, embeds the laser SPA, and
switches projects — all against the same `~/.wavegrid` store the CLI uses.

## Architecture

- **Main process** (`src/main.ts`, `src/main/*`) owns the privileged side: it
  opens the shared appstash store (`@wavegrid/settings` → `~/.wavegrid`),
  resolves config via `@wavegrid/layout` (confstash, `userStash: true`), and
  starts/stops the brain in-process (`@wavegrid/server` + `@wavegrid/receiver`).
  There is **no second server** — it is the same one-port HTTP + WebSocket brain
  the CLI runs.
- **Preload** (`src/preload.ts`) exposes one narrow, typed `window.wavegrid`
  bridge over `contextBridge`. The renderer never touches `fs`, the store, or
  secret values.
- **Renderer** (`src/renderer/*`) is React + Constructive Blocks
  (`@constructive/app-shell`). It renders the admin shell (project switcher,
  show controls). The laser UI is **not** re-implemented here — it is loaded
  byte-for-byte from the brain origin into a native `WebContentsView` overlaid
  on the Blocks layout (`src/main/laser-view.ts`).

### Shared store — Desktop ⇄ CLI parity

Desktop reuses `@wavegrid/settings` and `@wavegrid/layout` directly, so the
active project, config, secrets, users, and devices are the **same files** the
CLI reads and writes. No duplicate Desktop storage, no import step.

**Projects** can export a portable bundle and import one through native file
dialogs — the same `PortableProject` format as `wavegrid projects export/import`.
Secrets only travel when explicitly asked for (that file is a credential);
without them an import generates fresh ones and says so.

The **Output** route owns the project's `osc` block — BEYOND / FB4 / a routing
file / none, the same four targets as `wavegrid projects osc`. Switching kinds
leaves exactly one target behind, and a unified routing spec (authored with
`wavegrid projects routing`) is preserved, not overwritten.

**Devices** additionally browses the LAN over mDNS for running brains
(`@wavegrid/discovery`), so a receiver laptop can be pointed at one by copying
its `ws://` URL instead of hunting for an IP. Multicast is often blocked, so
scanning is explicit and an empty result is reported as such.

The **Settings** route shows where that store lives and offers *clear all* —
the same wipe as `wavegrid settings clear`, gated on typing `clear all`. It
stops the brain first, then removes every project, secret, user, access key,
session, device record, light map and log; secrets are generated once and are
not recoverable.

## Develop

The workspace libraries must be built first (Desktop consumes their `dist/`):

```bash
pnpm -r --filter '!@wavegrid/desktop' run build
```

Then, from this package:

```bash
pnpm start        # electron-forge start (dev)
pnpm run build    # typecheck (tsc --noEmit) — the CI check
pnpm run lint
```

## Packaging (later phase)

`pnpm run package` / `pnpm run make` build a distributable. Electron Forge
requires pnpm's hoisted node-linker for packaging:

```bash
pnpm config set node-linker hoisted   # affects the whole workspace install
```

This is intentionally **not** enabled repo-wide yet (it changes the monorepo's
install layout); packaging + auto-update is a dedicated later phase in the plan.
