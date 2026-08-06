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
}

export interface DiscoveredBrain {
  name: string;
  project: string;
  port: number;
  host: string;
  addresses: string[];
  deviceId: string | null;
  deviceName: string | null;
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
    deviceName: txtValue(service.txt, 'deviceName')
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
