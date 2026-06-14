import { createDefaultState, hsbToRgb, type BeamState, type InstallationConfig, type InstallationState, type TimeOfDay } from '../installation/BeamState';

export type StateChangeCallback = (state: InstallationState) => void;

/**
 * Manages installation state. Accepts messages from the Simulator
 * WebSocket (same protocol as the Canvas UI) and translates HSB grid
 * state into RGB beam state for the 3D renderer.
 */
export class StateController {
  state: InstallationState;
  private listeners: StateChangeCallback[] = [];
  private config: InstallationConfig;

  constructor(config: InstallationConfig) {
    this.config = config;
    this.state = createDefaultState(config);
  }

  onChange(cb: StateChangeCallback): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    for (const cb of this.listeners) cb(this.state);
  }

  /**
   * Handle a message from the Simulator WebSocket.
   * The Simulator broadcasts `{ type: 'state', grid: [{h,s,b}, ...] }`.
   */
  handleMessage(msg: Record<string, unknown>): void {
    if (msg.type === 'state' && Array.isArray(msg.grid)) {
      const grid = msg.grid as Array<{ h: number; s: number; b: number }>;
      for (let i = 0; i < Math.min(grid.length, this.state.beams.length); i++) {
        const { h, s, b } = grid[i];
        const beam = this.state.beams[i];
        beam.color = hsbToRgb(h, s, b);
        beam.intensity = b / 100;
        beam.enabled = b > 1;
      }
      this.notify();
    }
  }

  /** Direct API: set a single beam */
  setBeam(id: number, update: Partial<BeamState>): void {
    const beam = this.state.beams[id];
    if (!beam) return;
    Object.assign(beam, update);
    this.notify();
  }

  /** Direct API: set all beams */
  setAllBeams(color: [number, number, number], intensity = 0.8): void {
    for (const beam of this.state.beams) {
      beam.color = color;
      beam.intensity = intensity;
      beam.enabled = true;
    }
    this.notify();
  }

  setGlobalBrightness(v: number): void {
    this.state.globalBrightness = Math.max(0, Math.min(2, v));
    this.notify();
  }

  setHaze(v: number): void {
    this.state.haze = Math.max(0, Math.min(1, v));
    this.notify();
  }

  setTimeOfDay(tod: TimeOfDay): void {
    this.state.timeOfDay = tod;
    this.notify();
  }

  getConfig(): InstallationConfig {
    return this.config;
  }
}
