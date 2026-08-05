/**
 * Pure diagnostic helpers for `wavegrid doctor`. Kept free of I/O so the check
 * logic is unit-testable; the command module wires these to the store, config,
 * filesystem, and a live server.
 */

import type { WavegridConfig } from '@wavegrid/layout';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface Check {
  name: string;
  status: CheckStatus;
  detail: string;
  /** Exact command/action to fix a warn/fail. */
  remedy?: string;
}

/**
 * Generic env vars that used to hijack the server config (`PORT` bound the
 * server to a stray :5000). They are no longer honored — only `WAVEGRID_*` is —
 * so if one is set we flag it as an ignored footgun the operator should clear.
 */
export const IGNORED_ENV_VARS = ['PORT', 'SIM_PORT', 'HOST', 'UI_PORT'] as const;

export function checkEnvHijack(env: NodeJS.ProcessEnv): Check {
  const present = IGNORED_ENV_VARS.filter(k => env[k] != null && env[k] !== '');
  if (present.length === 0) {
    return { name: 'Ambient env', status: 'pass', detail: 'no conflicting generic env vars set' };
  }
  const list = present.map(k => `${k}=${env[k]}`).join(', ');
  return {
    name: 'Ambient env',
    status: 'warn',
    detail: `generic env var(s) set but IGNORED by config: ${list}`,
    remedy: `unset ${present.join(' ')}   # use WAVEGRID_PORT / WAVEGRID_HOST / WAVEGRID_UI_PORT instead`
  };
}

/** Validate a receiver shard range against the layout's cannon count. */
export function checkShard(count: number, shard: { start: number; end: number } | undefined): Check {
  if (!shard) {
    return { name: 'Shard', status: 'pass', detail: 'no shard (drives all cannons)' };
  }
  const problems: string[] = [];
  if (shard.start < 0) problems.push(`start ${shard.start} < 0`);
  if (shard.end >= count) problems.push(`end ${shard.end} ≥ count ${count}`);
  if (shard.start > shard.end) problems.push(`start ${shard.start} > end ${shard.end}`);
  if (problems.length > 0) {
    return {
      name: 'Shard',
      status: 'fail',
      detail: `invalid shard: ${problems.join(', ')}`,
      remedy: `fix receiver.shard to a range within 0–${count - 1}`
    };
  }
  return {
    name: 'Shard',
    status: 'pass',
    detail: `cannons ${shard.start}–${shard.end} of ${count}`
  };
}

/** A file mode is acceptable for a secret only when group/other bits are clear. */
export function isSecureMode(mode: number): boolean {
  return (mode & 0o077) === 0;
}

/** Summarize whether an OSC output target is configured (informational). */
export function checkOsc(config: WavegridConfig): Check {
  if (config.osc.beyond) {
    return { name: 'OSC target', status: 'pass', detail: `BEYOND → ${config.osc.beyond.host}:${config.osc.beyond.port}` };
  }
  if (config.osc.fb4) {
    return { name: 'OSC target', status: 'pass', detail: `FB4 → ${config.osc.fb4.host}:${config.osc.fb4.port}` };
  }
  if (config.osc.routingConfig) {
    return { name: 'OSC target', status: 'pass', detail: `routing file ${config.osc.routingConfig}` };
  }
  return {
    name: 'OSC target',
    status: 'warn',
    detail: 'no OSC target — receiver logs to console only',
    remedy: 'set osc.beyond / osc.fb4 / osc.routingConfig to drive real hardware'
  };
}

/** Worst status across a set of checks (fail > warn > pass). */
export function overallStatus(checks: Check[]): CheckStatus {
  if (checks.some(c => c.status === 'fail')) return 'fail';
  if (checks.some(c => c.status === 'warn')) return 'warn';
  return 'pass';
}
