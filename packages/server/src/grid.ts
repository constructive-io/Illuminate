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

/**
 * Smoothing factor per tick (0–1).
 * Lower = smoother/slower transitions (more low-pass filtering).
 * At 60fps with alpha=0.08, a full transition takes ~1.5s to settle.
 */
export const DEFAULT_ALPHA = 0.08;

export function createGrid(numCannons: number): CannonTarget[] {
  return Array.from({ length: numCannons }, () => ({
    h: 0,
    s: 0,
    b: 0,
    targetH: 0,
    targetS: 0,
    targetB: 0
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

/**
 * Hard-reset the entire grid — snaps BOTH current and target to the given
 * color instantly, bypassing the fade/lerp. Use when switching visual modes
 * to prevent old state from bleeding through.
 */
export function resetGrid(grid: CannonTarget[], h: number = 0, s: number = 0, b: number = 0) {
  for (let i = 0; i < grid.length; i++) {
    const c = grid[i];
    c.h = h;
    c.s = s;
    c.b = b;
    c.targetH = h;
    c.targetS = s;
    c.targetB = b;
  }
}

/**
 * Shift the entire grid by (dx, dy) cells, wrapping around edges.
 * Positive dx = shift right, positive dy = shift down.
 */
export function shiftGrid(grid: CannonTarget[], cols: number, rows: number, dx: number, dy: number): void {
  if (cols <= 0 || rows <= 0) return; // no grid coordinates (e.g. a ring)
  const snapshot = grid.map(c => ({ h: c.targetH, s: c.targetS, b: c.targetB }));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const srcR = ((r - dy) % rows + rows) % rows;
      const srcC = ((c - dx) % cols + cols) % cols;
      const srcIdx = srcR * cols + srcC;
      const dstIdx = r * cols + c;
      if (dstIdx >= grid.length || srcIdx >= grid.length) continue;
      const src = snapshot[srcIdx];
      grid[dstIdx].targetH = src.h;
      grid[dstIdx].targetS = src.s;
      grid[dstIdx].targetB = src.b;
      grid[dstIdx].h = src.h;
      grid[dstIdx].s = src.s;
      grid[dstIdx].b = src.b;
    }
  }
}

/**
 * Rotate the grid 90° in-place (CW or CCW).
 * Only works correctly for square grids (rows === columns).
 */
export function rotateGrid(grid: CannonTarget[], columns: number, direction: 'cw' | 'ccw'): void {
  const rows = Math.ceil(grid.length / columns);
  const snapshot = grid.map(c => ({ h: c.targetH, s: c.targetS, b: c.targetB }));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const oldIdx = r * columns + c;
      if (oldIdx >= grid.length) continue;
      const newIdx = direction === 'cw'
        ? c * columns + (rows - 1 - r)
        : (rows - 1 - c) * columns + r;
      if (newIdx >= grid.length) continue;
      const src = snapshot[oldIdx];
      grid[newIdx].targetH = src.h;
      grid[newIdx].targetS = src.s;
      grid[newIdx].targetB = src.b;
      grid[newIdx].h = src.h;
      grid[newIdx].s = src.s;
      grid[newIdx].b = src.b;
    }
  }
}

/**
 * Mirror the grid in-place (horizontal flips columns, vertical flips rows).
 */
export function mirrorGrid(grid: CannonTarget[], columns: number, axis: 'horizontal' | 'vertical'): void {
  const rows = Math.ceil(grid.length / columns);
  const snapshot = grid.map(c => ({ h: c.targetH, s: c.targetS, b: c.targetB }));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const oldIdx = r * columns + c;
      if (oldIdx >= grid.length) continue;
      const newIdx = axis === 'horizontal'
        ? r * columns + (columns - 1 - c)
        : (rows - 1 - r) * columns + c;
      if (newIdx >= grid.length) continue;
      const src = snapshot[oldIdx];
      grid[newIdx].targetH = src.h;
      grid[newIdx].targetS = src.s;
      grid[newIdx].targetB = src.b;
      grid[newIdx].h = src.h;
      grid[newIdx].s = src.s;
      grid[newIdx].b = src.b;
    }
  }
}

