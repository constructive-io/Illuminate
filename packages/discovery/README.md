# @wavegrid/discovery

<p align="center" width="100%">
  <img height="250" src="https://raw.githubusercontent.com/constructive-io/constructive/refs/heads/main/assets/outline-logo.svg" />
</p>

Zero-config LAN discovery for Wavegrid brains. A running brain advertises itself
as an mDNS `_wavegrid._tcp` service (project + port + device identity in the TXT
record); receiver laptops browse for it so `wavegrid receiver` can find the
brain with no IP typing.

Everything here is **best-effort**: multicast is often blocked on locked-down or
virtualized networks, so `advertise`/`browse` never throw — they degrade to a
no-op or an empty list, and the explicit `--server ws://host:port` flag always
remains the reliable override.

```ts
import { advertise, browse } from '@wavegrid/discovery';

// brain side
const ad = advertise({ port: 3333, project: 'bigshow', deviceId, deviceName });
// ... later
ad.stop();

// receiver side
const brains = await browse({ timeoutMs: 2000 });
```
