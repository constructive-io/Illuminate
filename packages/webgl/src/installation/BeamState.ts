export interface BeamState {
  id: number;       // 0–48
  row: number;      // 0–6
  col: number;      // 0–6
  enabled: boolean;
  color: [number, number, number]; // RGB 0–1
  intensity: number; // 0–1+
  width: number;     // beam diameter scale
}

export type TimeOfDay = 'day' | 'dusk' | 'night';

export interface InstallationState {
  beams: BeamState[];
  globalBrightness: number;
  haze: number;
  timeOfDay: TimeOfDay;
}

export interface InstallationConfig {
  numCannons: number;
  gridColumns: number;
  footprintFt: number;     // total footprint width/depth in feet
  trussHeightFt: number;   // height of truss above ground
  beamHeightFt: number;    // visible beam length
}

export const DEFAULT_CONFIG: InstallationConfig = {
  numCannons: 49,
  gridColumns: 7,
  footprintFt: 60,
  trussHeightFt: 14,
  beamHeightFt: 1500
};

/** Convert HSB (h:0-360, s:0-100, b:0-100) → RGB (0-1) */
export function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  const sat = s / 100;
  const val = b / 100;
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  let r = 0, g = 0, bl = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; bl = x; }
  else if (h < 240) { g = x; bl = c; }
  else if (h < 300) { r = x; bl = c; }
  else              { r = c; bl = x; }
  return [r + m, g + m, bl + m];
}

export function createDefaultBeams(config: InstallationConfig = DEFAULT_CONFIG): BeamState[] {
  const cols = config.gridColumns;
  return Array.from({ length: config.numCannons }, (_, i) => ({
    id: i,
    row: Math.floor(i / cols),
    col: i % cols,
    enabled: true,
    color: [1, 1, 1] as [number, number, number],
    intensity: 0.8,
    width: 1
  }));
}

export function createDefaultState(config?: InstallationConfig): InstallationState {
  return {
    beams: createDefaultBeams(config),
    globalBrightness: 1,
    haze: 0.4,
    timeOfDay: 'night'
  };
}
