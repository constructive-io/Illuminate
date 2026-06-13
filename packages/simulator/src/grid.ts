export interface CannonState {
  h: number; // hue 0–360
  s: number; // saturation 0–100
  b: number; // brightness 0–100
}

export interface CannonTarget extends CannonState {
  targetH: number;
  targetS: number;
  targetB: number;
}

export const NUM_CANNONS = 49;
export const GRID_SIZE = 7;

/**
 * Smoothing factor per tick (0–1).
 * Lower = smoother/slower transitions (more low-pass filtering).
 * At 60fps with alpha=0.08, a full transition takes ~1.5s to settle.
 */
export const DEFAULT_ALPHA = 0.08;

export function createGrid(): CannonTarget[] {
  return Array.from({ length: NUM_CANNONS }, () => ({
    h: 220,
    s: 90,
    b: 80,
    targetH: 220,
    targetS: 90,
    targetB: 80
  }));
}

/**
 * Exponential low-pass filter (lerp toward target).
 * Called once per animation frame to smoothly converge current → target.
 */
export function tickGrid(grid: CannonTarget[], alpha: number = DEFAULT_ALPHA): boolean {
  let changed = false;
  for (let i = 0; i < grid.length; i++) {
    const c = grid[i];
    const dh = angleDelta(c.h, c.targetH);
    const ds = c.targetS - c.s;
    const db = c.targetB - c.b;

    if (Math.abs(dh) > 0.5 || Math.abs(ds) > 0.5 || Math.abs(db) > 0.5) {
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
 * Shortest angular distance on the hue circle (handles wrap-around).
 */
function angleDelta(from: number, to: number): number {
  let d = ((to - from + 540) % 360) - 180;
  return d;
}

/**
 * Set target for a single cannon.
 * attack (0–1): how much of the new value to apply.
 *   1.0 = full (instant snap to new target)
 *   0.1 = soft (target blends 10% toward new value)
 */
export function setCannonTarget(grid: CannonTarget[], index: number, h?: number, s?: number, b?: number, attack: number = 1.0) {
  const c = grid[index];
  if (attack >= 1.0) {
    if (h !== undefined) c.targetH = h;
    if (s !== undefined) c.targetS = s;
    if (b !== undefined) c.targetB = b;
  } else {
    if (h !== undefined) {
      const dh = angleDelta(c.targetH, h);
      c.targetH = (c.targetH + dh * attack + 360) % 360;
    }
    if (s !== undefined) c.targetS = c.targetS + (s - c.targetS) * attack;
    if (b !== undefined) c.targetB = c.targetB + (b - c.targetB) * attack;
  }
}

export function setAllTargets(grid: CannonTarget[], h?: number, s?: number, b?: number, attack: number = 1.0) {
  for (let i = 0; i < grid.length; i++) {
    setCannonTarget(grid, i, h, s, b, attack);
  }
}
