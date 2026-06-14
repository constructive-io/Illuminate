import { CannonTarget, DEFAULT_GRID_COLUMNS, setCannonTarget } from './grid';

export interface SceneColor {
  h: number;
  s: number;
  b: number;
}

export type SceneGenerator = (index: number, total: number, gridColumns: number) => SceneColor;

export const scenes: Record<string, SceneGenerator> = {
  civic: () => ({ h: 220, s: 90, b: 80 }),

  pride: (i, total) => ({ h: Math.round((i / total) * 360), s: 90, b: 80 }),

  gold: () => ({ h: 45, s: 95, b: 80 }),

  white: () => ({ h: 0, s: 0, b: 80 }),

  solstice: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { h: 40 + row * 5 + col * 4, s: 85, b: 80 };
  },

  ocean: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return { h: 180 + row * 8 + col * 3, s: 75, b: 70 };
  },

  sunset: (i, _total, cols) => {
    const row = Math.floor(i / cols);
    return { h: 10 + row * 5, s: 90, b: 85 - row * 5 };
  },

  off: () => ({ h: 0, s: 0, b: 0 })
};

export function applyScene(grid: CannonTarget[], sceneName: string, gridColumns: number = DEFAULT_GRID_COLUMNS) {
  const generator = scenes[sceneName];
  if (!generator) return;
  for (let i = 0; i < grid.length; i++) {
    const { h, s, b } = generator(i, grid.length, gridColumns);
    setCannonTarget(grid, i, h, s, b);
  }
}
