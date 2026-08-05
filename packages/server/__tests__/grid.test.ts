import { compositeLayer, createGrid, tickGrid, setCannonTarget, setAllTargets, mapUiToGrid, mapGridToUi, remapGridForUi, defaultOrientation } from '../src/grid';

const NUM_CANNONS = 49;

describe('grid', () => {
  it('should create a grid of 49 cannons', () => {
    const grid = createGrid(NUM_CANNONS);
    expect(grid).toHaveLength(NUM_CANNONS);
    expect(grid[0].h).toBe(0);
    expect(grid[0].s).toBe(0);
    expect(grid[0].b).toBe(0);
  });

  it('should interpolate toward target on tick', () => {
    const grid = createGrid(NUM_CANNONS);
    setCannonTarget(grid, 0, 120, 80, 60);

    // After one tick, should move toward target but not reach it
    tickGrid(grid, 0.1);
    expect(grid[0].b).toBeGreaterThan(0);
    expect(grid[0].b).toBeLessThan(60);
  });

  it('should converge to target after many ticks', () => {
    const grid = createGrid(NUM_CANNONS);
    setCannonTarget(grid, 0, 0, 50, 50);

    for (let i = 0; i < 200; i++) {
      tickGrid(grid, 0.1);
    }

    expect(grid[0].s).toBeCloseTo(50, 0);
    expect(grid[0].b).toBeCloseTo(50, 0);
  });

  it('should handle hue wrap-around (shortest path)', () => {
    const grid = createGrid(NUM_CANNONS);
    // Start at hue 350, target hue 10 — should go 350→0→10 (not 350→180→10)
    grid[0].h = 350;
    grid[0].targetH = 350;
    setCannonTarget(grid, 0, 10);

    tickGrid(grid, 0.5);
    // angleDelta(350, 10) = +20, so new hue = (350 + 10) % 360 = 0
    // This means it moved forward through 360 (the short path), not backward
    const h = grid[0].h;
    // The hue should be between 350 and 10 on the short arc (i.e., >= 350 or <= 10)
    expect(h >= 350 || h <= 10).toBe(true);
  });

  it('should set all targets at once', () => {
    const grid = createGrid(NUM_CANNONS);
    setAllTargets(grid, 100, 50, 30);

    for (const c of grid) {
      expect(c.targetH).toBe(100);
      expect(c.targetS).toBe(50);
      expect(c.targetB).toBe(30);
    }
  });

  it('should report no change when grid is at target', () => {
    const grid = createGrid(NUM_CANNONS);
    // Grid starts at target, so tick should report no change
    const changed = tickGrid(grid);
    expect(changed).toBe(false);
  });

  it('should report change when grid is moving toward target', () => {
    const grid = createGrid(NUM_CANNONS);
    setCannonTarget(grid, 0, 120, 80, 60);
    const changed = tickGrid(grid);
    expect(changed).toBe(true);
  });
});

describe('orientation transform', () => {
  const cols = 7;
  const rows = 7;

  it('identity orientation should not change index', () => {
    const orient = defaultOrientation();
    for (let i = 0; i < 49; i++) {
      expect(mapUiToGrid(i, cols, rows, orient)).toBe(i);
      expect(mapGridToUi(i, cols, rows, orient)).toBe(i);
    }
  });

  it('90° CW rotation: top-left → top-right', () => {
    const orient = { rotation: 90 as const, flipH: false, flipV: false };
    // UI index 0 (row 0, col 0) → grid (col 0, row 6) = row 0, col 6 = index 6
    expect(mapUiToGrid(0, cols, rows, orient)).toBe(6);
  });

  it('180° rotation: top-left → bottom-right', () => {
    const orient = { rotation: 180 as const, flipH: false, flipV: false };
    expect(mapUiToGrid(0, cols, rows, orient)).toBe(48);
  });

  it('270° rotation: top-left → bottom-left', () => {
    const orient = { rotation: 270 as const, flipH: false, flipV: false };
    expect(mapUiToGrid(0, cols, rows, orient)).toBe(42);
  });

  it('flipH: top-left → top-right', () => {
    const orient = { rotation: 0 as const, flipH: true, flipV: false };
    expect(mapUiToGrid(0, cols, rows, orient)).toBe(6);
    expect(mapUiToGrid(6, cols, rows, orient)).toBe(0);
  });

  it('flipV: top-left → bottom-left', () => {
    const orient = { rotation: 0 as const, flipH: false, flipV: true };
    expect(mapUiToGrid(0, cols, rows, orient)).toBe(42);
    expect(mapUiToGrid(42, cols, rows, orient)).toBe(0);
  });

  it('mapUiToGrid and mapGridToUi are inverses', () => {
    const orientations = [
      { rotation: 0 as const, flipH: false, flipV: false },
      { rotation: 90 as const, flipH: false, flipV: false },
      { rotation: 180 as const, flipH: false, flipV: false },
      { rotation: 270 as const, flipH: false, flipV: false },
      { rotation: 0 as const, flipH: true, flipV: false },
      { rotation: 0 as const, flipH: false, flipV: true },
      { rotation: 90 as const, flipH: true, flipV: false },
      { rotation: 270 as const, flipH: true, flipV: true },
    ];
    for (const orient of orientations) {
      for (let ui = 0; ui < 49; ui++) {
        const grid = mapUiToGrid(ui, cols, rows, orient);
        const back = mapGridToUi(grid, cols, rows, orient);
        expect(back).toBe(ui);
      }
    }
  });

  it('remapGridForUi returns identity for default orientation', () => {
    const data = Array.from({ length: 49 }, (_, i) => i);
    const result = remapGridForUi(data, cols, rows, defaultOrientation());
    expect(result).toBe(data); // same reference (early return)
  });

  it('remapGridForUi correctly remaps for 90° rotation', () => {
    const orient = { rotation: 90 as const, flipH: false, flipV: false };
    const data = Array.from({ length: 49 }, (_, i) => i);
    const result = remapGridForUi(data, cols, rows, orient);
    // Grid index 0 should appear at UI index mapGridToUi(0, ...)
    const uiIdx = mapGridToUi(0, cols, rows, orient);
    expect(result[uiIdx]).toBe(0);
    // Every grid value should be reachable
    expect(result).toHaveLength(49);
    expect(new Set(result).size).toBe(49);
  });
});