// ── Orientation transform ──────────────────────────────────────────────

export type Rotation = 0 | 90 | 180 | 270;

export interface Orientation {
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
}

export function defaultOrientation(): Orientation {
  return { rotation: 0, flipH: false, flipV: false };
}

/**
 * Map a UI grid index through the orientation transform to a server grid index.
 * UI sends index in its own coordinate space; we remap to the physical grid.
 */
export function mapUiToGrid(uiIndex: number, columns: number, rows: number, orient: Orientation): number {
  if (columns <= 0 || rows <= 0) return uiIndex; // ring/1D layouts have no grid transform
  let r = Math.floor(uiIndex / columns);
  let c = uiIndex % columns;

  // Apply flips first (in UI space)
  if (orient.flipH) c = columns - 1 - c;
  if (orient.flipV) r = rows - 1 - r;

  // Apply rotation (UI → grid)
  let gr: number, gc: number;
  switch (orient.rotation) {
  case 90:  gr = c;             gc = rows - 1 - r;    break;
  case 180: gr = rows - 1 - r;  gc = columns - 1 - c; break;
  case 270: gr = columns - 1 - c; gc = r;              break;
  default:  gr = r;              gc = c;               break;
  }

  const idx = gr * columns + gc;
  return idx >= 0 && idx < rows * columns ? idx : uiIndex;
}

/**
 * Map a server grid index back to UI coordinate space for broadcasts.
 */
export function mapGridToUi(gridIndex: number, columns: number, rows: number, orient: Orientation): number {
  if (columns <= 0 || rows <= 0) return gridIndex; // ring/1D layouts have no grid transform
  const gr = Math.floor(gridIndex / columns);
  const gc = gridIndex % columns;

  // Inverse rotation (grid → UI)
  let r: number, c: number;
  switch (orient.rotation) {
  case 90:  r = rows - 1 - gc;    c = gr;              break;
  case 180: r = rows - 1 - gr;    c = columns - 1 - gc; break;
  case 270: r = gc;                c = columns - 1 - gr; break;
  default:  r = gr;                c = gc;               break;
  }

  // Inverse flips
  if (orient.flipH) c = columns - 1 - c;
  if (orient.flipV) r = rows - 1 - r;

  const idx = r * columns + c;
  return idx >= 0 && idx < rows * columns ? idx : gridIndex;
}

/**
 * Remap an entire grid array from server order to UI order.
 */
export function remapGridForUi<T>(grid: T[], columns: number, rows: number, orient: Orientation): T[] {
  if (orient.rotation === 0 && !orient.flipH && !orient.flipV) return grid;
  const result = new Array<T>(grid.length);
  for (let gi = 0; gi < grid.length; gi++) {
    const uiIdx = mapGridToUi(gi, columns, rows, orient);
    result[uiIdx] = grid[gi];
  }
  return result;
}

export type BlendMode = 'replace' | 'multiply' | 'additive' | 'brighten';

/**
 * Composite an audio overlay onto the base grid.
 * Returns a new array — does NOT mutate the base grid.
 */
export function compositeLayer(
  base: CannonState[],
  overlay: CannonState[],
  blend: BlendMode
): CannonState[] {
  return base.map((c, i) => {
    const o = overlay[i];
    if (!o) return { h: c.h, s: c.s, b: c.b };
    switch (blend) {
    case 'brighten':
      return {
        h: c.h,
        s: c.s,
        b: Math.min(100, Math.max(c.b * 0.18, c.b * 0.25 + o.b * 0.9))
      };
    case 'multiply':
      return {
        h: (c.h + o.h * 0.3) % 360,
        s: Math.min(100, c.s * (0.5 + o.b / 200)),
        b: Math.min(100, c.b * (o.b / 80))
      };
    case 'additive':
      return {
        h: (c.h + o.h * 0.2) % 360,
        s: Math.min(100, Math.max(c.s, o.s)),
        b: Math.min(100, c.b + o.b * 0.4)
      };
    default: // replace
      return { h: o.h, s: o.s, b: o.b };
    }
  });
}
