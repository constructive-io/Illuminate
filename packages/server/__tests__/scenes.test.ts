import { gridLayout } from '@wavegrid/layout';

import { createGrid } from '../src/grid';
import { applyScene, scenes } from '../src/scenes';

const layout7x7 = gridLayout({ cols: 7, rows: 7 });

function grid7x7() {
  return createGrid(layout7x7.count);
}

describe('scenes', () => {
  it('should have multiple scenes defined', () => {
    expect(Object.keys(scenes).length).toBeGreaterThan(3);
  });

  it('should apply civic scene targets', () => {
    const grid = grid7x7();
    applyScene(grid, 'civic', layout7x7);

    for (let i = 0; i < layout7x7.count; i++) {
      expect(grid[i].targetH).toBe(220);
      expect(grid[i].targetS).toBe(90);
      expect(grid[i].targetB).toBe(80);
    }
  });

  it('should apply off scene', () => {
    const grid = grid7x7();
    applyScene(grid, 'off', layout7x7);

    for (let i = 0; i < layout7x7.count; i++) {
      expect(grid[i].targetB).toBe(0);
    }
  });

  it('should apply pride scene with gradient hues', () => {
    const grid = grid7x7();
    applyScene(grid, 'pride', layout7x7);

    // First cannon should have low hue, last should have high hue
    expect(grid[0].targetH).toBeLessThan(grid[48].targetH);
  });

  it('should not throw for unknown scene', () => {
    const grid = grid7x7();
    expect(() => applyScene(grid, 'nonexistent', layout7x7)).not.toThrow();
  });

  it('heart scene uses pure bright red (h=0, s=100, b=100) on the 7×7 art grid', () => {
    const grid = grid7x7();
    applyScene(grid, 'heart', layout7x7);

    // Heart bitmap "on" pixels should be pure red
    // Row 0: [0, 1, 0, 0, 0, 1, 0] — indices 1, 5 are on
    expect(grid[1].targetH).toBe(0);
    expect(grid[1].targetS).toBe(100);
    expect(grid[1].targetB).toBe(100);
    expect(grid[5].targetH).toBe(0);
    expect(grid[5].targetS).toBe(100);
    expect(grid[5].targetB).toBe(100);

    // Off pixel (index 0) should be dark
    expect(grid[0].targetB).toBe(2);
  });

  it('heart scene falls back to a wash on non-7×7 layouts', () => {
    const ring = gridLayout({ cols: 6, rows: 6 });
    const grid = createGrid(ring.count);
    applyScene(grid, 'heart', ring);
    // No art grid → every cell dim, none at full red brightness
    for (let i = 0; i < ring.count; i++) {
      expect(grid[i].targetB).toBe(2);
    }
  });
});
