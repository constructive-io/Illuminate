/**
 * Receiver entry point.
 *
 * Configure input and output adapters via environment variables:
 *
 *   SIMULATOR_URL      WebSocket upstream (default ws://localhost:3000)
 *   WG_RECEIVER_KEY    Auth key for server connection (must match server's WG_RECEIVER_KEY)
 *   RECEIVER_ALPHA     LP filter alpha (default 0.06)
 *   FALLBACK_DELAY     Ms before sine fallback (default 3000)
 *   WS_OUTPUT_PORT     Optional WebSocket relay port
 *   SHARD_START/END    Optional cannon index range
 *   NUM_CANNONS        Total cannons in grid (default 49)
 *   GRID_COLUMNS       Number of columns (default 7)
 *   ROUTING_CONFIG     Path to a JSON routing config file (enables OSC output)
 *   BEYOND_HOST/PORT   Quick single-target BEYOND OSC (alternative to routing file)
 *   BEYOND_GRID_ORDER  Grid-to-projector mapping: "row" (default) or "column"
 *   FB4_HOST/PORT      Quick single-target FB4 OSC (alternative to routing file)
 */

import { BeyondOscOutput, createRoutedOutput, FB4OscOutput } from '@wavegrid/osc';
import * as fs from 'fs';
import { resolve } from 'path';

import { ConsoleOutput, MultiOutput, OutputAdapter, WebSocketInput, WebSocketOutput } from './adapters';
import { startDebugUI } from './debug-ui';
import { DEFAULT_GRID_COLUMNS, DEFAULT_NUM_CANNONS } from './filter';
import { Receiver, ShardConfig } from './receiver';

const RAW_SIMULATOR_URL = process.env.SIMULATOR_URL || 'ws://localhost:3000';
const RECEIVER_KEY = process.env.WG_RECEIVER_KEY || '';
const SIMULATOR_URL = RECEIVER_KEY
  ? (() => { const u = new URL(RAW_SIMULATOR_URL); u.searchParams.set('key', RECEIVER_KEY); return u.toString(); })()
  : RAW_SIMULATOR_URL;
const ALPHA = parseFloat(process.env.RECEIVER_ALPHA || '0.06');
const FALLBACK_DELAY = parseInt(process.env.FALLBACK_DELAY || '3000', 10);
const WS_OUTPUT_PORT = process.env.WS_OUTPUT_PORT ? parseInt(process.env.WS_OUTPUT_PORT, 10) : undefined;
const NUM_CANNONS = process.env.NUM_CANNONS ? parseInt(process.env.NUM_CANNONS, 10) : DEFAULT_NUM_CANNONS;
const GRID_COLUMNS = process.env.GRID_COLUMNS ? parseInt(process.env.GRID_COLUMNS, 10) : DEFAULT_GRID_COLUMNS;
const LIGHT_MAP_FILE = process.env.LIGHT_MAP_CONFIG || resolve(process.cwd(), '../../deploy/light-map.json');

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
const savedPhysicalMap = loadPhysicalLightMap(NUM_CANNONS);

// ─── OSC output adapters (from @wavegrid/osc) ───
if (process.env.ROUTING_CONFIG) {
  const configPath = resolve(process.env.ROUTING_CONFIG.startsWith('/')
    ? process.env.ROUTING_CONFIG
    : resolve(process.cwd(), '../../', process.env.ROUTING_CONFIG));
  const raw = fs.readFileSync(configPath, 'utf8');
  const routingConfig = savedPhysicalMap
    ? applyPhysicalMapToRoutingConfig(JSON.parse(raw), savedPhysicalMap)
    : JSON.parse(raw);
  const routed = createRoutedOutput(routingConfig);
  routed.connect();
  outputs.push(routed);
  outputLabels.push(`Routed OSC → [${routed.targetNames.join(', ')}]${savedPhysicalMap ? ' (light-map)' : ''}`);
}

if (process.env.BEYOND_HOST) {
  const host = process.env.BEYOND_HOST;
  const port = parseInt(process.env.BEYOND_PORT || '7001', 10);
  const gridOrder = (process.env.BEYOND_GRID_ORDER || 'row').toLowerCase();
  const projectorMap: Record<number, number> = {};
  const rows = Math.ceil(NUM_CANNONS / GRID_COLUMNS);
  for (let i = 0; i < NUM_CANNONS; i++) {
    if (savedPhysicalMap) {
      projectorMap[i] = savedPhysicalMap[i];
    } else if (gridOrder === 'column') {
      const r = Math.floor(i / GRID_COLUMNS);
      const c = i % GRID_COLUMNS;
      projectorMap[i] = c * rows + r;
    } else {
      projectorMap[i] = i;
    }
  }
  const beyond = new BeyondOscOutput({ host, port, projectorMap });
  beyond.connect();
  outputs.push(beyond);
  outputLabels.push(`BEYOND OSC → ${host}:${port} (${savedPhysicalMap ? 'light-map' : `${gridOrder}-major`}, rgb)`);
}

