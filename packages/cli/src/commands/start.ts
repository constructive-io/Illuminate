import { loadWavegridConfig, type RunMode } from '@wavegrid/layout';
import { type ChildProcess, spawn } from 'child_process';
import c from 'yanse';

import { findConfigFile, findRepoRoot } from '../config-file';

export interface StartOptions {
  cwd?: string;
  /** When true, resolve + print the plan but do not spawn anything (tests). */
  dryRun?: boolean;
}

export interface ServiceSpec {
  label: string;
  script: string;
}

/**
 * Which services run for a given mode. Simple mode is the one-laptop,
 * offline-friendly profile: server + ui + receiver in a single command.
 * Distributed keeps the same local trio but expects per-laptop receivers to
 * be sharded via SHARD_START/SHARD_END env vars.
 */
export function servicesForMode(mode: RunMode): ServiceSpec[] {
  return [
    { label: 'server', script: 'dev:server' },
    { label: 'ui', script: 'dev:ui' },
    { label: 'receiver', script: 'dev:receiver' }
  ].map((s) => ({ ...s, label: mode === 'distributed' && s.label === 'receiver' ? 'receiver (shard)' : s.label }));
}

/** Env passed to child services so they resolve the same layout the CLI did. */
export function childEnv(cwd: string): NodeJS.ProcessEnv {
  const resolved = loadWavegridConfig({ cwd });
  const { config, layout, runMode } = resolved;
  const env: NodeJS.ProcessEnv = { ...process.env };

  // Force the resolved run mode so every service agrees.
  env.WAVEGRID_MODE = runMode;
  if (config.layout.preset) env.WAVEGRID_LAYOUT = config.layout.preset;
  env.PORT = String(config.server.port);
  env.SIM_PORT = String(config.server.port);
  env.HOST = config.server.host;
  env.UI_PORT = String(config.ui.port);
  env.SIMULATOR_URL = env.SIMULATOR_URL || `ws://localhost:${config.server.port}`;
  void layout;
  return env;
}

/**
 * `wavegrid start` — load the resolved config and launch the installation.
 * All it does is load configuration and start processes; the shape lives
 * entirely in the config file.
 */
export function runStart(opts: StartOptions = {}): { runMode: RunMode; services: ServiceSpec[]; root: string } {
  const cwd = opts.cwd ?? process.cwd();
  const root = findRepoRoot(cwd);
  if (!root) {
    throw new Error('Could not find the wavegrid workspace root (no pnpm-workspace.yaml above ' + cwd + ').');
  }

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
    return { runMode, services, root };
  }

  const env = childEnv(cwd);
  const children: ChildProcess[] = [];

  const shutdown = () => {
    for (const child of children) {
      if (!child.killed) child.kill();
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);

  for (const svc of services) {
    console.log(c.green(`  ▶ ${svc.label}`) + c.gray(`  (pnpm ${svc.script})`));
    const child = spawn('pnpm', [svc.script], { cwd: root, env, stdio: 'inherit', shell: false });
    child.on('exit', (code) => {
      console.log(c.gray(`  ◈ ${svc.label} exited (${code ?? 'signal'})`));
    });
    children.push(child);
  }

  console.log('');
  console.log(`  All services up. UI → ${c.cyan(`http://localhost:${resolved.config.ui.port}`)}  ·  Ctrl-C stops everything.`);
  console.log('');

  return { runMode, services, root };
}
