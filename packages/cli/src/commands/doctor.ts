import { loadWavegridConfig } from '@wavegrid/layout';
import { formatRanges, type SystemStatus } from '@wavegrid/server';
import { projectSecretsFile } from '@wavegrid/settings';
import { accessSync, constants, existsSync, statSync } from 'fs';
import net from 'net';
import { dirname } from 'path';
import { URL } from 'url';
import { WebSocket } from 'ws';
import c from 'yanse';

import { type Flags, getStore } from '../project';
import {
  type Check,
  checkEnvHijack,
  checkOsc,
  checkShard,
  isSecureMode,
  overallStatus
} from './doctor-checks';

const NODE_MIN_MAJOR = 18;

/** TCP probe: resolve 'open' if something is listening, else 'closed'. */
function tcpProbe(host: string, port: number, timeoutMs = 1500): Promise<'open' | 'closed'> {
  const target = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (result: 'open' | 'closed') => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done('open'));
    socket.once('timeout', () => done('closed'));
    socket.once('error', () => done('closed'));
    socket.connect(port, target);
  });
}

interface StatusProbe {
  status?: SystemStatus;
  /** 'unauthorized' when the server rejected our receiver key. */
  error?: 'unauthorized' | 'timeout' | 'refused' | 'not-wavegrid';
}

/** Connect to a running server and request a system_status snapshot. */
function querySystemStatus(url: string, key: string, timeoutMs = 3000): Promise<StatusProbe> {
  return new Promise((resolve) => {
    const u = new URL(url);
    if (key) u.searchParams.set('key', key);
    let settled = false;
    const finish = (probe: StatusProbe) => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch { /* ignore */ }
      resolve(probe);
    };
    const timer = setTimeout(() => finish({ error: 'timeout' }), timeoutMs);
    const ws = new WebSocket(u.toString());

    ws.on('open', () => ws.send(JSON.stringify({ type: 'system_status' })));
    ws.on('unexpected-response', (_req, res) => {
      clearTimeout(timer);
      finish({ error: res.statusCode === 401 ? 'unauthorized' : 'not-wavegrid' });
    });
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'system_status') {
          clearTimeout(timer);
          finish({ status: msg as SystemStatus });
        }
      } catch { /* ignore non-JSON frames */ }
    });
    ws.on('error', () => {
      clearTimeout(timer);
      finish({ error: 'refused' });
    });
  });
}

/**
 * Whether `dir` is (or can be) writable. Store subdirs are created lazily at
 * `start`, so a missing dir is fine as long as its nearest existing ancestor
 * is writable — otherwise a fresh project would spuriously fail the check.
 */
