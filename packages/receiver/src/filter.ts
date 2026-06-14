/**
 * Independent low-pass filter for the receiver.
 *
 * This is separate from the simulator's filter — the receiver runs its own
 * smoothing so that even if the upstream connection drops mid-transition,
 * the output to hardware never jolts.
 */

export interface CannonState {
  h: number; // hue 0–360
  s: number; // saturation 0–100
  b: number; // brightness 0–100
}

export interface FilteredCannon extends CannonState {
  targetH: number;
  targetS: number;
  targetB: number;
}

export const DEFAULT_NUM_CANNONS = 49;
export const DEFAULT_GRID_COLUMNS = 7;

export const DEFAULT_RECEIVER_ALPHA = 0.06;

/**
 * Create a filtered grid of the given size.
 * Defaults to 49 cannons for the 7×7 Civic Center installation.
 */
export function createFilteredGrid(numCannons: number = DEFAULT_NUM_CANNONS): FilteredCannon[] {
  return Array.from({ length: numCannons }, () => ({
    h: 220,
    s: 90,
    b: 80,
    targetH: 220,
    targetS: 90,
    targetB: 80
  }));
}

/**
 * Shortest angular distance on the hue circle.
 */
export function angleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/**
 * Single tick of exponential low-pass interpolation.
 * Returns true if any cannon changed (i.e., output is still settling).
 */
export function tickFilter(
  grid: FilteredCannon[],
  alpha: number = DEFAULT_RECEIVER_ALPHA
): boolean {
  let changed = false;
  for (let i = 0; i < grid.length; i++) {
    const c = grid[i];
    const dh = angleDelta(c.h, c.targetH);
    const ds = c.targetS - c.s;
    const db = c.targetB - c.b;

    if (Math.abs(dh) > 0.3 || Math.abs(ds) > 0.3 || Math.abs(db) > 0.3) {
      c.h = (c.h + dh * alpha + 360) % 360;
      c.s = c.s + ds * alpha;
      c.b = c.b + db * alpha;
      changed = true;
    } else {
      c.h = c.targetH;
      c.s = c.targetS;
      c.b = c.targetB;
    }
  }
  return changed;
}

/**
 * Set the target state for all cannons from an upstream state snapshot.
 * The filter will smoothly converge to these values.
 */
export function applyUpstreamState(
  grid: FilteredCannon[],
  upstream: CannonState[]
) {
  for (let i = 0; i < Math.min(grid.length, upstream.length); i++) {
    grid[i].targetH = upstream[i].h;
    grid[i].targetS = upstream[i].s;
    grid[i].targetB = upstream[i].b;
  }
}
