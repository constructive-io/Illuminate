/**
 * OSC output adapters for Pangolin BEYOND and FB4 hardware.
 *
 * These adapters convert the internal HSB grid state to OSC messages
 * and send them via UDP. Each adapter implements the OutputAdapter
 * interface so it can be swapped into the receiver without modifying
 * the receiver core.
 *
 * OSC addressing follows Pangolin's documented schemas:
 *   BEYOND: /beyond/zone/{index}/livecontrol/{property}
 *   FB4:    /FB4-{serial}/{command}
 */

import { Client, Message } from 'node-osc';

import { hsbToRgb100, hsbToRgb255 } from './color';

/** When true, log every OSC message sent. Set via DEBUG_OSC=1 env var. */
export const DEBUG_OSC = !!process.env.DEBUG_OSC;

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

/** HSB state for a single cannon/beam. */
export interface CannonState {
  h: number; // hue 0–360
  s: number; // saturation 0–100
  b: number; // brightness 0–100
}

/** Generic output adapter interface. */
export interface OutputAdapter {
  send(grid: CannonState[]): void;
  close(): void;
}

/** A single OSC message: address + one or more float arguments. */
export interface OscMessage {
  address: string;
  value: number | number[];
}

/** Send an OSC message with explicit float typing (single or multi-value). */
function sendFloats(client: Client, address: string, value: number | number[]): void {
  const msg = new Message(address);
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    msg.append({ type: 'float', value: v });
  }
  client.send(msg);
}

// ═══════════════════════════════════════════════════
// BEYOND OSC Output Adapter
// ═══════════════════════════════════════════════════

/** Color mode for BEYOND output. */
export type BeyondColorMode = 'slider' | 'rgba' | 'rgb';

export interface BeyondOscConfig {
  /** UDP target host (IP or hostname). */
  host: string;
  /** UDP target port (BEYOND OSC receive port, configurable in BEYOND). */
  port: number;
  /**
   * Map of logical grid index → BEYOND projector list index.
   * Only mapped cannons are sent; unmapped indices are skipped.
   */
  projectorMap: Record<number, number>;
  /**
   * Send rate throttle — only send every N frames.
   * At 60fps tick rate, sendEveryNFrames=2 gives 30Hz output.
   * Default: 2 (30Hz).
   */
  sendEveryNFrames?: number;
  /**
   * Color control mode:
   *   'slider' — ColorSlider 28–218 + white zone (default)
   *   'rgb'    — separate alpha+red+green+blue messages (0–255 each)
   *   'rgba'   — RGBA 4-float message (R,G,B,A 0–255) [experimental]
   * Override with BEYOND_COLOR_MODE env var.
   */
  colorMode?: BeyondColorMode;
}

/**
 * BEYOND ColorSlider range — the usable portion of the 0–255 slider.
 *   28–218  = color spectrum (ROYGBIV)
 *   <~25    = falls off to black/yellow
 *   >~221   = desaturates to white
 * Override with BEYOND_COLOR_MIN / BEYOND_COLOR_MAX / BEYOND_COLOR_WHITE env vars.
 */
export const BEYOND_COLOR_MIN = Number(process.env.BEYOND_COLOR_MIN) || 28;
export const BEYOND_COLOR_MAX = Number(process.env.BEYOND_COLOR_MAX) || 218;
export const BEYOND_COLOR_WHITE = Number(process.env.BEYOND_COLOR_WHITE) || 240;

/** Saturation threshold below which we treat the color as white. */
const WHITE_SAT_THRESHOLD = 10;

/**
 * Map HSB hue + saturation to BEYOND ColorSlider value.
 * Low saturation → white zone (above 221); otherwise linear 28–218.
 */
export function hueToColorSlider(h: number, s: number = 100): number {
  if (s <= WHITE_SAT_THRESHOLD) return BEYOND_COLOR_WHITE;
  const hue = ((h % 360) + 360) % 360;
  return BEYOND_COLOR_MIN + (hue / 360) * (BEYOND_COLOR_MAX - BEYOND_COLOR_MIN);
}

