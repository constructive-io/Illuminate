import { CannonTarget, DEFAULT_GRID_COLUMNS, setCannonTarget } from './grid';

export type AnimationFn = (grid: CannonTarget[], tick: number, attack: number, gridColumns?: number) => void;

export const animations: Record<string, AnimationFn> = {
  wave: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    for (let i = 0; i < grid.length; i++) {
      const col = i % cols;
      const hue = (tick * 2 + col * 40) % 360;
      const bright = 60 + Math.sin(tick * 0.05 + col * 0.8) * 20;
      setCannonTarget(grid, i, hue, 85, bright, attack);
    }
  },

  breathe: (grid, tick, attack) => {
    const brightness = 40 + Math.sin(tick * 0.03) * 35;
    for (let i = 0; i < grid.length; i++) {
      setCannonTarget(grid, i, 220, 80, brightness, attack);
    }
  },

  rainbow: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const hue = (tick * 1.5 + (row + col) * 25) % 360;
      setCannonTarget(grid, i, hue, 90, 80, attack);
    }
  },

  pacman: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const perimeter = getPerimeterIndices(grid.length, cols);
    const pos = Math.floor(tick * 0.3) % perimeter.length;
    for (let i = 0; i < grid.length; i++) {
      setCannonTarget(grid, i, 220, 60, 15, attack);
    }
    const pacIdx = perimeter[pos];
    setCannonTarget(grid, pacIdx, 55, 95, 95, 1.0);
    for (let t = 1; t <= 3; t++) {
      const trailPos = (pos - t + perimeter.length) % perimeter.length;
      const trailIdx = perimeter[trailPos];
      setCannonTarget(grid, trailIdx, 55, 80, 70 - t * 18, 1.0);
    }
  },

  spiral: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const dx = col - cx, dy = row - cy;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hue = (angle * 57.3 + dist * 40 + tick * 3) % 360;
      setCannonTarget(grid, i, (hue + 360) % 360, 85, 75, attack);
    }
  },

  rain: (grid, tick, attack, cols = DEFAULT_GRID_COLUMNS) => {
    const rows = Math.ceil(grid.length / cols);
    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const phase = (tick * 0.15 + col * 2.3 + col * col * 0.7) % rows;
      const dist = Math.abs(row - phase);
      const bright = dist < 1.5 ? 90 - dist * 30 : 10;
      setCannonTarget(grid, i, 200 + col * 8, 70, bright, attack);
    }
  },

  heartbeat: (grid, tick, attack) => {
    const phase = tick % 120;
    let brightness: number;
    if (phase < 10) brightness = 40 + phase * 5;
    else if (phase < 20) brightness = 90 - (phase - 10) * 5;
    else if (phase < 30) brightness = 40 + (phase - 20) * 4;
    else if (phase < 40) brightness = 80 - (phase - 30) * 4;
    else brightness = 40;

    for (let i = 0; i < grid.length; i++) {
      setCannonTarget(grid, i, 0, 90, brightness, attack);
    }
  }
};

function getPerimeterIndices(numCannons: number, cols: number): number[] {
  const rows = Math.ceil(numCannons / cols);
  const indices: number[] = [];
  for (let c = 0; c < cols; c++) indices.push(c);
  for (let r = 1; r < rows; r++) indices.push(r * cols + (cols - 1));
  for (let c = cols - 2; c >= 0; c--) indices.push((rows - 1) * cols + c);
  for (let r = rows - 2; r >= 1; r--) indices.push(r * cols);
  return indices.filter(i => i < numCannons);
}

export function getAnimationNames(): string[] {
  return Object.keys(animations);
}
