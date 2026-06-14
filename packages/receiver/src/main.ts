/**
 * Receiver entry point.
 *
 * Configure input and output adapters via environment variables:
 *
 *   SIMULATOR_URL      WebSocket upstream (default ws://localhost:3000)
 *   RECEIVER_ALPHA     LP filter alpha (default 0.06)
 *   FALLBACK_DELAY     Ms before sine fallback (default 3000)
 *   WS_OUTPUT_PORT     Optional WebSocket relay port
 *   SHARD_START/END    Optional cannon index range
 *   NUM_CANNONS        Total cannons in grid (default 49)
 *   GRID_COLUMNS       Number of columns (default 7)
 *   ROUTING_CONFIG     Path to a JSON routing config file (enables OSC output)
 *   BEYOND_HOST/PORT   Quick single-target BEYOND OSC (alternative to routing file)
 *   FB4_HOST/PORT      Quick single-target FB4 OSC (alternative to routing file)
 */

import * as fs from 'fs';

import { ConsoleOutput, MultiOutput, OutputAdapter, WebSocketInput, WebSocketOutput } from './adapters';
import { DEFAULT_GRID_COLUMNS, DEFAULT_NUM_CANNONS } from './filter';
import { Receiver, ShardConfig } from './receiver';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'ws://localhost:3000';
const ALPHA = parseFloat(process.env.RECEIVER_ALPHA || '0.06');
const FALLBACK_DELAY = parseInt(process.env.FALLBACK_DELAY || '3000', 10);
const WS_OUTPUT_PORT = process.env.WS_OUTPUT_PORT ? parseInt(process.env.WS_OUTPUT_PORT, 10) : undefined;
const NUM_CANNONS = process.env.NUM_CANNONS ? parseInt(process.env.NUM_CANNONS, 10) : DEFAULT_NUM_CANNONS;
const GRID_COLUMNS = process.env.GRID_COLUMNS ? parseInt(process.env.GRID_COLUMNS, 10) : DEFAULT_GRID_COLUMNS;

let shard: ShardConfig | undefined;
if (process.env.SHARD_START !== undefined && process.env.SHARD_END !== undefined) {
  shard = {
    start: parseInt(process.env.SHARD_START, 10),
    end: parseInt(process.env.SHARD_END, 10)
  };
}

// ─── Input adapter ───
const input = new WebSocketInput({ url: SIMULATOR_URL });

// ─── Output adapter(s) ───
const outputs: OutputAdapter[] = [new ConsoleOutput()];
const outputLabels: string[] = ['Console'];

// OSC adapters are in @wavegrid/osc — try to load them if env vars are set
const hasOscConfig = process.env.ROUTING_CONFIG || process.env.BEYOND_HOST || process.env.FB4_HOST;
if (hasOscConfig) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const osc = require('@wavegrid/osc');

    if (process.env.ROUTING_CONFIG) {
      const raw = fs.readFileSync(process.env.ROUTING_CONFIG, 'utf8');
      const routingConfig = JSON.parse(raw);
      const routed = osc.createRoutedOutput(routingConfig);
      routed.connect();
      outputs.push(routed);
      outputLabels.push(`Routed OSC → [${routed.targetNames.join(', ')}]`);
    }

    if (process.env.BEYOND_HOST) {
      const host = process.env.BEYOND_HOST;
      const port = parseInt(process.env.BEYOND_PORT || '9000', 10);
      const projectorMap: Record<number, number> = {};
      for (let i = 0; i < NUM_CANNONS; i++) projectorMap[i] = i;
      const beyond = new osc.BeyondOscOutput({ host, port, projectorMap });
      beyond.connect();
      outputs.push(beyond);
      outputLabels.push(`BEYOND OSC → ${host}:${port}`);
    }

    if (process.env.FB4_HOST) {
      const host = process.env.FB4_HOST;
      const port = parseInt(process.env.FB4_PORT || '8000', 10);
      console.warn('  ⚠ FB4_HOST set but no serial map — use ROUTING_CONFIG for per-cannon FB4 mapping');
      const fb4 = new osc.FB4OscOutput({ host, port, serialMap: {} });
      fb4.connect();
      outputs.push(fb4);
      outputLabels.push(`FB4 OSC → ${host}:${port}`);
    }
  } catch (e) {
    console.warn('  ⚠ OSC env vars set but @wavegrid/osc is not installed. Run: pnpm add @wavegrid/osc');
  }
}

let wsOutput: WebSocketOutput | null = null;
if (WS_OUTPUT_PORT) {
  wsOutput = new WebSocketOutput({ port: WS_OUTPUT_PORT });
  wsOutput.listen();
  outputs.push(wsOutput);
  outputLabels.push(`WebSocket :${WS_OUTPUT_PORT}`);
}

const output = outputs.length === 1 ? outputs[0] : new MultiOutput(outputs);

// ─── Receiver ───
const receiver = new Receiver({
  input,
  output,
  alpha: ALPHA,
  fallbackDelay: FALLBACK_DELAY,
  shard,
  numCannons: NUM_CANNONS,
  gridColumns: GRID_COLUMNS
});

console.log('');
console.log('  ╭──────────────────────────────────────╮');
console.log('  │   Wavegrid · Receiver                 │');
console.log('  │   the brain                           │');
console.log('  ╰──────────────────────────────────────╯');
console.log('');
console.log(`  → Input:  WebSocket @ ${SIMULATOR_URL}`);
console.log(`  → Output: ${outputLabels.join(' + ')}`);
console.log(`  → Alpha: ${ALPHA}  Fallback delay: ${FALLBACK_DELAY}ms`);
console.log(`  → Grid: ${NUM_CANNONS} cannons (${GRID_COLUMNS} columns)`);
console.log(`  → Shard: ${shard ? `cannons ${shard.start}–${shard.end} (${shard.end - shard.start + 1} of ${NUM_CANNONS})` : `all cannons (no shard)`}`);
console.log('');

receiver.start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n  Shutting down...');
  receiver.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  receiver.stop();
  process.exit(0);
});
