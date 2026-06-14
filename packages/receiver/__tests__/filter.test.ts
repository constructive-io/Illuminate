import {
  createFilteredGrid,
  tickFilter,
  applyUpstreamState,
  angleDelta,
  DEFAULT_NUM_CANNONS
} from '../src/filter';

describe('filter', () => {
  it('should create a grid with 49 cannons', () => {
    const grid = createFilteredGrid();
    expect(grid).toHaveLength(DEFAULT_NUM_CANNONS);
    expect(grid[0].h).toBe(220);
    expect(grid[0].targetH).toBe(220);
  });

  it('should not change when current equals target', () => {
    const grid = createFilteredGrid();
    const changed = tickFilter(grid);
    expect(changed).toBe(false);
  });

  it('should converge toward target after multiple ticks', () => {
    const grid = createFilteredGrid();
    grid[0].targetH = 0;
    grid[0].targetS = 50;
    grid[0].targetB = 50;

    // Run 100 ticks (~1.7s at 60fps)
    for (let i = 0; i < 100; i++) tickFilter(grid);

    expect(Math.abs(grid[0].h - 0) < 2 || Math.abs(grid[0].h - 360) < 2).toBe(true);
    expect(grid[0].s).toBeCloseTo(50, 0);
    expect(grid[0].b).toBeCloseTo(50, 0);
  });

  it('should use receiver alpha (0.06) for smoother transitions', () => {
    const grid = createFilteredGrid();
    grid[0].targetB = 0;

    // One tick with receiver alpha
    tickFilter(grid, 0.06);
    const afterOne = grid[0].b;

    // Should have moved less than simulator alpha (0.08)
    const grid2 = createFilteredGrid();
    grid2[0].targetB = 0;
    tickFilter(grid2, 0.08);
    const afterOneFast = grid2[0].b;

    // Lower alpha = smaller step = higher remaining value
    expect(afterOne).toBeGreaterThan(afterOneFast);
  });

  it('should apply upstream state as targets', () => {
    const grid = createFilteredGrid();
    const upstream = [{ h: 0, s: 100, b: 100 }];
    applyUpstreamState(grid, upstream);

    expect(grid[0].targetH).toBe(0);
    expect(grid[0].targetS).toBe(100);
    expect(grid[0].targetB).toBe(100);
    // Current should remain unchanged
    expect(grid[0].h).toBe(220);
  });

  it('angleDelta should compute shortest path', () => {
    expect(angleDelta(10, 350)).toBeCloseTo(-20);
    expect(angleDelta(350, 10)).toBeCloseTo(20);
    // 180° apart — either direction is equivalent
    expect(Math.abs(angleDelta(0, 180))).toBeCloseTo(180);
    expect(Math.abs(angleDelta(90, 270))).toBeCloseTo(180);
  });
});
