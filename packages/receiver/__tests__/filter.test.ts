import {
  createFilteredGrid,
  tickFilter,
  applyUpstreamState,
  angleDelta
} from '../src/filter';

const N = 49;

describe('filter', () => {
  it('should create a grid with 49 cannons', () => {
    const grid = createFilteredGrid(N);
    expect(grid).toHaveLength(N);
    expect(grid[0].h).toBe(0);
    expect(grid[0].targetH).toBe(0);
  });

  it('should not change when current equals target', () => {
    const grid = createFilteredGrid(N);
    const changed = tickFilter(grid);
    expect(changed).toBe(false);
  });

  it('should converge toward target after multiple ticks', () => {
    const grid = createFilteredGrid(N);
    grid[0].targetH = 120;
    grid[0].targetS = 80;
    grid[0].targetB = 70;

    // Run 100 ticks (~1.7s at 60fps)
    for (let i = 0; i < 100; i++) tickFilter(grid);

    expect(grid[0].h).toBeCloseTo(120, 0);
    expect(grid[0].s).toBeCloseTo(80, 0);
    expect(grid[0].b).toBeCloseTo(70, 0);
  });

  it('should use receiver alpha (0.06) for smoother transitions', () => {
    const grid = createFilteredGrid(N);
    grid[0].targetB = 100;

    // One tick with receiver alpha
    tickFilter(grid, 0.06);
    const afterOne = grid[0].b;

    // Should have moved less than simulator alpha (0.08)
    const grid2 = createFilteredGrid(N);
    grid2[0].targetB = 100;
    tickFilter(grid2, 0.08);
    const afterOneFast = grid2[0].b;

    // Lower alpha = larger step = higher value (closer to 100)
    expect(afterOneFast).toBeGreaterThan(afterOne);
  });

  it('should apply upstream state as targets', () => {
    const grid = createFilteredGrid(N);
    const upstream = [{ h: 0, s: 100, b: 100 }];
    applyUpstreamState(grid, upstream);

    expect(grid[0].targetH).toBe(0);
    expect(grid[0].targetS).toBe(100);
    expect(grid[0].targetB).toBe(100);
    // Current should remain unchanged
    expect(grid[0].h).toBe(0);
  });

  it('angleDelta should compute shortest path', () => {
    expect(angleDelta(10, 350)).toBeCloseTo(-20);
    expect(angleDelta(350, 10)).toBeCloseTo(20);
    // 180° apart — either direction is equivalent
    expect(Math.abs(angleDelta(0, 180))).toBeCloseTo(180);
    expect(Math.abs(angleDelta(90, 270))).toBeCloseTo(180);
  });
});