/**
 * Encode a grid snapshot into BEYOND OSC messages.
 * Exported for testing — the adapter calls this internally.
 *
 * BEYOND livecontrol uses zone-level addressing (case-sensitive).
 *
 * slider mode (default):
 *   /beyond/zone/{n}/livecontrol/ColorSlider  (0–255 float)
 *   /beyond/zone/{n}/livecontrol/Brightness   (0–100 float)
 *
 * rgb mode:
 *   /beyond/zone/{n}/livecontrol/alpha  (255 = full override)
 *   /beyond/zone/{n}/livecontrol/red    (0–255 float)
 *   /beyond/zone/{n}/livecontrol/green  (0–255 float)
 *   /beyond/zone/{n}/livecontrol/blue   (0–255 float)
 *   /beyond/zone/{n}/livecontrol/Brightness   (0–100 float)
 *
 * rgba mode (experimental):
 *   /beyond/zone/{n}/livecontrol/RGBA  (4 floats: R,G,B,A  0–255)
 *   /beyond/zone/{n}/livecontrol/Brightness   (0–100 float)
 */
export function encodeBeyondMessages(
  grid: CannonState[],
  projectorMap: Record<number, number>,
  prevGrid?: CannonState[],
  colorMode: BeyondColorMode = 'slider'
): OscMessage[] {
  const messages: OscMessage[] = [];

  for (let i = 0; i < grid.length; i++) {
    const projIndex = projectorMap[i];
    if (projIndex === undefined) continue;

    const cannon = grid[i];

    // Skip if state hasn't changed since last frame
    if (prevGrid && prevGrid[i]) {
      const prev = prevGrid[i];
      if (cannon.h === prev.h && cannon.s === prev.s && cannon.b === prev.b) continue;
    }

    const prefix = `/beyond/zone/${projIndex}/livecontrol`;

    if (colorMode === 'rgb') {
      const rgb = hsbToRgb255(cannon.h, cannon.s, cannon.b);
      messages.push({ address: `${prefix}/alpha`, value: 255 });
      messages.push({ address: `${prefix}/red`, value: rgb.r });
      messages.push({ address: `${prefix}/green`, value: rgb.g });
      messages.push({ address: `${prefix}/blue`, value: rgb.b });
    } else if (colorMode === 'rgba') {
      const rgb = hsbToRgb255(cannon.h, cannon.s, cannon.b);
      messages.push({ address: `${prefix}/RGBA`, value: [rgb.r, rgb.g, rgb.b, 0] });
    } else {
      messages.push({ address: `${prefix}/ColorSlider`, value: hueToColorSlider(cannon.h, cannon.s) });
    }
    messages.push({ address: `${prefix}/Brightness`, value: Math.round(cannon.b) });
  }

  return messages;
}

export class BeyondOscOutput implements OutputAdapter {
  private client: Client | null = null;
  private config: BeyondOscConfig;
  private frameCount = 0;
  private sendInterval: number;
  private prevGrid: CannonState[] | undefined;
  private colorMode: BeyondColorMode;

  constructor(config: BeyondOscConfig) {
    this.config = config;
    this.sendInterval = config.sendEveryNFrames ?? 2;
    this.colorMode = config.colorMode ?? 'slider';
  }

  /** Initialize the UDP client. Call before receiver.start(). */
  connect(): void {
    this.client = new Client(this.config.host, this.config.port);
  }

  send(grid: CannonState[]): void {
    this.frameCount++;
    if (this.frameCount % this.sendInterval !== 0) return;
    if (!this.client) return;

    const messages = encodeBeyondMessages(grid, this.config.projectorMap, this.prevGrid, this.colorMode);

    // Snapshot current state for next-frame diff
    this.prevGrid = grid.map(c => ({ h: c.h, s: c.s, b: c.b }));

    if (messages.length === 0) return;

    if (DEBUG_OSC) {
      const sample = messages.slice(0, 2);
      const lines = sample.map(m => {
        const v = Array.isArray(m.value) ? m.value.join(', ') : m.value;
        return `    ${m.address} = ${v}`;
      });
      console.log(`  [OSC→BEYOND] frame ${this.frameCount} | ${messages.length} msgs (${this.colorMode}) to ${this.config.host}:${this.config.port}`);
      for (const line of lines) console.log(line);
      if (messages.length > 2) console.log(`    ... +${messages.length - 2} more`);
    }
    for (const msg of messages) {
      sendFloats(this.client, msg.address, msg.value);
    }
  }

