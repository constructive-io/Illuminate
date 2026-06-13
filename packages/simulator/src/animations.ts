import { CannonTarget, GRID_SIZE, NUM_CANNONS, setCannonTarget } from './grid';

export type AnimationFn = (grid: CannonTarget[], tick: number, attack: number) => void;

export const animations: Record<string, AnimationFn> = {
  wave: (grid, tick, attack) => {
    for (let i = 0; i < NUM_CANNONS; i++) {
      const col = i % GRID_SIZE;
      const hue = (tick * 2 + col * 40) % 360;
      const bright = 60 + Math.sin(tick * 0.05 + col * 0.8) * 20;
      setCannonTarget(grid, i, hue, 85, bright, attack);
    }
  },

  breathe: (grid, tick, attack) => {
    const brightness = 40 + Math.sin(tick * 0.03) * 35;
    for (let i = 0; i < NUM_CANNONS; i++) {
      setCannonTarget(grid, i, 220, 80, brightness, attack);
    }
  },

  rainbow: (grid, tick, attack) => {
    for (let i = 0; i < NUM_CANNONS; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const hue = (tick * 1.5 + (row + col) * 25) % 360;
      setCannonTarget(grid, i, hue, 90, 80, attack);
    }
  },

  pacman: (grid, tick, attack) => {
    // Bright dot chasing around the perimeter
    const perimeter = getPerimeterIndices();
    const pos = Math.floor(tick * 0.3) % perimeter.length;
    for (let i = 0; i < NUM_CANNONS; i++) {
      setCannonTarget(grid, i, 220, 60, 15, attack);
    }
    // Pac-man (bright yellow)
    const pacIdx = perimeter[pos];
    setCannonTarget(grid, pacIdx, 55, 95, 95, 1.0);
    // Trail (fading)
    for (let t = 1; t <= 3; t++) {
      const trailPos = (pos - t + perimeter.length) % perimeter.length;
      const trailIdx = perimeter[trailPos];
      setCannonTarget(grid, trailIdx, 55, 80, 70 - t * 18, 1.0);
    }
  },

  spiral: (grid, tick, attack) => {
    for (let i = 0; i < NUM_CANNONS; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      const cx = col - 3, cy = row - 3;
      const angle = Math.atan2(cy, cx);
      const dist = Math.sqrt(cx * cx + cy * cy);
      const hue = (angle * 57.3 + dist * 40 + tick * 3) % 360;
      setCannonTarget(grid, i, (hue + 360) % 360, 85, 75, attack);
    }
  },

  rain: (grid, tick, attack) => {
    for (let i = 0; i < NUM_CANNONS; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      // Each column has a different phase offset (pseudo-random via prime)
      const phase = (tick * 0.15 + col * 2.3 + col * col * 0.7) % GRID_SIZE;
      const dist = Math.abs(row - phase);
      const bright = dist < 1.5 ? 90 - dist * 30 : 10;
      setCannonTarget(grid, i, 200 + col * 8, 70, bright, attack);
    }
  },

  heartbeat: (grid, tick, attack) => {
    // Double-pulse then rest (period ~120 ticks at 60fps = 2s)
    const phase = tick % 120;
    let brightness: number;
    if (phase < 10) brightness = 40 + phase * 5;       // first pulse up
    else if (phase < 20) brightness = 90 - (phase - 10) * 5; // first pulse down
    else if (phase < 30) brightness = 40 + (phase - 20) * 4; // second pulse up
    else if (phase < 40) brightness = 80 - (phase - 30) * 4; // second pulse down
    else brightness = 40;                               // rest

    for (let i = 0; i < NUM_CANNONS; i++) {
      setCannonTarget(grid, i, 0, 90, brightness, attack);
    }
  }
};

function getPerimeterIndices(): number[] {
  const indices: number[] = [];
  // Top row
  for (let c = 0; c < GRID_SIZE; c++) indices.push(c);
  // Right column (skip top-right corner)
  for (let r = 1; r < GRID_SIZE; r++) indices.push(r * GRID_SIZE + (GRID_SIZE - 1));
  // Bottom row reversed (skip bottom-right corner)
  for (let c = GRID_SIZE - 2; c >= 0; c--) indices.push((GRID_SIZE - 1) * GRID_SIZE + c);
  // Left column reversed (skip corners)
  for (let r = GRID_SIZE - 2; r >= 1; r--) indices.push(r * GRID_SIZE);
  return indices;
}

export function getAnimationNames(): string[] {
  return Object.keys(animations);
}
