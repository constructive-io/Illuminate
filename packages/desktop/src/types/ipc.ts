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

/** How a project's layout is chosen — a built-in preset id, or a generated
 *  shape (grid cols×rows, ring/filledRing count). Mirrors the CLI's LayoutSpec. */
export interface LayoutChoice {
  preset?: string;
  kind?: 'grid' | 'ring' | 'filledRing';
  cols?: number;
  rows?: number;
  count?: number;
}

/** Input for the create-project wizard. Main turns this into a ProjectConfig,
 *  creates the project, and generates its secrets once. */
export interface NewProjectInput {
  name: string;
  layout: LayoutChoice;
  mode: 'auto' | 'simple' | 'distributed';
  serverHost: string;
  serverPort: number;
  uiPort: number;
  simpleModeMax: number;
}

/** The flattened, editable view of a project's config the editor screen binds
 *  to. Fields the editor does not own (osc, sync, receiver.shard/lightMap,
 *  debug) are preserved untouched by main on save. */
export interface EditableConfig {
  layout: LayoutChoice;
  mode: 'auto' | 'simple' | 'distributed';
  simpleModeMax: number;
  serverHost: string;
  serverPort: number;
  uiPort: number;
  alpha: number;
  fallbackDelay: number;
  /** Resolved layout summary for display (name + cannon count). */
  layoutLabel: string;
  cannonCount: number;
}

/** A required project secret and whether it is currently set. Only the name,
 *  description, and presence flag ever cross IPC — never the secret value. */
export interface RequiredSecretInfo {
  name: string;
  description: string;
  set: boolean;
}

export interface ShardRange {
  start: number;
  end: number;
}

/** One fixture in the light-map debugger — the full mapping chain for a cannon:
 *  animation logical index → physical light → position → driving device → OSC. */
export interface FixtureRow {
  /** Logical id the animations address (0..count-1). */
  logical: number;
  /** Physical light this logical index is wired to (`physicalLights[logical]`). */
  physical: number;
  /** Fixture label from the layout (e.g. "A1"). */
  label: string;
  /** Grid "row R, col C" or ring "…°" position, phrased for the topology. */
  position: string;
  /** Normalized canvas position within the bounding box, both in [0, 1]. */
  u: number;
  v: number;
  /** Name of the device whose shard drives this fixture, or null (all/none). */
  shardOwner: string | null;
  /** Output index within the owning device's shard (logical − shard.start),
   *  re-based to 0 — the "second device starts from zero" number. null when
   *  no shard owns it (a single device drives every fixture). */
  localIndex: number | null;
  /** Human-readable OSC destination (BEYOND/FB4/routing/console). */
  oscTarget: string;
  /** True when physical ≠ logical — an explicit correction, not the default. */
  corrected: boolean;
}

/** A deterministic auto-map heuristic offered for a layout. */
export interface AutoMapStrategyInfo {
  id: string;
  label: string;
  description: string;
}

/** The whole light-map debugger view for a project. `physicalLights` is the raw
 *  normalized mapping the editor mutates; `rows` is the resolved per-fixture view. */
export interface LightMapView {
  project: string;
  layoutName: string;
  topology: 'grid' | 'ring' | 'filledRing';
  numCannons: number;
  gridColumns: number;
  physicalLights: number[];
  rows: FixtureRow[];
  /** True when the map is pure identity — no correction file needed. */
  identity: boolean;
  /** Deterministic auto-map candidates valid for this layout. */
  strategies: AutoMapStrategyInfo[];
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
    presets(): Promise<string[]>;
    create(input: NewProjectInput): Promise<ProjectSummary[]>;
    remove(name: string): Promise<ProjectSummary[]>;
    getConfig(project: string): Promise<EditableConfig | null>;
    saveConfig(project: string, config: EditableConfig): Promise<EditableConfig | null>;
  };
  users: {
    list(project: string): Promise<string[]>;
    add(project: string, username: string, password: string): Promise<string[]>;
    remove(project: string, username: string): Promise<string[]>;
  };
  secrets: {
    status(project: string): Promise<RequiredSecretInfo[]>;
    /** Generate missing secrets (or rotate all with force). Returns the updated
     *  status; secret values are never returned. */
    generate(project: string, force: boolean): Promise<RequiredSecretInfo[]>;
  };
  devices: {
    list(project: string): Promise<DeviceInfo[]>;
    rename(project: string, idOrName: string, newName: string): Promise<DeviceInfo[]>;
    assignShard(project: string, idOrName: string, shard: ShardRange | null): Promise<DeviceInfo[]>;
  };
  lights: {
    /** Resolve the full mapping-chain view for a project. */
    view(project: string): Promise<LightMapView | null>;
    /** Persist a new physical mapping (normalized) and return the fresh view. */
    remap(project: string, physicalLights: number[]): Promise<LightMapView | null>;
    /** Build (but do not save) a candidate map from a deterministic heuristic. */
    autoMap(project: string, strategyId: string): Promise<number[] | null>;
    /** Flash one physical light on the running rig so the operator can see which
     *  fixture it is. Returns true if the brain for this project was driving it. */
    identify(project: string, physicalIndex: number): Promise<boolean>;
    /** Clear any active identify flash. */
    identifyClear(project: string): Promise<void>;
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