describe('compositeLayer', () => {
  const base = [
    { h: 220, s: 80, b: 60 },
    { h: 120, s: 90, b: 80 },
    { h: 0, s: 50, b: 40 }
  ];

  it('should replace base with overlay in replace mode', () => {
    const overlay = [
      { h: 0, s: 100, b: 100 },
      { h: 30, s: 50, b: 50 },
      { h: 180, s: 70, b: 70 }
    ];
    const result = compositeLayer(base, overlay, 'replace');
    expect(result[0]).toEqual({ h: 0, s: 100, b: 100 });
    expect(result[1]).toEqual({ h: 30, s: 50, b: 50 });
    expect(result[2]).toEqual({ h: 180, s: 70, b: 70 });
  });

  it('should modulate base in multiply mode', () => {
    const overlay = [
      { h: 100, s: 80, b: 80 },
      { h: 100, s: 80, b: 80 },
      { h: 100, s: 80, b: 80 }
    ];
    const result = compositeLayer(base, overlay, 'multiply');
    // Brightness should be base.b * (overlay.b / 80) = 60 * 1 = 60
    expect(result[0].b).toBeCloseTo(60, 0);
    // Hue should shift: (base.h + overlay.h * 0.3) % 360
    expect(result[0].h).toBeCloseTo((220 + 100 * 0.3) % 360, 0);
  });

  it('should add overlay in additive mode', () => {
    const overlay = [
      { h: 40, s: 90, b: 30 },
      { h: 40, s: 90, b: 30 },
      { h: 40, s: 90, b: 30 }
    ];
    const result = compositeLayer(base, overlay, 'additive');
    // Brightness should be base.b + overlay.b * 0.4
    expect(result[0].b).toBeCloseTo(60 + 30 * 0.4, 0);
    // Saturation should be max(base.s, overlay.s)
    expect(result[0].s).toBe(90);
  });

  it('should preserve base color while driving brightness in brighten mode', () => {
    const overlay = [
      { h: 40, s: 100, b: 80 },
      { h: 300, s: 100, b: 5 },
      { h: 180, s: 100, b: 120 }
    ];
    const result = compositeLayer(base, overlay, 'brighten');

    expect(result[0].h).toBe(base[0].h);
    expect(result[0].s).toBe(base[0].s);
    expect(result[0].b).toBeCloseTo(60 * 0.25 + 80 * 0.9, 0);

    expect(result[1].h).toBe(base[1].h);
    expect(result[1].s).toBe(base[1].s);
    expect(result[1].b).toBeCloseTo(80 * 0.25 + 5 * 0.9, 0);

    expect(result[2].b).toBe(100);
  });

  it('should not mutate the base grid', () => {
    const baseCopy = base.map(c => ({ ...c }));
    const overlay = [
      { h: 0, s: 100, b: 100 },
      { h: 0, s: 100, b: 100 },
      { h: 0, s: 100, b: 100 }
    ];
    compositeLayer(baseCopy, overlay, 'replace');
    expect(baseCopy[0].h).toBe(220);
    expect(baseCopy[0].b).toBe(60);
  });

  it('should handle missing overlay entries gracefully', () => {
    const shortOverlay = [{ h: 0, s: 100, b: 100 }];
    const result = compositeLayer(base, shortOverlay, 'replace');
    // First entry replaced
    expect(result[0]).toEqual({ h: 0, s: 100, b: 100 });
    // Others passthrough from base
    expect(result[1]).toEqual({ h: 120, s: 90, b: 80 });
    expect(result[2]).toEqual({ h: 0, s: 50, b: 40 });
  });
});
