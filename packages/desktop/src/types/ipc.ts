// Types shared across the IPC boundary (main ⇄ preload ⇄ renderer). These stay
// framework-neutral: no store objects, no secret values ever cross the wire.

export type RunMode = 'simple' | 'distributed' | 'auto';

export interface BrainStatus {
  running: boolean;
  /** Origin the embedded laser UI + API are served on, e.g. http://127.0.0.1:3000. */
  url: string | null;
  project: string | null;
  runMode: RunMode | null;
  /** LAN URLs receivers / iPads can point at while the brain is running. */
  lanUrls: string[];
}

export interface ProjectSummary {
  name: string;
  active: boolean;
}

export interface ShardRange {
  start: number;
  end: number;
}

/** A device that has joined a project — the project-scoped registry the CLI's
 *  `devices` commands show. Machine identity/IP are runtime facts, not exported. */
export interface DeviceInfo {
  id: string;
  name: string;
  hostname?: string;
  address?: string;
  lastSeen?: number;
  layout?: string;
  mode?: 'simple' | 'distributed';
  shard?: ShardRange | null;
}

export interface LaserBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LaserSyncState {
  /** Brain origin to load (http://127.0.0.1:PORT), or null to hide. */
  url: string | null;
  bounds: LaserBounds;
  visible: boolean;
}

export interface WavegridApi {
  brain: {
    status(): Promise<BrainStatus>;
    start(project: string): Promise<BrainStatus>;
    stop(): Promise<BrainStatus>;
    onStatus(cb: (status: BrainStatus) => void): () => void;
  };
  projects: {
    list(): Promise<ProjectSummary[]>;
    active(): Promise<string | null>;
    use(name: string): Promise<ProjectSummary[]>;
  };
  devices: {
    list(project: string): Promise<DeviceInfo[]>;
    rename(project: string, idOrName: string, newName: string): Promise<DeviceInfo[]>;
    assignShard(project: string, idOrName: string, shard: ShardRange | null): Promise<DeviceInfo[]>;
  };
}

export interface WavegridLaser {
  sync(state: LaserSyncState): void;
}

declare global {
  interface Window {
    wavegrid: WavegridApi;
    wavegridLaser: WavegridLaser;
  }
}
