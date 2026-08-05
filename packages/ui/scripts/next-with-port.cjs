#!/usr/bin/env node
/**
 * Launch `next dev` / `next start` on the active Wavegrid project's `ui.port`.
 *
 * Next's CLI defaults to :3000 and never reads the Wavegrid store, so the UI
 * would otherwise ignore the project's configured UI port. This resolves the
 * config the same way the rest of the app does (store → defaults → env) and
 * passes `-p <ui.port>` to Next — unless the operator already specified a port
 * via `PORT` or an explicit `-p/--port`, which still win.
 */
const { spawn } = require('node:child_process');

const mode = process.argv[2] === 'dev' ? 'dev' : 'start';
const passthrough = process.argv.slice(3);
const portGivenOnCli = passthrough.some((a) => a === '-p' || a === '--port');

let port;
try {
  const { loadWavegridConfig } = require('@wavegrid/layout');
  port = loadWavegridConfig().config.ui.port;
} catch {
  // No project configured yet (or config failed to load) — let Next use its
  // own default so the UI can still boot for first-run / troubleshooting.
}

const args = [mode, ...passthrough];
if (port && !portGivenOnCli && !process.env.PORT) {
  args.push('-p', String(port));
}

const nextBin = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, ...args], { stdio: 'inherit', env: process.env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
