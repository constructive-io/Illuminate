/**
 * 3D sine wave fallback animations.
 *
 * When the upstream signal is lost, the receiver doesn't freeze or go dark.
 * Instead it smoothly transitions into ambient sine wave patterns that sweep
 * across the 7×7 grid in three dimensions (hue, brightness, and time).
 *
 * The waves create organic, slowly evolving color movement — like the
 * installation is breathing on its own.
 */

import { DEFAULT_GRID_COLUMNS, FilteredCannon } from './filter';

export interface FallbackConfig {
  /** Base hue center for the wave (0–360). Default 220 (civic blue). */
  baseHue: number;
  /** Hue spread of the wave. Default 60. */
  hueSpread: number;
  /** Brightness min. Default 30. */
  brightnessMin: number;
  /** Brightness max. Default 85. */
  brightnessMax: number;
  /** Spatial frequency for the wave across the grid. Default 0.8. */
  spatialFreq: number;
  /** Time frequency — how fast the wave moves (radians per tick). Default 0.015. */
  timeFreq: number;
  /** Secondary wave time frequency for depth. Default 0.009. */
  timeFreq2: number;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  baseHue: 220,
  hueSpread: 60,
  brightnessMin: 30,
  brightnessMax: 85,
  spatialFreq: 0.8,
  timeFreq: 0.015,
  timeFreq2: 0.009
};

/**
 * Compute one frame of the 3D sine wave fallback and write targets
 * into the filtered grid. The receiver's low-pass filter then smoothly
 * converges the output to these targets.
 *
 * Three overlapping sine waves create organic movement:
 *   1. Primary wave sweeps diagonally across the grid (hue)
 *   2. Secondary wave moves perpendicular (brightness)
 *   3. Tertiary slow wave modulates saturation for depth
 */
export function computeFallbackFrame(
  grid: FilteredCannon[],
  tick: number,
  config: FallbackConfig = DEFAULT_FALLBACK_CONFIG,
  gridColumns: number = DEFAULT_GRID_COLUMNS
) {
  const {
    baseHue,
    hueSpread,
    brightnessMin,
    brightnessMax,
    spatialFreq,
    timeFreq,
    timeFreq2
  } = config;

  const brightRange = brightnessMax - brightnessMin;
  const cols = Math.max(1, gridColumns);

  for (let i = 0; i < grid.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    const maxCol = Math.max(1, cols - 1);
    const maxRow = Math.max(1, Math.ceil(grid.length / cols) - 1);

    // Normalize to -1..1
    const nx = (col / maxCol) * 2 - 1;
    const ny = (row / maxRow) * 2 - 1;

    // Primary diagonal wave → hue
    const wave1 = Math.sin(
      (nx + ny) * spatialFreq * Math.PI + tick * timeFreq
    );

    // Secondary perpendicular wave → brightness
    const wave2 = Math.sin(
      (nx - ny) * spatialFreq * Math.PI * 0.7 + tick * timeFreq2
    );

    // Tertiary slow radial wave → saturation depth
    const dist = Math.sqrt(nx * nx + ny * ny);
    const wave3 = Math.sin(dist * Math.PI + tick * timeFreq * 0.4);

    // Map to HSB
    const h = (baseHue + wave1 * hueSpread + 360) % 360;
    const s = 70 + wave3 * 20;                           // 50–90 range
    const b = brightnessMin + ((wave2 + 1) / 2) * brightRange;

    grid[i].targetH = h;
    grid[i].targetS = Math.max(0, Math.min(100, s));
    grid[i].targetB = Math.max(0, Math.min(100, b));
  }
}
