/**
 * Layout — the single source of truth for where every cannon physically sits.
 *
 * Everything downstream (patterns, animations, scenes, the UI canvas, the 3D
 * viewer, OSC routing) reads geometry from a `Layout` instead of re-deriving it
 * from `(numCannons, gridColumns)`. A layout is plain, JSON-serializable data so
 * the server can resolve it once and broadcast it to every client over the wire.
 */

export type Topology = 'grid' | 'ring' | 'filledRing';

/**
 * A single cannon's position. `index` is the logical id used everywhere else
 * (OSC `logical`, WebSocket grid arrays, pattern `set(idx, …)`).
 */
export interface Fixture {
  /** Logical id, contiguous 0..count-1 in traversal order. */
  index: number;
  /** Normalized position within the bounding box, both in [0, 1]. */
  u: number;
  v: number;
  /** Centered world position (unitless, origin at the layout centroid). */
  x: number;
  y: number;
  /** Angle from the centroid, radians, atan2(y, x). */
  angle: number;
  /** Distance from the centroid, normalized so the outermost fixture is 1. */
  radius: number;
  /** Concentric ring index from the centroid (0 = innermost). */
  ring: number;
  /** Grid row when the layout has grid coordinates, else -1. */
  row: number;
  /** Grid column when the layout has grid coordinates, else -1. */
  col: number;
  /** Optional human-readable label (e.g. "A1"). */
  label: string;
}

export interface Layout {
  /** Stable id, e.g. "grid-7x7", "ring-6", "ring-25-filled". */
  id: string;
  /** Human-readable name. */
  name: string;
  topology: Topology;
  /** Number of logical cannons (=== fixtures.length). */
  count: number;
  /** Fixtures in logical order; `fixtures[i].index === i`. */
  fixtures: Fixture[];
  /** Bounding-grid width. 0 for pure rings. */
  cols: number;
  /** Bounding-grid height. 0 for pure rings. */
  rows: number;
  /**
   * True when fixtures carry meaningful grid `row`/`col` (grid & filledRing).
   * Grid-space transforms (rotate/flip, row/col animations) only apply here.
   */
  hasGridCoords: boolean;
  /** Fixture indices tracing the outer edge, in draw order. */
  perimeter: number[];
}

export type RunMode = 'simple' | 'distributed';

/** How a layout is described in a config file. */
export interface LayoutSpec {
  /** Reference a built-in preset by id (takes precedence over `kind`). */
  preset?: string;
  kind?: Topology;
  /** grid: number of columns. */
  cols?: number;
  /** grid: number of rows. */
  rows?: number;
  /** ring / filledRing: number of cannons. */
  count?: number;
  /** Override the generated id/name. */
  id?: string;
  name?: string;
}

export interface ServerConfig {
  host: string;
  port: number;
}

export interface UiConfig {
  port: number;
}

export interface WavegridConfig {
  layout: LayoutSpec;
  /**
   * 'auto' derives the run profile from the cannon count:
   * < `simpleModeMax` → 'simple' (one process, LAN-only, no sharding),
   * otherwise 'distributed'.
   */
  mode: 'auto' | RunMode;
  /** Cannon-count threshold below which 'auto' resolves to 'simple'. */
  simpleModeMax: number;
  server: ServerConfig;
  ui: UiConfig;
}
