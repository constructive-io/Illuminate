/**
 * Zero-config LAN discovery for Wavegrid brains.
 *
 * A running brain (`wavegrid server` / `wavegrid start`) advertises itself as an
 * mDNS `_wavegrid._tcp` service carrying the project name and port in its TXT
 * record. Receiver laptops browse for it so `wavegrid receiver` can find the
 * brain with no IP typing.
 *
 * Everything here is BEST-EFFORT: multicast is often blocked on locked-down or
 * virtualized networks, so advertise/browse never throw — they degrade to a
 * no-op (advertise) or an empty list (browse), and the explicit `--server`
 * flag always remains the reliable override.
 */
import { Bonjour, Service } from 'bonjour-service';

/** A discovered mDNS service (bonjour `Service` instance shape). */
type ServiceRecord = InstanceType<typeof Service>;

/** mDNS service type (published/browsed as `_wavegrid._tcp`). */
export const SERVICE_TYPE = 'wavegrid';

export interface BrainAdvertisement {
  /** Human-readable service name (defaults to `Wavegrid <project>`). */
  name?: string;
  port: number;
  project: string;
  deviceId: string;
  deviceName: string;
  /**
   * A transient brain is a receiver that promoted itself as coordinator because
   * no dedicated `wavegrid server` was on the LAN. It advertises so peers can
   * home to it, but yields to a dedicated brain the moment one appears.
   */
  transient?: boolean;
}

export interface DiscoveredBrain {
  name: string;
  project: string;
  port: number;
  host: string;
  addresses: string[];
  deviceId: string | null;
  deviceName: string | null;
  /** True when this brain is a self-promoted coordinator (see BrainAdvertisement). */
  transient: boolean;
}

export interface AdvertiseHandle {
  stop: () => void;
}

/** TXT record carried by the advertisement. All values are strings on the wire. */
export function buildTxt(ad: BrainAdvertisement): Record<string, string> {
  return {
    project: ad.project,
    deviceId: ad.deviceId,
    deviceName: ad.deviceName,
    transient: ad.transient ? '1' : '0',
    v: '1'
  };
}

function txtValue(txt: unknown, key: string): string | null {
  if (!txt || typeof txt !== 'object') return null;
  const v = (txt as Record<string, unknown>)[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Convert a raw bonjour service into a DiscoveredBrain, or null if it isn't ours. */
export function parseService(service: ServiceRecord): DiscoveredBrain | null {
  const project = txtValue(service.txt, 'project');
  if (!project) return null;
  const addresses = Array.isArray(service.addresses)
    ? service.addresses.filter((a): a is string => typeof a === 'string' && a.includes('.'))
    : [];
  return {
    name: service.name || `Wavegrid ${project}`,
    project,
    port: service.port,
    host: service.host || addresses[0] || '',
    addresses,
    deviceId: txtValue(service.txt, 'deviceId'),
    deviceName: txtValue(service.txt, 'deviceName'),
    transient: txtValue(service.txt, 'transient') === '1'
  };
}

/** Advertise this brain on the LAN. Never throws; returns a no-op handle on failure. */
export function advertise(ad: BrainAdvertisement): AdvertiseHandle {
  try {
    const bonjour = new Bonjour();
    const service = bonjour.publish({
      name: ad.name || `Wavegrid ${ad.project}`,
      type: SERVICE_TYPE,
      port: ad.port,
      txt: buildTxt(ad)
    });
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          service.stop?.(() => bonjour.destroy());
        } catch {
          try { bonjour.destroy(); } catch { /* best effort */ }
        }
      }
    };
  } catch {
    return { stop: () => {} };
  }
}

export interface BrowseOptions {
  /** How long to collect responses before resolving. Default 2000ms. */
  timeoutMs?: number;
}

/**
 * Browse the LAN for advertised brains for `timeoutMs`, then resolve with the
 * unique set found (deduped by host:port). Never rejects — resolves `[]` if
 * multicast is unavailable.
 */
