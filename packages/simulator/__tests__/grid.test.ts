import { compositeLayer, createGrid, tickGrid, setCannonTarget, setAllTargets, NUM_CANNONS } from '../src/grid';

describe('grid', () => {
  it('should create a grid of 49 cannons', () => {
    const grid = createGrid();
    expect(grid).toHaveLength(NUM_CANNONS);
    expect(grid[0].h).toBe(220);
    expect(grid[0].s).toBe(90);
    expect(grid[0].b).toBe(80);
  });

  it('should interpolate toward target on tick', () => {
    const grid = createGrid();
    setCannonTarget(grid, 0, 0, 0, 0);

    // After one tick, should move toward target but not reach it
    tickGrid(grid, 0.1);
    expect(grid[0].b).toBeLessThan(80);
    expect(grid[0].b).toBeGreaterThan(0);
  });

  it('should converge to target after many ticks', () => {
    const grid = createGrid();
    setCannonTarget(grid, 0, 0, 50, 50);

    for (let i = 0; i < 200; i++) {
      tickGrid(grid, 0.1);
    }

    expect(grid[0].s).toBeCloseTo(50, 0);
    expect(grid[0].b).toBeCloseTo(50, 0);
  });

  it('should handle hue wrap-around (shortest path)', () => {
    const grid = createGrid();
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
    const grid = createGrid();
    setAllTargets(grid, 100, 50, 30);

    for (const c of grid) {
      expect(c.targetH).toBe(100);
      expect(c.targetS).toBe(50);
      expect(c.targetB).toBe(30);
    }
  });

  it('should report no change when grid is at target', () => {
    const grid = createGrid();
    // Grid starts at target, so tick should report no change
    const changed = tickGrid(grid);
    expect(changed).toBe(false);
  });

  it('should report change when grid is moving toward target', () => {
    const grid = createGrid();
    setCannonTarget(grid, 0, 0, 0, 0);
    const changed = tickGrid(grid);
    expect(changed).toBe(true);
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
