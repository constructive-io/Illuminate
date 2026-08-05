import { gridLayout, ringLayout } from '@wavegrid/layout';

import { computeFallbackFrame, DEFAULT_FALLBACK_CONFIG } from '../src/fallback';
import { createFilteredGrid } from '../src/filter';

const layout = gridLayout({ cols: 7, rows: 7 });
const N = layout.count;

function makeGrid() {
  return createFilteredGrid(N);
}

describe('fallback', () => {
  it('should set targets for all 49 cannons', () => {
    const grid = makeGrid();
    computeFallbackFrame(grid, 0, DEFAULT_FALLBACK_CONFIG, layout);

    for (let i = 0; i < N; i++) {
      expect(grid[i].targetH).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetH).toBeLessThan(360);
      expect(grid[i].targetS).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetS).toBeLessThanOrEqual(100);
      expect(grid[i].targetB).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetB).toBeLessThanOrEqual(100);
    }
  });

  it('should produce different values at different ticks', () => {
    const grid = makeGrid();
    computeFallbackFrame(grid, 0, DEFAULT_FALLBACK_CONFIG, layout);
    const t0h = grid[0].targetH;

    computeFallbackFrame(grid, 100, DEFAULT_FALLBACK_CONFIG, layout);
    const t100h = grid[0].targetH;

    expect(t0h).not.toBeCloseTo(t100h, 1);
  });

  it('should produce spatial variation across the grid', () => {
    const grid = makeGrid();
    computeFallbackFrame(grid, 50, DEFAULT_FALLBACK_CONFIG, layout);

    const hues = grid.map(c => c.targetH);
    const uniqueHues = new Set(hues.map(h => Math.round(h)));
    expect(uniqueHues.size).toBeGreaterThan(3);
  });

  it('should respect config base hue', () => {
    const grid = makeGrid();
    const config = { ...DEFAULT_FALLBACK_CONFIG, baseHue: 0, hueSpread: 10 };
    computeFallbackFrame(grid, 0, config, layout);

    for (let i = 0; i < N; i++) {
      const h = grid[i].targetH;
      expect(h < 20 || h > 340).toBe(true);
    }
  });

  it('should produce smooth wave-like brightness', () => {
    const grid = makeGrid();
    computeFallbackFrame(grid, 0, DEFAULT_FALLBACK_CONFIG, layout);

    for (let i = 0; i < N; i++) {
      expect(grid[i].targetB).toBeGreaterThanOrEqual(DEFAULT_FALLBACK_CONFIG.brightnessMin - 1);
      expect(grid[i].targetB).toBeLessThanOrEqual(DEFAULT_FALLBACK_CONFIG.brightnessMax + 1);
    }
  });

  it('works on a ring layout using fixture geometry', () => {
    const ring = ringLayout({ count: 6 });
    const grid = createFilteredGrid(ring.count);
    computeFallbackFrame(grid, 25, DEFAULT_FALLBACK_CONFIG, ring);
    for (let i = 0; i < ring.count; i++) {
      expect(grid[i].targetH).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetH).toBeLessThan(360);
      expect(grid[i].targetB).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetB).toBeLessThanOrEqual(100);
    }
  });
});