export function browse(opts: BrowseOptions = {}): Promise<DiscoveredBrain[]> {
  const timeoutMs = opts.timeoutMs ?? 2000;
  return new Promise((resolveP) => {
    let bonjour: InstanceType<typeof Bonjour>;
    try {
      bonjour = new Bonjour();
    } catch {
      resolveP([]);
      return;
    }
    const found = new Map<string, DiscoveredBrain>();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { browser.stop(); } catch { /* best effort */ }
      try { bonjour.destroy(); } catch { /* best effort */ }
      resolveP([...found.values()]);
    };
    const browser = bonjour.find({ type: SERVICE_TYPE }, (service: ServiceRecord) => {
      const brain = parseService(service);
      if (brain) found.set(`${brain.host}:${brain.port}`, brain);
    });
    setTimeout(finish, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// Coordinator election (server-less fallback)
//
// When a receiver finds no brain on the LAN, the peers hold a tiny election so
// that "someone is always the brain": each candidate advertises a lightweight
// `_wavegrid-elect._tcp` record carrying its deviceId, everyone collects the
// set, and the lowest deviceId wins and promotes itself to a (transient) brain.
// The losers then home to it through the ordinary brain discovery path — so the
// election adds exactly one new mechanism and reuses everything else.
// ---------------------------------------------------------------------------

/** mDNS service type used only for coordinator election candidacy. */
export const ELECTION_TYPE = 'wavegrid-elect';

/** A peer standing in the election (self included). */
export interface Candidate {
  project: string;
  deviceId: string;
}

/**
 * The deterministic winner of an election: the lexicographically smallest
 * deviceId. deviceIds are stable machine-local UUIDs, so every peer computes
 * the same winner from the same candidate set — no coordination protocol.
 * Returns null for an empty set.
 */
export function electCoordinator(candidateIds: string[]): string | null {
  let winner: string | null = null;
  for (const id of candidateIds) {
    if (!id) continue;
    if (winner === null || id < winner) winner = id;
  }
  return winner;
}

/**
 * Given the brains visible on the LAN, pick the one this device should home to,
 * or null to (re)stand for election. A dedicated brain always beats a transient
 * coordinator; among equals the lowest deviceId wins. The device's own brain
 * advertisement (`selfDeviceId`) is never chosen.
 */
export function preferBrain(brains: DiscoveredBrain[], selfDeviceId: string): DiscoveredBrain | null {
  const others = brains.filter((b) => b.deviceId !== selfDeviceId);
  if (others.length === 0) return null;
  const rank = (b: DiscoveredBrain): number => (b.transient ? 1 : 0); // dedicated (0) before transient (1)
  return [...others].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return (a.deviceId ?? '').localeCompare(b.deviceId ?? '');
  })[0];
}

/** Advertise this device as an election candidate. Best-effort; never throws. */
export function advertiseCandidacy(candidate: Candidate): AdvertiseHandle {
  try {
    const bonjour = new Bonjour();
    // The port is irrelevant for a candidacy record — only the TXT matters —
    // but bonjour requires one, so use a fixed placeholder.
    const service = bonjour.publish({
      name: `wavegrid-elect ${candidate.project} ${candidate.deviceId}`,
      type: ELECTION_TYPE,
      port: 1,
      txt: { project: candidate.project, deviceId: candidate.deviceId, v: '1' }
    });
    let stopped = false;
    return {
      stop: () => {
        if (stopped) return;
        stopped = true;
        try {
          service.stop?.(() => bonjour.destroy());
        } catch {
          try { bonjour.destroy(); } catch { /* best effort */ }
        }
      }
    };
  } catch {
    return { stop: () => {} };
  }
}

/**
 * Browse the LAN for election candidates of `project` for `timeoutMs`, deduped
 * by deviceId. Never rejects — resolves `[]` if multicast is unavailable.
 */
export function browseCandidates(project: string, opts: BrowseOptions = {}): Promise<Candidate[]> {
  const timeoutMs = opts.timeoutMs ?? 1500;
  return new Promise((resolveP) => {
    let bonjour: InstanceType<typeof Bonjour>;
    try {
      bonjour = new Bonjour();
    } catch {
      resolveP([]);
      return;
    }
    const found = new Map<string, Candidate>();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { browser.stop(); } catch { /* best effort */ }
      try { bonjour.destroy(); } catch { /* best effort */ }
      resolveP([...found.values()]);
    };
    const browser = bonjour.find({ type: ELECTION_TYPE }, (service: ServiceRecord) => {
      const p = txtValue(service.txt, 'project');
      const deviceId = txtValue(service.txt, 'deviceId');
      if (p === project && deviceId) found.set(deviceId, { project: p, deviceId });
    });
    setTimeout(finish, timeoutMs);
  });
}
