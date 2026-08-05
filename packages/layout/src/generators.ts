import { Fixture, Layout, Topology } from './types';

interface RawFixture {
  x: number;
  y: number;
  row: number;
  col: number;
  label: string;
}

interface FinalizeMeta {
  id: string;
  name: string;
  topology: Topology;
  cols: number;
  rows: number;
  hasGridCoords: boolean;
  perimeter: number[];
}

/**
 * Turn raw (x, y, row, col) fixtures into a finished Layout: normalize u/v to
 * the bounding box, compute polar angle/radius from the centroid, and bin a
 * concentric ring index. Fixtures are assumed to already be in logical order.
 */
function finalize(raw: RawFixture[], meta: FinalizeMeta): Layout {
  const n = raw.length;
  const xs = raw.map(f => f.x);
  const ys = raw.map(f => f.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  const dists = raw.map(f => Math.hypot(f.x, f.y));
  const maxDist = Math.max(...dists) || 1;

  const fixtures: Fixture[] = raw.map((f, i) => ({
    index: i,
    u: (f.x - minX) / spanX,
    v: (f.y - minY) / spanY,
    x: f.x,
    y: f.y,
    angle: Math.atan2(f.y, f.x),
    radius: dists[i] / maxDist,
    ring: Math.round(dists[i]),
    row: f.row,
    col: f.col,
    label: f.label
  }));

  return {
    id: meta.id,
    name: meta.name,
    topology: meta.topology,
    count: n,
    fixtures,
    cols: meta.cols,
    rows: meta.rows,
    hasGridCoords: meta.hasGridCoords,
    perimeter: meta.perimeter
  };
}

/** Border walk of a cols×rows grid, clockwise from the top-left. */
function gridPerimeter(cols: number, rows: number): number[] {
  if (rows === 1) return Array.from({ length: cols }, (_, c) => c);
  if (cols === 1) return Array.from({ length: rows }, (_, r) => r);
  const out: number[] = [];
  for (let c = 0; c < cols; c++) out.push(c);
  for (let r = 1; r < rows; r++) out.push(r * cols + (cols - 1));
  for (let c = cols - 2; c >= 0; c--) out.push((rows - 1) * cols + c);
  for (let r = rows - 2; r >= 1; r--) out.push(r * cols);
  return out;
}

export interface GridParams {
  cols: number;
  rows: number;
  id?: string;
  name?: string;
}

export function gridLayout({ cols, rows, id, name }: GridParams): Layout {
  if (cols < 1 || rows < 1) throw new Error('gridLayout requires cols >= 1 and rows >= 1');
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const raw: RawFixture[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      raw.push({ x: c - cx, y: r - cy, row: r, col: c, label: `${r}:${c}` });
    }
  }
  return finalize(raw, {
    id: id ?? `grid-${cols}x${rows}`,
    name: name ?? `${cols}×${rows} grid`,
    topology: 'grid',
    cols,
    rows,
    hasGridCoords: true,
    perimeter: gridPerimeter(cols, rows)
  });
}

export interface RingParams {
  count: number;
  id?: string;
  name?: string;
}

export function ringLayout({ count, id, name }: RingParams): Layout {
  if (count < 1) throw new Error('ringLayout requires count >= 1');
  const raw: RawFixture[] = [];
  for (let i = 0; i < count; i++) {
    // Start at 12 o'clock, go clockwise.
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    raw.push({ x: Math.cos(angle), y: Math.sin(angle), row: -1, col: -1, label: `${i + 1}` });
  }
  return finalize(raw, {
    id: id ?? `ring-${count}`,
    name: name ?? `${count}-cannon ring`,
    topology: 'ring',
    cols: 0,
    rows: 0,
    hasGridCoords: false,
    perimeter: Array.from({ length: count }, (_, i) => i)
  });
}

interface DiscCell {
  r: number;
  c: number;
  dist: number;
}

/** Cells of a d×d grid whose center lies within the inscribed circle. */
function discCells(diameter: number): DiscCell[] {
  const center = (diameter - 1) / 2;
  const radius = diameter / 2;
  const cells: DiscCell[] = [];
  for (let r = 0; r < diameter; r++) {
    for (let c = 0; c < diameter; c++) {
      const dist = Math.hypot(r - center, c - center);
      if (dist <= radius + 1e-9) cells.push({ r, c, dist });
    }
  }
  return cells;
}

export interface FilledRingParams {
  count: number;
  id?: string;
  name?: string;
}

/**
 * A filled disc modeled as a grid with a circular mask — the user's insight
 * that "the filled circle really is a grid with some disabled". We grow the
 * bounding grid until the inscribed disc holds at least `count` cells, then
 * keep the `count` cells closest to the center (so the shape stays a disc and
 * the count is exact). Fixtures keep grid row/col, so grid-space transforms and
 * row/col animations still work.
 */
export function filledRingLayout({ count, id, name }: FilledRingParams): Layout {
  if (count < 1) throw new Error('filledRingLayout requires count >= 1');

  let diameter = 1;
  let cells = discCells(diameter);
  while (cells.length < count) {
    diameter += 1;
    cells = discCells(diameter);
  }

  // Keep the `count` cells nearest the center; deterministic tie-break.
  cells.sort((a, b) => a.dist - b.dist || a.r - b.r || a.c - b.c);
  const kept = cells.slice(0, count);

  // Emit in row-major order so logical traversal matches a grid.
  kept.sort((a, b) => a.r - b.r || a.c - b.c);

  const center = (diameter - 1) / 2;
  const raw: RawFixture[] = kept.map(cell => ({
    x: cell.c - center,
    y: cell.r - center,
    row: cell.r,
    col: cell.c,
    label: `${cell.r}:${cell.c}`
  }));

  const layout = finalize(raw, {
    id: id ?? `ring-${count}-filled`,
    name: name ?? `${count}-cannon filled ring`,
    topology: 'filledRing',
    cols: diameter,
    rows: diameter,
    hasGridCoords: true,
    perimeter: []
  });

  // Perimeter = outermost ring, ordered by angle.
  const maxRing = Math.max(...layout.fixtures.map(f => f.ring));
  layout.perimeter = layout.fixtures
    .filter(f => f.ring === maxRing)
    .sort((a, b) => a.angle - b.angle)
    .map(f => f.index);

  return layout;
}