  close(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

// ═══════════════════════════════════════════════════
// FB4 OSC Output Adapter
// ═══════════════════════════════════════════════════

export interface FB4OscConfig {
  /** UDP target host (FB4 device IP). */
  host: string;
  /** UDP target port (FB4 listens on 8000). Default: 8000. */
  port?: number;
  /**
   * Map of logical grid index → 5-digit FB4 serial string.
   * Only mapped cannons are sent; unmapped indices are skipped.
   */
  serialMap: Record<number, string>;
  /** Send rate throttle. Default: 2 (30Hz at 60fps). */
  sendEveryNFrames?: number;
}

/**
 * Encode a grid snapshot into FB4 OSC messages.
 * Exported for testing.
 *
 * FB4 uses serial-number-based addresses:
 *   /FB4-{serial}/color_red   (0–100)
 *   /FB4-{serial}/color_green (0–100)
 *   /FB4-{serial}/color_blue  (0–100)
 */
export function encodeFB4Messages(
  grid: CannonState[],
  serialMap: Record<number, string>,
  prevGrid?: CannonState[]
): OscMessage[] {
  const messages: OscMessage[] = [];

  for (let i = 0; i < grid.length; i++) {
    const serial = serialMap[i];
    if (serial === undefined) continue;

    const cannon = grid[i];

    if (prevGrid && prevGrid[i]) {
      const prev = prevGrid[i];
      if (cannon.h === prev.h && cannon.s === prev.s && cannon.b === prev.b) continue;
    }

    const rgb = hsbToRgb100(cannon.h, cannon.s, cannon.b);

    messages.push({ address: `/FB4-${serial}/color_red`, value: rgb.r });
    messages.push({ address: `/FB4-${serial}/color_green`, value: rgb.g });
    messages.push({ address: `/FB4-${serial}/color_blue`, value: rgb.b });
  }

  return messages;
}

export class FB4OscOutput implements OutputAdapter {
  private client: Client | null = null;
  private config: Required<Pick<FB4OscConfig, 'host' | 'port' | 'serialMap'>> & Pick<FB4OscConfig, 'sendEveryNFrames'>;
  private frameCount = 0;
  private sendInterval: number;
  private prevGrid: CannonState[] | undefined;

  constructor(config: FB4OscConfig) {
    this.config = {
      ...config,
      port: config.port ?? 8000
    };
    this.sendInterval = config.sendEveryNFrames ?? 2;
  }

  connect(): void {
    this.client = new Client(this.config.host, this.config.port);
  }

  send(grid: CannonState[]): void {
    this.frameCount++;
    if (this.frameCount % this.sendInterval !== 0) return;
    if (!this.client) return;

    const messages = encodeFB4Messages(grid, this.config.serialMap, this.prevGrid);
    this.prevGrid = grid.map(c => ({ h: c.h, s: c.s, b: c.b }));

    if (messages.length === 0) return;

    if (DEBUG_OSC) {
      const sample = messages.slice(0, 3);
      const lines = sample.map(m => `    ${m.address} = ${m.value}`);
      console.log(`  [OSC→FB4] frame ${this.frameCount} | ${messages.length} msgs to ${this.config.host}:${this.config.port}`);
      for (const line of lines) console.log(line);
      if (messages.length > 3) console.log(`    ... +${messages.length - 3} more`);
    }
    for (const msg of messages) {
      sendFloats(this.client, msg.address, msg.value);
    }
  }

  close(): void {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }
}

// ═══════════════════════════════════════════════════
// Routed OSC Output — dispatches by per-cannon routing config
// ═══════════════════════════════════════════════════

/**
 * Declares a named OSC target (a BEYOND instance or FB4 device).
 */
export interface OscTarget {
  type: 'beyond' | 'fb4';
  host: string;
  port: number;
  /** Color mode for BEYOND targets. Default: 'slider'. */
  colorMode?: BeyondColorMode;
}

/**
 * Maps a single logical cannon to its physical target.
 */
export interface CannonRoute {
  /** Logical grid index. */
  logical: number;
  /** Name of the target in the targets map. */
  target: string;
  /** Grid coordinates for debugging. */
  row?: number;
  col?: number;
  /** Human-readable label. */
  label?: string;
  /** BEYOND projector list index (required when target type is 'beyond'). */
  projectorIndex?: number;
  /** FB4 5-digit serial (required when target type is 'fb4'). */
  fb4Serial?: string;
  /** If true, this cannon is intentionally disabled in software. */
  safeDisabled?: boolean;
}

/**
 * Full routing configuration loaded from a JSON file.
 */
export interface RoutingConfig {
  targets: Record<string, OscTarget>;
  cannons: CannonRoute[];
  /** Global send rate (Hz). Default: 30. */
  flushHz?: number;
}

/**
 * Creates an OutputAdapter from a routing config.
 * Internally builds BEYOND and FB4 adapters for each target
 * and dispatches per-cannon state to the right adapter.
 */
export function createRoutedOutput(config: RoutingConfig): RoutedOscOutput {
  return new RoutedOscOutput(config);
}

export class RoutedOscOutput implements OutputAdapter {
  private adapters: Map<string, BeyondOscOutput | FB4OscOutput> = new Map();
  private frameCount = 0;
  private sendInterval: number;

  constructor(config: RoutingConfig) {
    const flushHz = config.flushHz ?? 30;
    this.sendInterval = Math.max(1, Math.round(60 / flushHz));

    const beyondMaps: Record<string, Record<number, number>> = {};
    const fb4Maps: Record<string, Record<number, string>> = {};

    for (const cannon of config.cannons) {
      if (cannon.safeDisabled) continue;
      const target = config.targets[cannon.target];
      if (!target) continue;

      if (target.type === 'beyond' && cannon.projectorIndex !== undefined) {
        if (!beyondMaps[cannon.target]) beyondMaps[cannon.target] = {};
        beyondMaps[cannon.target][cannon.logical] = cannon.projectorIndex;
      } else if (target.type === 'fb4' && cannon.fb4Serial !== undefined) {
        if (!fb4Maps[cannon.target]) fb4Maps[cannon.target] = {};
        fb4Maps[cannon.target][cannon.logical] = cannon.fb4Serial;
      }
    }

    for (const [name, projectorMap] of Object.entries(beyondMaps)) {
      const target = config.targets[name];
      this.adapters.set(name, new BeyondOscOutput({
        host: target.host,
        port: target.port,
        projectorMap,
        colorMode: target.colorMode,
        sendEveryNFrames: 1
      }));
    }

    for (const [name, serialMap] of Object.entries(fb4Maps)) {
      const target = config.targets[name];
      this.adapters.set(name, new FB4OscOutput({
        host: target.host,
        port: target.port,
        serialMap,
        sendEveryNFrames: 1
      }));
    }
  }

  /** Initialize all sub-adapter UDP clients. */
  connect(): void {
    for (const adapter of this.adapters.values()) {
      adapter.connect();
    }
  }

  send(grid: CannonState[]): void {
    this.frameCount++;
    if (this.frameCount % this.sendInterval !== 0) return;

    for (const adapter of this.adapters.values()) {
      adapter.send(grid);
    }
  }

  close(): void {
    for (const adapter of this.adapters.values()) {
      adapter.close();
    }
    this.adapters.clear();
  }

  /** Returns the list of active target names for inspection. */
  get targetNames(): string[] {
    return [...this.adapters.keys()];
  }
}
