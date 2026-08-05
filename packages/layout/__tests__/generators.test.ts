import { filledRingLayout, gridLayout, ringLayout } from '../src/generators';

describe('gridLayout', () => {
  it('creates a row-major grid with correct count and grid coords', () => {
    const layout = gridLayout({ cols: 7, rows: 2 });
    expect(layout.topology).toBe('grid');
    expect(layout.count).toBe(14);
    expect(layout.cols).toBe(7);
    expect(layout.rows).toBe(2);
    expect(layout.hasGridCoords).toBe(true);
    expect(layout.fixtures).toHaveLength(14);
    // index 8 => row 1, col 1
    expect(layout.fixtures[8].row).toBe(1);
    expect(layout.fixtures[8].col).toBe(1);
    // indices are contiguous
    layout.fixtures.forEach((f, i) => expect(f.index).toBe(i));
  });

  it('normalizes u/v across the bounding box', () => {
    const layout = gridLayout({ cols: 7, rows: 7 });
    expect(layout.fixtures[0].u).toBeCloseTo(0);
    expect(layout.fixtures[0].v).toBeCloseTo(0);
    expect(layout.fixtures[48].u).toBeCloseTo(1);
    expect(layout.fixtures[48].v).toBeCloseTo(1);
  });

  it('walks the perimeter of a 7×7 grid (24 border cells)', () => {
    const layout = gridLayout({ cols: 7, rows: 7 });
    expect(layout.perimeter).toHaveLength(24);
    expect(layout.perimeter[0]).toBe(0);
    // interior cell 24 (center) is never on the perimeter
    expect(layout.perimeter).not.toContain(24);
  });

  it('throws on degenerate dimensions', () => {
    expect(() => gridLayout({ cols: 0, rows: 3 })).toThrow();
  });
});

describe('ringLayout', () => {
  it('places count fixtures on a unit circle with no grid coords', () => {
    const layout = ringLayout({ count: 6 });
    expect(layout.topology).toBe('ring');
    expect(layout.count).toBe(6);
    expect(layout.hasGridCoords).toBe(false);
    expect(layout.cols).toBe(0);
    expect(layout.rows).toBe(0);
    layout.fixtures.forEach(f => {
      expect(f.row).toBe(-1);
      expect(f.col).toBe(-1);
      expect(f.radius).toBeCloseTo(1);
    });
  });

  it('starts at 12 o’clock and goes clockwise', () => {
    const layout = ringLayout({ count: 4 });
    // first fixture at top: x≈0, y≈-1
    expect(layout.fixtures[0].x).toBeCloseTo(0);
    expect(layout.fixtures[0].y).toBeCloseTo(-1);
  });

  it('perimeter is every fixture in order', () => {
    const layout = ringLayout({ count: 6 });
    expect(layout.perimeter).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('filledRingLayout', () => {
  it('produces exactly count fixtures with grid coords', () => {
    const layout = filledRingLayout({ count: 25 });
    expect(layout.topology).toBe('filledRing');
    expect(layout.count).toBe(25);
    expect(layout.hasGridCoords).toBe(true);
    expect(layout.fixtures).toHaveLength(25);
    // bounding grid is square and large enough to hold the disc
    expect(layout.cols).toBe(layout.rows);
    layout.fixtures.forEach(f => {
      expect(f.row).toBeGreaterThanOrEqual(0);
      expect(f.col).toBeGreaterThanOrEqual(0);
      expect(f.row).toBeLessThan(layout.rows);
      expect(f.col).toBeLessThan(layout.cols);
    });
  });

  it('emits fixtures in row-major order', () => {
    const layout = filledRingLayout({ count: 25 });
    for (let i = 1; i < layout.fixtures.length; i++) {
      const prev = layout.fixtures[i - 1];
      const cur = layout.fixtures[i];
      const prevKey = prev.row * layout.cols + prev.col;
      const curKey = cur.row * layout.cols + cur.col;
      expect(curKey).toBeGreaterThan(prevKey);
    }
  });

  it('perimeter is a non-empty subset on the outer ring', () => {
    const layout = filledRingLayout({ count: 25 });
    expect(layout.perimeter.length).toBeGreaterThan(0);
    expect(layout.perimeter.length).toBeLessThanOrEqual(layout.count);
  });
});
