#!/usr/bin/env node
/**
 * Proves an operator can run a show from `npm i -g @wavegrid/cli` alone — no
 * repo checkout, no pnpm, no workspace links.
 *
 * The workspace hides two whole classes of bug, because every `@wavegrid/*`
 * import resolves to a sibling directory that is always present:
 *
 *   1. A dependency that is only reachable inside the monorepo — e.g. a package
 *      that is `private`, or simply never published, listed as a runtime
 *      dependency of a published one. `pnpm install` is happy; `npm i -g` 404s.
 *   2. A file that is not in the published tarball — the built laser UI is the
 *      dangerous one, since the brain serves it from
 *      `require.resolve('@wavegrid/ui/package.json')/../dist`.
 *
 * So this packs the real tarballs, installs them into a throwaway prefix with
 * npm `overrides` (so nested `@wavegrid/*` deps resolve to the tarballs rather
 * than whatever is on the registry), then boots an actual show and checks that
 * the UI bundle is served, the receiver connects, and doctor can read the
 * server's status.
 *
 *   node deploy/verify-global-install.js [--keep]
 */

const { execFileSync, spawn } = require('child_process');
const { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } = require('fs');
const { get } = require('http');
const { tmpdir } = require('os');
const { join } = require('path');

const ROOT = join(__dirname, '..');
const PROJECT = 'verify-install';
const PORT = 43117;
const KEEP = process.argv.includes('--keep');

const step = (msg) => console.log(`\n\u2192 ${msg}`);
const ok = (msg) => console.log(`  \u2713 ${msg}`);

function fail(msg) {
  console.error(`\n  \u2717 ${msg}\n`);
  process.exit(1);
}

/** Every package the release publishes, in dependency-first order. */
function publishablePackages() {
  return readdirSync(join(ROOT, 'packages'))
    .map((dir) => ({ dir, manifest: join(ROOT, 'packages', dir, 'package.json') }))
    .filter(({ manifest }) => existsSync(manifest))
    .map(({ dir, manifest }) => ({ dir, json: JSON.parse(readFileSync(manifest, 'utf8')) }))
    .filter(({ json }) => !json.private);
}

/**
 * A published package may only depend on other published packages. This is the
 * check that catches "works on my machine": inside the workspace a private or
 * unpublished dependency resolves fine, so nothing fails until an operator
 * installs from the registry.
 */
function checkDependencyClosure(packages) {
  step('Checking that no published package depends on an unpublished one');
  const published = new Set(packages.map((p) => p.json.name));
  const problems = [];
  for (const { json } of packages) {
    for (const dep of Object.keys(json.dependencies ?? {})) {
      if (dep.startsWith('@wavegrid/') && !published.has(dep)) {
        problems.push(`${json.name} depends on ${dep}, which is not published`);
      }
    }
  }
  if (problems.length) fail(problems.join('\n    '));
  ok(`${published.size} packages, closed under their @wavegrid deps`);
}

function pack(packages, dest) {
  step(`Packing ${packages.length} tarballs`);
  for (const { dir } of packages) {
    execFileSync('pnpm', ['pack', '--pack-destination', dest], {
      cwd: join(ROOT, 'packages', dir),
      stdio: 'pipe'
    });
  }
  // `pnpm pack` honours publishConfig.directory and rewrites `workspace:*` to
  // the real version, so these tarballs are byte-identical to a release.
  const tarballs = readdirSync(dest).filter((f) => f.endsWith('.tgz'));
  if (tarballs.length !== packages.length) {
    fail(`packed ${tarballs.length} tarballs, expected ${packages.length}`);
  }
  ok(tarballs.join(', '));
  return tarballs;
}

