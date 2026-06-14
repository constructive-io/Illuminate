/**
 * OSC output adapters for Pangolin BEYOND and FB4 hardware.
 *
 * These adapters convert the internal HSB grid state to OSC messages
 * and send them via UDP. Each adapter implements the OutputAdapter
 * interface from wavegrid so it can be swapped in without modifying
 * the receiver core.
 *
 * OSC addressing follows Pangolin's documented schemas:
 *   BEYOND: /beyond/projector/{index}/livecontrol/{property}
 *   FB4:    /FB4-{serial}/{command}
 */

import { Client } from 'node-osc';
import { CannonState, OutputAdapter } from 'wavegrid';

import { hsbToRgb100, hsbToRgb255 } from './color';

// ═══════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════

/** A single OSC message: address + numeric argument. */
export interface OscMessage {
  address: string;
  value: number;
}

// ═══════════════════════════════════════════════════
// BEYOND OSC Output Adapter
// ═══════════════════════════════════════════════════

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
}

/**
 * Encode a grid snapshot into BEYOND OSC messages.
 * Exported for testing — the adapter calls this internally.
 *
 * BEYOND livecontrol uses:
 *   /beyond/projector/{n}/livecontrol/red    (0–255)
 *   /beyond/projector/{n}/livecontrol/green  (0–255)
 *   /beyond/projector/{n}/livecontrol/blue   (0–255)
 *   /beyond/projector/{n}/livecontrol/brightness (0–100)
 */
export function encodeBeyondMessages(
  grid: CannonState[],
  projectorMap: Record<number, number>
): OscMessage[] {
  const messages: OscMessage[] = [];

  for (let i = 0; i < grid.length; i++) {
    const projIndex = projectorMap[i];
    if (projIndex === undefined) continue;

    const cannon = grid[i];
    const rgb = hsbToRgb255(cannon.h, cannon.s, cannon.b);
    const prefix = `/beyond/projector/${projIndex}/livecontrol`;

    messages.push({ address: `${prefix}/red`, value: rgb.r });
    messages.push({ address: `${prefix}/green`, value: rgb.g });
    messages.push({ address: `${prefix}/blue`, value: rgb.b });
    messages.push({ address: `${prefix}/brightness`, value: Math.round(cannon.b) });
  }

  return messages;
}

export class BeyondOscOutput implements OutputAdapter {
  private client: Client | null = null;
  private config: BeyondOscConfig;
  private frameCount = 0;
  private sendInterval: number;

  constructor(config: BeyondOscConfig) {
    this.config = config;
    this.sendInterval = config.sendEveryNFrames ?? 2;
  }

  /** Initialize the UDP client. Call before receiver.start(). */
  connect(): void {
    this.client = new Client(this.config.host, this.config.port);
  }

  send(grid: CannonState[]): void {
    this.frameCount++;
    if (this.frameCount % this.sendInterval !== 0) return;
    if (!this.client) return;

    const messages = encodeBeyondMessages(grid, this.config.projectorMap);
    for (const msg of messages) {
      this.client.send(msg.address, msg.value);
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
  serialMap: Record<number, string>
): OscMessage[] {
  const messages: OscMessage[] = [];

  for (let i = 0; i < grid.length; i++) {
    const serial = serialMap[i];
    if (serial === undefined) continue;

    const cannon = grid[i];
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

    const messages = encodeFB4Messages(grid, this.config.serialMap);
    for (const msg of messages) {
      this.client.send(msg.address, msg.value);
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
