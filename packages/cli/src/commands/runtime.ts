/**
 * Shared runtime wiring for the processes that actually run an installation:
 * `start` (fused server+receiver), `server` (brain only), `receiver` (only).
 * Keeps the store→env plumbing in one place so the three entry points stay in
 * lockstep on secrets, paths, and UI asset resolution.
 */
import { type ResolvedConfig } from '@wavegrid/layout';
import { type SettingsStore } from '@wavegrid/settings';
import { networkInterfaces } from 'os';
import { join } from 'path';
import c from 'yanse';

import { applyConfigToEnv } from './env';

/** Locate the built UI (Vite `dist`) so the server can serve it on its port. */
export function resolveUiDir(): string | undefined {
  if (process.env.WG_UI_DIR) return process.env.WG_UI_DIR;
  try {
    return join(require.resolve('@wavegrid/ui/package.json'), '..', 'dist');
  } catch {
    return undefined;
  }
}

/**
 * Wire the env the in-process server reads. The store is authoritative for the
 * JWT secret (a stale ambient value would desync UI/server and 401 the WS
 * upgrade — the red status-dot bug); the receiver key may be operator-set so it
 * can be shared across laptops.
 */
export function applyServerEnv(store: SettingsStore, project: string, resolved: ResolvedConfig): void {
  if (!process.env.WG_RECEIVER_KEY) process.env.WG_RECEIVER_KEY = store.requireSecret(project, 'receiverKey');
  process.env.WG_JWT_SECRET = store.requireSecret(project, 'jwtSecret');
  applyConfigToEnv(resolved.config);
  if (!process.env.WG_STATE_DIR) process.env.WG_STATE_DIR = store.stateDir(project);
  const uiDir = resolveUiDir();
  if (uiDir && !process.env.WG_UI_DIR) process.env.WG_UI_DIR = uiDir;
}

/** Wire the env the in-process receiver reads (upstream URL, key, shard, log). */
export function applyReceiverEnv(store: SettingsStore, project: string, resolved: ResolvedConfig): void {
  if (!process.env.WG_RECEIVER_KEY) process.env.WG_RECEIVER_KEY = store.requireSecret(project, 'receiverKey');
  applyConfigToEnv(resolved.config);
  if (!process.env.WG_STATE_DIR) process.env.WG_STATE_DIR = store.stateDir(project);
  if (!process.env.RECEIVER_LOG) process.env.RECEIVER_LOG = join(store.logsDir(project), 'receiver.log');
  // Machine-local device identity so the server can enumerate laptops by a
  // stable id + friendly name (self-registration).
  const device = store.getDevice();
  if (!process.env.WG_DEVICE_ID) process.env.WG_DEVICE_ID = device.id;
  if (!process.env.WG_DEVICE_NAME) process.env.WG_DEVICE_NAME = device.name;
}

/** IPv4 LAN addresses of this machine — the URLs operators point iPads/receivers at. */
export function lanAddresses(): string[] {
  const out: string[] = [];
  const ifaces = networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

/** Print the reachable URLs for a running brain on `port` (server side of discovery). */
export function printLanUrls(port: number): void {
  const addrs = lanAddresses();
  console.log('');
  console.log(`  ${c.bold('Reachable at')}`);
  console.log(`  → ${c.cyan(`http://localhost:${port}`)}  ${c.gray('(this machine)')}`);
  for (const ip of addrs) {
    console.log(`  → ${c.cyan(`http://${ip}:${port}`)}  ${c.gray('(LAN — open the UI / point receivers here)')}`);
  }
  if (addrs.length === 0) {
    console.log(`  ${c.yellow('No LAN address detected — check Wi-Fi/Ethernet.')}`);
  }
  console.log('');
}

/**
 * Parse a `--shard 0-24` flag into SHARD_START/SHARD_END env vars the receiver
 * reads. Accepts `start-end` or a bare `start` (single cannon). Returns false
 * on a malformed value.
 */
export function applyShardFlag(shard: unknown): boolean {
  if (shard === undefined) return true;
  const raw = String(shard).trim();
  const m = /^(\d+)(?:-(\d+))?$/.exec(raw);
  if (!m) return false;
  const start = parseInt(m[1], 10);
  const end = m[2] !== undefined ? parseInt(m[2], 10) : start;
  if (end < start) return false;
  process.env.SHARD_START = String(start);
  process.env.SHARD_END = String(end);
  return true;
}
