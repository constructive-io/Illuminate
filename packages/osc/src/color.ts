/**
 * Color conversion utilities.
 *
 * The internal grid uses HSB (hue 0–360, saturation 0–100, brightness 0–100).
 * Hardware targets need RGB in various ranges:
 *   - BEYOND: red/green/blue 0–255, brightness 0–100
 *   - FB4:    color_red/green/blue 0–100
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert HSB to RGB (all outputs 0–1).
 * Standard HSB→RGB algorithm using six hue sectors.
 */
export function hsbToRgb(h: number, s: number, b: number): RGB {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(1, s / 100));
  const bNorm = Math.max(0, Math.min(1, b / 100));

  const c = bNorm * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = bNorm - c;

  let r1: number, g1: number, b1: number;

  if (hNorm < 60)       { r1 = c; g1 = x; b1 = 0; }
  else if (hNorm < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (hNorm < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (hNorm < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (hNorm < 300) { r1 = x; g1 = 0; b1 = c; }
  else                  { r1 = c; g1 = 0; b1 = x; }

  return {
    r: r1 + m,
    g: g1 + m,
    b: b1 + m
  };
}

/** HSB → RGB scaled to 0–255 (for BEYOND livecontrol). */
export function hsbToRgb255(h: number, s: number, b: number): { r: number; g: number; b: number } {
  const rgb = hsbToRgb(h, s, b);
  return {
    r: Math.round(rgb.r * 255),
    g: Math.round(rgb.g * 255),
    b: Math.round(rgb.b * 255)
  };
}

/** HSB → RGB scaled to 0–100 (for FB4). */
export function hsbToRgb100(h: number, s: number, b: number): { r: number; g: number; b: number } {
  const rgb = hsbToRgb(h, s, b);
  return {
    r: Math.round(rgb.r * 100),
    g: Math.round(rgb.g * 100),
    b: Math.round(rgb.b * 100)
  };
}
