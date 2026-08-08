# @wavegrid/doctor

Wavegrid diagnostics, collected as data.

`collectDiagnostics()` runs every this-laptop check (store writability, device
identity, layout/shard sanity, secrets and their file mode, UI users, OSC
target, ambient env footguns) and — when a brain is reachable — reads that
brain's own `system_status` for connected receivers, shard coverage, and
config-sync divergence.

`wavegrid doctor` renders the result to a terminal; the desktop app renders the
same snapshot as a live status screen. One implementation, so the two can never
disagree about whether the rig is healthy.

```ts
import { collectDiagnostics } from '@wavegrid/doctor';

const diag = await collectDiagnostics({ store, project, resolved });
diag.overall; // 'pass' | 'warn' | 'fail'
```