function dirWritable(dir: string): boolean {
  let target = dir;
  while (!existsSync(target)) {
    const parent = dirname(target);
    if (parent === target) return false;
    target = parent;
  }
  try {
    accessSync(target, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/** Build the local (this-laptop) checks. */
function localChecks(flags: Flags, cwd: string): { checks: Check[]; project?: string; serverUrl?: string; key?: string } {
  const checks: Check[] = [];

  // Node version
  const major = parseInt(process.versions.node.split('.')[0], 10);
  checks.push(
    major >= NODE_MIN_MAJOR
      ? { name: 'Node', status: 'pass', detail: `v${process.versions.node}` }
      : { name: 'Node', status: 'warn', detail: `v${process.versions.node} < ${NODE_MIN_MAJOR}`, remedy: `install Node ${NODE_MIN_MAJOR}+` }
  );

  // Store reachable + writable
  const store = getStore();
  checks.push(
    dirWritable(store.paths.root)
      ? { name: 'Store', status: 'pass', detail: store.paths.root }
      : { name: 'Store', status: 'fail', detail: `not writable: ${store.paths.root}`, remedy: 'check permissions or APPSTASH_BASE_DIR' }
  );

  // Machine-local device identity (self-registration / discovery).
  const device = store.getDevice();
  checks.push({ name: 'Device', status: 'pass', detail: `${device.name} (${device.id.slice(0, 8)}…)` });

  // Active project resolution
  const explicit = (typeof flags.project === 'string' ? flags.project : undefined) ?? process.env.WAVEGRID_PROJECT;
  const project = explicit ?? store.getActiveProject() ?? undefined;
  if (!project || !store.hasProject(project)) {
    checks.push({
      name: 'Project',
      status: 'fail',
      detail: project ? `unknown project "${project}"` : 'no active project',
      remedy: 'wavegrid init <name>   (or `wavegrid use <name>`)'
    });
    // Everything below needs a project; return early.
    checks.push(checkEnvHijack(process.env));
    return { checks };
  }
  checks.push({ name: 'Project', status: 'pass', detail: project });
  if (store.getActiveProject() !== project) store.setActiveProject(project);

  // Resolve config (layout, mode, ports)
  const resolved = loadWavegridConfig({ cwd });
  const { config, layout, runMode } = resolved;
  checks.push({ name: 'Layout', status: 'pass', detail: `${layout.name} (${layout.topology}, ${layout.count} cannons) · ${runMode}` });

  // Shard bounds
  checks.push(checkShard(layout.count, config.receiver.shard));

  // Secrets present + secure perms
  for (const s of store.requiredSecrets(project)) {
    if (!s.set) {
      checks.push({ name: `Secret ${s.name}`, status: 'fail', detail: 'NOT SET', remedy: 'wavegrid secrets init' });
      continue;
    }
    let modeOk = true;
    try {
      const mode = statSync(projectSecretsFile(store.paths, project)).mode;
      modeOk = isSecureMode(mode);
    } catch { /* file existence already implied by s.set */ }
    checks.push(
      modeOk
        ? { name: `Secret ${s.name}`, status: 'pass', detail: 'set (0600)' }
        : { name: `Secret ${s.name}`, status: 'warn', detail: 'set but file is group/other-readable', remedy: `chmod 600 ${projectSecretsFile(store.paths, project)}` }
    );
  }

  // Users
  const users = store.listUsers(project);
  checks.push(
    users.length > 0
      ? { name: 'Users', status: 'pass', detail: `${users.length} UI login(s)` }
      : { name: 'Users', status: 'warn', detail: 'no UI users — login returns 503', remedy: 'wavegrid users add <name>' }
  );

  // State + logs writable
  for (const [label, dir] of [['State dir', store.stateDir(project)], ['Logs dir', store.logsDir(project)]] as const) {
    checks.push(
      dirWritable(dir)
        ? { name: label, status: 'pass', detail: dir }
        : { name: label, status: 'warn', detail: `not writable: ${dir}`, remedy: 'check store permissions' }
    );
  }

  // OSC
  checks.push(checkOsc(config));

  // Ambient env footgun
  checks.push(checkEnvHijack(process.env));

  const key = store.hasSecret(project, 'receiverKey') ? store.requireSecret(project, 'receiverKey') : undefined;
  const serverUrl = process.env.SIMULATOR_URL || `ws://localhost:${config.server.port}`;
  return { checks, project, serverUrl, key };
}

function renderCheck(check: Check): void {
  const icon = check.status === 'pass' ? c.green('✓') : check.status === 'warn' ? c.yellow('!') : c.red('✗');
  const name = check.name.padEnd(16);
  console.log(`  ${icon} ${name} ${check.detail}`);
  if (check.remedy && check.status !== 'pass') console.log(`      ${c.gray('↳ ' + check.remedy)}`);
}

function renderSystem(status: SystemStatus): void {
  console.log('');
  console.log(c.bold('  System (server-reported)'));
  const s = status.server;
  console.log(`  → Server:   ${c.cyan(`v${s.version}`)} · ${s.layout.name} (${s.layout.count}) · ${s.mode} · :${s.port} · up ${Math.round(s.uptimeMs / 1000)}s`);
  console.log(`  → Clients:  ${status.receivers.length} receiver(s), ${status.uiClients} UI`);

  if (status.receivers.length === 0) {
    console.log(c.yellow('  ! no receivers connected'));
  } else {
    for (const r of status.receivers) {
      const h = r.hello;
      const shard = h?.shard ? `shard ${h.shard.start}–${h.shard.end}` : 'all cannons';
      const mism = h && h.layout.count !== s.layout.count ? c.red(`  ⚠ layout ${h.layout.id}(${h.layout.count})≠server`) : '';
      const vskew = h && h.version !== undefined ? c.gray(`v${h.version}`) : '';
      const label = h?.deviceName ?? h?.host ?? r.remote;
      const at = c.gray(r.remote);
      console.log(`      • ${c.cyan(label)}  ${at}  ${shard}  ${vskew}${mism}`);
    }
  }

  const { claimed, gaps, overlaps } = status.coverage;
  const gapStr = gaps.length ? c.red(formatRanges(gaps)) : c.green('none');
  const overStr = overlaps.length ? c.red(formatRanges(overlaps)) : c.green('none');
  console.log(`  → Coverage: claimed ${formatRanges(claimed)} · gaps: ${gapStr} · overlaps: ${overStr}`);
}

/** Render the project device registry (devices that have joined, incl. offline). */
function renderDevices(project: string): void {
  const store = getStore();
  const devices = store.listDevices(project);
  if (devices.length === 0) return;
  console.log('');
  console.log(c.bold(`  Devices (registered · ${project})`));
  for (const d of devices) {
    const at = d.address ? c.gray(d.address) : c.gray('—');
    const seen = d.lastSeen ? c.gray(seenAgo(d.lastSeen)) : c.gray('never');
    console.log(`      • ${c.cyan(d.name)}  ${at}  ${seen}`);
  }
}

function seenAgo(lastSeen: number): string {
  const secs = Math.round((Date.now() - lastSeen) / 1000);
  if (secs < 60) return `seen ${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `seen ${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `seen ${hrs}h ago`;
  return `seen ${Math.round(hrs / 24)}d ago`;
}

/** `wavegrid doctor [--project name] [--server ws://host:port] [--json]` */
export async function runDoctor(flags: Flags = {}, cwd = process.cwd()): Promise<void> {
  const { checks, project, serverUrl, key } = localChecks(flags, cwd);

  // System view: connect to the configured (or --server) server if reachable.
  const url = (typeof flags.server === 'string' ? flags.server : undefined) ?? serverUrl;
  let system: StatusProbe | undefined;
  let portState: 'open' | 'closed' | undefined;
  if (url) {
    const u = new URL(url);
    const port = parseInt(u.port || '3000', 10);
    portState = await tcpProbe(u.hostname, port);
    if (portState === 'open') {
      system = await querySystemStatus(url, key ?? '');
    }
  }

  if (flags.json) {
    console.log(JSON.stringify({
      checks,
      overall: overallStatus(checks),
      devices: project ? getStore().listDevices(project) : [],
      server: system?.status ?? null,
      serverError: system?.error ?? (portState === 'closed' ? 'not-running' : undefined)
    }, null, 2));
    process.exitCode = overallStatus(checks) === 'fail' ? 1 : 0;
    return;
  }

  console.log('');
  console.log(c.bold('  Wavegrid · doctor'));
  console.log('');
  console.log(c.bold('  Local'));
  for (const check of checks) renderCheck(check);

  if (project) renderDevices(project);

  if (url) {
    if (portState === 'closed') {
      console.log('');
      console.log(c.gray(`  Server not running at ${url} (start it with \`wavegrid start\`).`));
    } else if (system?.status) {
      renderSystem(system.status);
    } else if (system?.error === 'unauthorized') {
      console.log('');
      console.log(c.red(`  ✗ Server at ${url} rejected our receiverKey (401).`));
      console.log(`      ${c.gray('↳ this laptop\'s receiverKey must match the server\'s — re-sync via `wavegrid env export`')}`);
    } else if (system?.error) {
      console.log('');
      console.log(c.yellow(`  ! Could not read system status from ${url} (${system.error}).`));
    }
  }

  const overall = overallStatus(checks);
  console.log('');
  const label = overall === 'pass' ? c.green('healthy') : overall === 'warn' ? c.yellow('warnings') : c.red('problems found');
  console.log(`  Result: ${label}`);
  console.log('');
  process.exitCode = overall === 'fail' ? 1 : 0;
}
