import path from 'path';

import { projectDir, readJsonFile, type StorePaths, writeFileAtomic } from './paths';

/**
 * Project configuration synchronization (Phase D).
 *
 * Every device that joins a project eventually holds the WHOLE project: the
 * project-level config plus every device's device-scoped config. Edits are
 * mediated by the server (the authority): a device pushes a change, the server
 * assigns the next revision, persists it, and broadcasts the accepted revision
 * to everyone. Peer-to-peer merge (`mergeRemote`) is a fallback for when no
 * server is present.
 *
 * Conflict policy (deterministic, never a silent merge):
 *   The server assigns each accepted write a STRICTLY INCREASING revision, so
 *   the highest revision wins — last-writer-wins. Ties (only reachable via an
 *   offline peer merge that produced equal revisions) break by `updatedAt`
 *   timestamp, then by editing `deviceId` lexicographically. A client that
 *   edited from a stale base revision is still accepted (its write is newest)
 *   but flagged as divergent; divergence and lagging acknowledgements are
 *   surfaced by `wavegrid doctor`, never hidden.
 *
 * Simple installations pay nothing: a one-device project has one entry and one
 * ack, and none of this surfaces in the UI or CLI until a second device joins.
 */

/** Scope of a synchronized config entry: the project, or one device. */
export type SyncScope = string; // 'project' | `device:${deviceId}`

export function projectScope(): SyncScope {
  return 'project';
}
export function deviceScope(deviceId: string): SyncScope {
  return `device:${deviceId}`;
}

/** One revisioned config entry within a project. */
export interface SyncEntry {
  scope: SyncScope;
  /** Opaque config payload for this scope (project config or a device's config). */
  config: unknown;
  /** The project revision at which this entry was last accepted. */
  revision: number;
  updatedAt: string;
  /** Device that authored this entry (null for server-seeded/initial). */
  deviceId: string | null;
}

/** The full replicated, revisioned project document. */
export interface SyncState {
  version: 1;
  /** Monotonic project revision — the max revision across all entries. */
  revision: number;
  entries: Record<SyncScope, SyncEntry>;
  /** Per-device last acknowledged revision (for staleness/divergence checks). */
  acks: Record<string, number>;
}

/** A change a device submits. `baseRevision` is the revision it edited from. */
export interface ConfigUpdate {
  scope: SyncScope;
  config: unknown;
  deviceId: string | null;
  baseRevision?: number;
  /** Editing timestamp; defaults to now. Used only for offline tie-breaks. */
  timestamp?: string;
}

export interface ApplyResult {
  accepted: boolean;
  revision: number;
  entry: SyncEntry;
  /** True when the editor's baseRevision lagged the current project revision. */
  staleBase: boolean;
  state: SyncState;
}

function syncFile(paths: StorePaths, project: string): string {
  return path.join(projectDir(paths, project), 'sync.json');
}

function empty(): SyncState {
  return { version: 1, revision: 0, entries: {}, acks: {} };
}

export function readSyncState(paths: StorePaths, project: string): SyncState {
  const raw = readJsonFile<SyncState>(syncFile(paths, project));
  if (!raw || typeof raw !== 'object') return empty();
  return {
    version: 1,
    revision: typeof raw.revision === 'number' ? raw.revision : 0,
    entries: raw.entries && typeof raw.entries === 'object' ? raw.entries : {},
    acks: raw.acks && typeof raw.acks === 'object' ? raw.acks : {}
  };
}

function write(paths: StorePaths, project: string, state: SyncState): void {
  writeFileAtomic(syncFile(paths, project), JSON.stringify(state, null, 2) + '\n');
}

/**
 * Apply (accept) a config update. The server calls this while serializing
 * writes, so the returned revision is unique and strictly increasing. Returns
 * the accepted entry plus a `staleBase` flag when the editor lagged.
 */
export function applyUpdate(paths: StorePaths, project: string, update: ConfigUpdate): ApplyResult {
  if (!update.scope) throw new Error('A config update requires a scope.');
  const state = readSyncState(paths, project);
  const staleBase =
    typeof update.baseRevision === 'number' && update.baseRevision < state.revision;

  const revision = state.revision + 1;
  const entry: SyncEntry = {
    scope: update.scope,
    config: update.config,
    revision,
    updatedAt: update.timestamp ?? new Date().toISOString(),
    deviceId: update.deviceId ?? null
  };
  state.entries[update.scope] = entry;
  state.revision = revision;
  // The author has, by definition, the revision it just produced.
  if (update.deviceId) state.acks[update.deviceId] = revision;
  write(paths, project, state);
  return { accepted: true, revision, entry, staleBase, state };
}

/** Record that a device has applied up to `revision`. Never moves backwards. */
export function recordAck(paths: StorePaths, project: string, deviceId: string, revision: number): SyncState {
  const state = readSyncState(paths, project);
  const prev = state.acks[deviceId] ?? 0;
  if (revision > prev) {
    state.acks[deviceId] = revision;
    write(paths, project, state);
  }
  return state;
}

/**
 * Deterministically merge a peer's state into ours (server-less fallback).
 * Per scope, keep the winner by (revision, updatedAt, deviceId). Returns the
 * merged state and whether anything changed.
 */
export function mergeRemote(
  paths: StorePaths,
  project: string,
  remote: SyncState
): { state: SyncState; changed: boolean } {
  const state = readSyncState(paths, project);
  let changed = false;
  for (const [scope, incoming] of Object.entries(remote.entries ?? {})) {
    const current = state.entries[scope];
    if (!current || wins(incoming, current)) {
      state.entries[scope] = incoming;
      changed = true;
    }
  }
  if (changed) {
    state.revision = Math.max(
      state.revision,
      ...Object.values(state.entries).map((e) => e.revision)
    );
    write(paths, project, state);
  }
  return { state, changed };
}

/** Deterministic winner: higher revision, then newer timestamp, then higher deviceId. */
function wins(a: SyncEntry, b: SyncEntry): boolean {
  if (a.revision !== b.revision) return a.revision > b.revision;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt;
  return (a.deviceId ?? '') > (b.deviceId ?? '');
}

export interface DivergentDevice {
  deviceId: string;
  ackedRevision: number;
  behindBy: number;
}

/**
 * Devices that have NOT acknowledged the current revision. `knownDeviceIds`
 * (e.g. from the registry) lets us flag devices that never acked at all.
 */
export function divergentDevices(
  paths: StorePaths,
  project: string,
  knownDeviceIds: string[] = []
): DivergentDevice[] {
  const state = readSyncState(paths, project);
  const ids = new Set<string>([...knownDeviceIds, ...Object.keys(state.acks)]);
  const out: DivergentDevice[] = [];
  for (const id of ids) {
    const acked = state.acks[id] ?? 0;
    if (acked < state.revision) {
      out.push({ deviceId: id, ackedRevision: acked, behindBy: state.revision - acked });
    }
  }
  return out.sort((a, b) => b.behindBy - a.behindBy || a.deviceId.localeCompare(b.deviceId));
}
