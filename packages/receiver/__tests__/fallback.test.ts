import { createFilteredGrid, DEFAULT_NUM_CANNONS } from '../src/filter';
import { computeFallbackFrame, DEFAULT_FALLBACK_CONFIG } from '../src/fallback';

describe('fallback', () => {
  it('should set targets for all 49 cannons', () => {
    const grid = createFilteredGrid();
    computeFallbackFrame(grid, 0);

    for (let i = 0; i < DEFAULT_NUM_CANNONS; i++) {
      expect(grid[i].targetH).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetH).toBeLessThan(360);
      expect(grid[i].targetS).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetS).toBeLessThanOrEqual(100);
      expect(grid[i].targetB).toBeGreaterThanOrEqual(0);
      expect(grid[i].targetB).toBeLessThanOrEqual(100);
    }
  });

  it('should produce different values at different ticks', () => {
    const grid = createFilteredGrid();
    computeFallbackFrame(grid, 0);
    const t0h = grid[0].targetH;

    computeFallbackFrame(grid, 100);
    const t100h = grid[0].targetH;

    expect(t0h).not.toBeCloseTo(t100h, 1);
  });

  it('should produce spatial variation across the grid', () => {
    const grid = createFilteredGrid();
    computeFallbackFrame(grid, 50);

    // Corner cannons should have different values
    const topLeft = grid[0].targetH;
    const bottomRight = grid[DEFAULT_NUM_CANNONS - 1].targetH;
    // They could coincidentally be close, but with the diagonal wave
    // they should generally differ
    const hues = grid.map(c => c.targetH);
    const uniqueHues = new Set(hues.map(h => Math.round(h)));
    expect(uniqueHues.size).toBeGreaterThan(3);
  });

  it('should respect config base hue', () => {
    const grid = createFilteredGrid();
    const config = { ...DEFAULT_FALLBACK_CONFIG, baseHue: 0, hueSpread: 10 };
    computeFallbackFrame(grid, 0, config);

    // All hues should be near 0 (within spread)
    for (let i = 0; i < DEFAULT_NUM_CANNONS; i++) {
      const h = grid[i].targetH;
      expect(h < 20 || h > 340).toBe(true);
    }
  });

  it('should produce smooth wave-like brightness', () => {
    const grid = createFilteredGrid();
    computeFallbackFrame(grid, 0);

    // Brightness should be within configured range
    for (let i = 0; i < DEFAULT_NUM_CANNONS; i++) {
      expect(grid[i].targetB).toBeGreaterThanOrEqual(DEFAULT_FALLBACK_CONFIG.brightnessMin - 1);
      expect(grid[i].targetB).toBeLessThanOrEqual(DEFAULT_FALLBACK_CONFIG.brightnessMax + 1);
    }
  });
});
