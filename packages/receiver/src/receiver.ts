/**
 * The Receiver — the brain of the Illuminate installation.
 *
 * A pure state engine that:
 *   1. Receives grid state from an InputAdapter (upstream source)
 *   2. Runs an independent low-pass filter (smooth, never jolts)
 *   3. Falls back to 3D sine waves on signal loss
 *   4. Sends filtered output to an OutputAdapter (hardware target)
 *
 * Both input and output are pluggable adapters — swap them to connect
 * to any protocol or hardware without modifying the receiver core.
 */

import { ConsoleOutput, InputAdapter, OutputAdapter, WebSocketInput } from './adapters';
import { computeFallbackFrame, DEFAULT_FALLBACK_CONFIG, FallbackConfig } from './fallback';
import {
  applyUpstreamState,
  CannonState,
  createFilteredGrid,
  DEFAULT_RECEIVER_ALPHA,
  FilteredCannon,
  tickFilter
} from './filter';

export interface ReceiverConfig {
  /** Input adapter — where state comes from. */
  input: InputAdapter;
  /** Output adapter — where filtered state goes. */
  output: OutputAdapter;
  /** Low-pass filter alpha (lower = smoother). Default 0.06. */
  alpha: number;
  /** Ms of no data before switching to fallback. Default 3000. */
  fallbackDelay: number;
  /** Fallback animation config. */
  fallback: FallbackConfig;
  /** Tick rate in ms (default 1000/60 ~ 16.67ms). */
  tickMs: number;
}

export const DEFAULT_RECEIVER_CONFIG: ReceiverConfig = {
  input: new WebSocketInput({ url: 'ws://localhost:3000' }),
  output: new ConsoleOutput(),
  alpha: DEFAULT_RECEIVER_ALPHA,
  fallbackDelay: 3000,
  fallback: DEFAULT_FALLBACK_CONFIG,
  tickMs: 1000 / 60
};

export type ReceiverStatus = 'connected' | 'reconnecting' | 'fallback';

export interface ReceiverState {
  status: ReceiverStatus;
  grid: FilteredCannon[];
  tick: number;
  lastDataAt: number;
  fallbackActive: boolean;
}

export class Receiver {
  private config: ReceiverConfig;
  private grid: FilteredCannon[];
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private lastDataAt = Date.now();
  private _status: ReceiverStatus = 'reconnecting';
  private _fallbackActive = false;
  private _running = false;

  constructor(config: Partial<ReceiverConfig> = {}) {
    this.config = { ...DEFAULT_RECEIVER_CONFIG, ...config };
    this.grid = createFilteredGrid();
  }

  get status(): ReceiverStatus { return this._status; }
  get fallbackActive(): boolean { return this._fallbackActive; }

  /** Get the current output state (after filtering). */
  getOutputState(): CannonState[] {
    return this.grid.map(c => ({
      h: c.h,
      s: c.s,
      b: c.b
    }));
  }

  /** Start the receiver — connects input and begins the tick loop. */
  start() {
    if (this._running) return;
    this._running = true;
    this.bindInput();
    this.startTickLoop();
    console.log('  \u25C8 Receiver started');
  }

  /** Stop the receiver — disconnects and stops the tick loop. */
  stop() {
    this._running = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.config.input.disconnect();
    this.config.output.close();
    console.log('  \u25C8 Receiver stopped');
  }

  private bindInput() {
    const input = this.config.input;

    input.on('connected', () => {
      this._status = 'connected';
      this.lastDataAt = Date.now();
      console.log('  \u25C8 Input connected');
    });

    input.on('state', (upstream: CannonState[]) => {
      this.lastDataAt = Date.now();
      applyUpstreamState(this.grid, upstream);

      if (this._fallbackActive) {
        console.log('\n  \u25C8 Signal restored \u2014 blending back from fallback');
        this._fallbackActive = false;
      }
    });

    input.on('disconnected', () => {
      this._status = 'reconnecting';
      console.log('\n  \u25C8 Input disconnected');
    });

    input.connect();
  }

  private startTickLoop() {
    this.tickTimer = setInterval(() => {
      this.tick++;
      const now = Date.now();
      const timeSinceData = now - this.lastDataAt;

      // Check if we should switch to fallback
      if (timeSinceData > this.config.fallbackDelay && !this._fallbackActive) {
        this._fallbackActive = true;
        this._status = 'fallback';
        console.log('\n  \u25C8 Signal lost \u2014 entering sine wave fallback');
      }

      // If fallback is active, compute sine wave targets
      if (this._fallbackActive) {
        computeFallbackFrame(this.grid, this.tick, this.config.fallback);
      }

      // Always tick the low-pass filter — this ensures smooth output
      // whether receiving data, transitioning to fallback, or in fallback
      tickFilter(this.grid, this.config.alpha);

      // Send filtered output to the output adapter
      this.config.output.send(this.getOutputState());
    }, this.config.tickMs);
  }
}