if (process.env.FB4_HOST) {
  const host = process.env.FB4_HOST;
  const port = parseInt(process.env.FB4_PORT || '8000', 10);
  console.warn('  ⚠ FB4_HOST set but no serial map — use ROUTING_CONFIG for per-cannon FB4 mapping');
  const fb4 = new FB4OscOutput({ host, port, serialMap: {} });
  fb4.connect();
  outputs.push(fb4);
  outputLabels.push(`FB4 OSC → ${host}:${port}`);
}

if (!process.env.BEYOND_HOST && !process.env.FB4_HOST && !process.env.ROUTING_CONFIG) {
  console.warn('  ⚠ No OSC target configured (set BEYOND_HOST, FB4_HOST, or ROUTING_CONFIG to enable)');
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
if (process.env.DEBUG_OSC) console.log('  → DEBUG_OSC: enabled (logging all OSC messages)');
console.log('');

receiver.start();

// ─── Debug UI (optional) ───
const DEBUG_UI_PORT = process.env.DEBUG_UI_PORT ? parseInt(process.env.DEBUG_UI_PORT, 10) : undefined;
if (DEBUG_UI_PORT) {
  startDebugUI({
    port: DEBUG_UI_PORT,
    gridColumns: GRID_COLUMNS,
    getGrid: () => receiver.rawGrid
  });
}

// ─── Crash logging ───
const LOG_FILE = process.env.RECEIVER_LOG || resolve(process.cwd(), 'wavegrid-receiver.log');

function logToFile(level: string, msg: string) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${level}: ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch { /* best effort */ }
}

process.on('uncaughtException', (err) => {
  const msg = `Uncaught exception: ${err.stack || err.message || String(err)}`;
  console.error(`\n  ✖ ${msg}`);
  logToFile('FATAL', msg);
  receiver.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = `Unhandled rejection: ${reason instanceof Error ? (reason.stack || reason.message) : String(reason)}`;
  console.error(`\n  ✖ ${msg}`);
  logToFile('ERROR', msg);
});

// Log startup
logToFile('INFO', `Receiver started — ${SIMULATOR_URL}, ${NUM_CANNONS} cannons (${GRID_COLUMNS} cols)`);
console.log(`  → Log file: ${LOG_FILE}`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n  Shutting down...');
  logToFile('INFO', 'Receiver stopped (SIGINT)');
  receiver.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  logToFile('INFO', 'Receiver stopped (SIGTERM)');
  receiver.stop();
  process.exit(0);
});

function loadPhysicalLightMap(numCannons: number): number[] | null {
  if (!fs.existsSync(LIGHT_MAP_FILE)) return null;

  try {
    const raw = fs.readFileSync(LIGHT_MAP_FILE, 'utf8');
    const config = JSON.parse(raw);
    if (!Array.isArray(config.physicalLights)) return null;

    const fallback = Array.from({ length: numCannons }, (_, index) => index);
    const used = new Set<number>();
    const physicalLights = config.physicalLights.slice(0, numCannons).map((value: unknown) => {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n >= numCannons || used.has(n)) return -1;
      used.add(n);
      return n;
    });

    for (let index = 0; index < numCannons; index++) {
      if (physicalLights[index] !== undefined && physicalLights[index] >= 0) continue;
      const next = fallback.find(value => !used.has(value));
      physicalLights[index] = next ?? index;
      used.add(physicalLights[index]);
    }

    return physicalLights;
  } catch (error) {
    console.warn(`  ⚠ Could not read light map ${LIGHT_MAP_FILE}: ${(error as Error).message}`);
    return null;
  }
}

function applyPhysicalMapToRoutingConfig(config: any, physicalMap: number[]) {
  if (!Array.isArray(config?.cannons)) return config;

  const routeByPhysical = new Map<number, any>();
  for (const cannon of config.cannons) {
    if (typeof cannon.logical === 'number') {
      routeByPhysical.set(cannon.logical, cannon);
    }
  }

  const cannons = physicalMap
    .map((physicalIndex, logicalIndex) => {
      const route = routeByPhysical.get(physicalIndex);
      if (!route) return null;
      return {
        ...route,
        logical: logicalIndex,
        label: route.label ? `${route.label} ← software ${logicalIndex}` : `software ${logicalIndex} → physical ${physicalIndex}`
      };
    })
    .filter(Boolean);

  return {
    ...config,
    cannons
  };
}
