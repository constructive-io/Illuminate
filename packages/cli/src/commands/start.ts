import { loadWavegridConfig, type RunMode } from '@wavegrid/layout';
import { randomBytes } from 'crypto';
import c from 'yanse';

import { findConfigFile } from '../config-file';

export interface StartOptions {
  cwd?: string;
  /** When true, resolve + print the plan but do not start anything (tests). */
  dryRun?: boolean;
}

export interface ServiceSpec {
  label: string;
}

export interface StartResult {
  runMode: RunMode;
  services: ServiceSpec[];
  /** Stop every started service. No-op for a dry run. */
  stop: () => void;
}

/**
 * Which services the CLI runs. The CLI bakes in the server + receiver and runs
 * them in-process — no pnpm, no workspace checkout. The UI is a separate app
 * that reads the same wavegrid.json, so it is not launched here. Distributed
 * mode still runs the local pair; the receiver just shards via SHARD_START/END.
 */
export function servicesForMode(mode: RunMode): ServiceSpec[] {
  return [
    { label: 'server' },
    { label: mode === 'distributed' ? 'receiver (shard)' : 'receiver' }
  ];
}

/**
 * `wavegrid start` — resolve the config and run the installation in-process.
 * The shape lives entirely in the config file; there is no shape-specific code.
 */
export async function runStart(opts: StartOptions = {}): Promise<StartResult> {
  const cwd = opts.cwd ?? process.cwd();
  const resolved = loadWavegridConfig({ cwd });
  const runMode = resolved.runMode;
  const services = servicesForMode(runMode);
  const configPath = findConfigFile(cwd);

  console.log('');
  console.log(c.bold('  Wavegrid · start'));
  console.log(`  → Config:   ${configPath ? c.cyan(configPath) : c.gray('(defaults + env)')}`);
  console.log(`  → Layout:   ${c.cyan(resolved.layout.name)} (${resolved.layout.topology}, ${resolved.layout.count} cannons)`);
  console.log(`  → Run mode: ${c.cyan(runMode)}`);
  if (runMode === 'distributed') {
    console.log(c.yellow('  → Distributed: shard receivers per-laptop via SHARD_START / SHARD_END.'));
  }
  console.log('');

  if (opts.dryRun) {
    return { runMode, services, stop: () => {} };
  }

  // Wire the shared connection so the in-process server + receiver agree.
  // On one laptop the server requires a receiver key; generate an ephemeral
  // one if the operator hasn't set it, so simple mode "just works" offline.
  const port = resolved.config.server.port;
  if (!process.env.WG_RECEIVER_KEY) process.env.WG_RECEIVER_KEY = randomBytes(24).toString('hex');
  if (!process.env.SIMULATOR_URL) process.env.SIMULATOR_URL = `ws://localhost:${port}`;

  // Imported lazily so dry-run / config tooling never loads the runtime.
  const { startServer } = await import('@wavegrid/server');
  const { startReceiver } = await import('@wavegrid/receiver');

  const serverHandle = startServer(resolved);
  // Let the server bind before the receiver dials in.
  await new Promise((r) => setTimeout(r, 250));
  const receiverHandle = startReceiver(resolved);

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    receiverHandle.stop();
    serverHandle.stop();
  };

  const onSignal = () => {
    console.log('\n  Shutting down...');
    stop();
    process.exit(0);
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);

  console.log('');
  console.log(`  ${c.green('▶')} server + receiver up.  ${c.gray('Ctrl-C stops everything.')}`);
  console.log('');

  return { runMode, services, stop };
}
