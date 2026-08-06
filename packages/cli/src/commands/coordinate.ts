/**
 * Server-less coordinator election for `wavegrid receiver`.
 *
 * Normally a receiver dials a brain (`--server` or one discovered over mDNS).
 * When there is NO brain on the LAN — e.g. two laptops setting up pre-show —
 * the peers hold a tiny election so config sync still has an authority:
 * "someone is always the brain". Each peer advertises its candidacy, collects
 * the set, and the lowest deviceId wins and promotes itself to a *transient*
 * brain. The losers home to it through the ordinary discovery path. When a
 * dedicated `wavegrid server` later appears, the transient brain yields to it.
 *
 * This module owns only the decision/communication; the receiver command wires
 * the result into either a plain receiver (client) or a fused brain (coordinator).
 */
import {
  advertiseCandidacy,
  browse,
  browseCandidates,
  type DiscoveredBrain,
  electCoordinator,
  preferBrain} from '@wavegrid/discovery';

import { brainToWsUrl } from './receiver';

export interface CoordinateOptions {
  project: string;
  deviceId: string;
  /** How long to collect election candidates. Default 1500ms. */
  electionMs?: number;
  /** How many times to re-browse for the winner's brain before self-promoting. */
  homeRetries?: number;
  /** Per-attempt browse window when homing to the winner. Default 1500ms. */
  homeMs?: number;
}

export interface CoordinationResult {
  /** `coordinator` = promote self to a transient brain; `client` = dial `server`. */
  role: 'coordinator' | 'client';
  /** ws:// URL of the brain to dial (only when role is `client`). */
  server?: string;
}

/**
 * Run the election. Returns whether this device should become the coordinator
 * (transient brain) or connect to an already-elected one. Never throws —
 * discovery is best-effort, and a flaky-multicast timeout resolves to becoming
 * the coordinator so a receiver started alone still gets a working brain.
 */
export async function coordinate(opts: CoordinateOptions): Promise<CoordinationResult> {
  const { project, deviceId } = opts;
  const electionMs = opts.electionMs ?? 1500;

  // Stand for election: advertise candidacy while collecting peers' candidacies.
  const candidacy = advertiseCandidacy({ project, deviceId });
  let peerIds: string[];
  try {
    const peers = await browseCandidates(project, { timeoutMs: electionMs });
    peerIds = peers.map((p) => p.deviceId);
  } finally {
    candidacy.stop();
  }

  const winner = electCoordinator([deviceId, ...peerIds]);
  if (winner === deviceId) return { role: 'coordinator' };

  // A lower-id peer won — wait for its (transient) brain to come up, then home
  // to it. If it never appears (multicast dropped the winner), self-promote
  // rather than hang: better a working brain than none.
  const retries = opts.homeRetries ?? 3;
  const homeMs = opts.homeMs ?? 1500;
  for (let i = 0; i < retries; i++) {
    const brains = await browse({ timeoutMs: homeMs });
    const brain = pickProjectBrain(brains, project, deviceId);
    if (brain) return { role: 'client', server: brainToWsUrl(brain) };
  }
  return { role: 'coordinator' };
}

/** The brain to home to for `project`, excluding this device's own advertisement. */
export function pickProjectBrain(
  brains: DiscoveredBrain[],
  project: string,
  selfDeviceId: string
): DiscoveredBrain | null {
  return preferBrain(brains.filter((b) => b.project === project), selfDeviceId);
}