function installGlobally(packages, tarballDir, tarballs, appDir) {
  step('Installing the tarballs with npm (no workspace links)');
  const byName = new Map(packages.map((p) => [p.json.name, p.json.version]));
  const overrides = {};
  for (const name of byName.keys()) {
    const version = byName.get(name);
    const file = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`;
    if (!tarballs.includes(file)) fail(`no tarball for ${name}@${version} (expected ${file})`);
    overrides[name] = `file:${join(tarballDir, file)}`;
  }
  writeFileSync(
    join(appDir, 'package.json'),
    JSON.stringify(
      {
        name: 'wavegrid-install-check',
        private: true,
        dependencies: { '@wavegrid/cli': overrides['@wavegrid/cli'] },
        overrides
      },
      null,
      2
    )
  );
  execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: appDir, stdio: 'pipe' });
  const bin = join(appDir, 'node_modules', '.bin', process.platform === 'win32' ? 'wavegrid.cmd' : 'wavegrid');
  if (!existsSync(bin)) fail('the wavegrid bin was not installed');
  ok(bin);
  return bin;
}

function runCli(bin, args, env) {
  return execFileSync(bin, args, { env: { ...env, ...process.env, ...env }, encoding: 'utf8' });
}

function fetchStatus(path) {
  return new Promise((resolve) => {
    const req = get({ host: '127.0.0.1', port: PORT, path }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', () => resolve({ status: 0, body: '' }));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ status: 0, body: '' });
    });
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    const res = await fetchStatus('/');
    if (res.status === 200) return res.body;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function main() {
  const packages = publishablePackages();
  checkDependencyClosure(packages);

  const workDir = mkdtempSync(join(tmpdir(), 'wg-verify-'));
  const tarballDir = join(workDir, 'tarballs');
  const appDir = join(workDir, 'app');
  const storeDir = join(workDir, 'store');
  mkdirSync(tarballDir);
  mkdirSync(appDir);
  mkdirSync(storeDir);

  const tarballs = pack(packages, tarballDir);
  const bin = installGlobally(packages, tarballDir, tarballs, appDir);

  // A pristine store, so this can never touch the operator's ~/.wavegrid.
  const env = { APPSTASH_BASE_DIR: storeDir };

  step('Creating a project in a throwaway store');
  runCli(bin, ['projects', 'create', PROJECT, '--yes'], env);
  runCli(bin, ['projects', 'config', 'set', 'port', String(PORT), '--project', PROJECT], env);
  ok(`${PROJECT} on :${PORT}`);

  step('Starting the show (server + UI + receiver, in-process)');
  const show = spawn(bin, ['start', '--project', PROJECT], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  show.stdout.on('data', (d) => (log += d));
  show.stderr.on('data', (d) => (log += d));

  let failure = null;
  try {
    const index = await waitForServer();
    if (index == null) fail(`the server never answered on :${PORT}\n\n${log}`);
    ok(`GET / \u2192 200 (${index.length} bytes)`);

    // The laser UI is a built Vite bundle inside @wavegrid/ui's tarball — the
    // single most likely thing to be missing from a published install.
    const asset = /\/assets\/[^"']+\.js/.exec(index);
    if (!asset) fail(`the served index.html has no bundled asset \u2014 @wavegrid/ui shipped without dist/\n\n${index}`);
    const bundle = await fetchStatus(asset[0]);
    if (bundle.status !== 200 || bundle.body.length < 1000) {
      fail(`the laser UI bundle ${asset[0]} is not served (HTTP ${bundle.status}, ${bundle.body.length} bytes)`);
    }
    ok(`GET ${asset[0]} \u2192 200 (${bundle.body.length} bytes)`);

    // doctor reaching the brain proves the receiver connected and the store's
    // secrets authenticated a real WebSocket upgrade.
    step('Asking doctor what the running installation looks like');
    const diag = JSON.parse(runCli(bin, ['doctor', '--json', '--project', PROJECT], env));
    if (!diag.server) fail(`doctor could not read the server: ${diag.serverError ?? 'unknown'}\n\n${log}`);
    if (diag.server.receivers.length === 0) fail(`no receiver connected\n\n${log}`);
    const failed = diag.checks.filter((c) => c.status === 'fail');
    if (failed.length) fail(`doctor reports failures: ${failed.map((c) => `${c.name} (${c.detail})`).join(', ')}`);
    ok(
      `brain v${diag.server.server.version} \u00b7 ${diag.server.server.layout.name} \u00b7 ` +
        `${diag.server.receivers.length} receiver(s) \u00b7 doctor: ${diag.overall}`
    );
  } catch (e) {
    failure = e;
  } finally {
    show.kill('SIGINT');
    await new Promise((r) => setTimeout(r, 1500));
    show.kill('SIGKILL');
    if (KEEP) console.log(`\n  (kept ${workDir})`);
    else rmSync(workDir, { recursive: true, force: true });
  }
  if (failure) throw failure;

  console.log('\n  A global install runs a show with no checkout.\n');
}

main().catch((e) => fail(e.stack ?? String(e)));
