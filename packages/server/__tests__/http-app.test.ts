import { loadWavegridConfig } from '@wavegrid/layout';
import { openStore } from '@wavegrid/settings';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import * as http from 'http';
import { tmpdir } from 'os';
import { join } from 'path';

import { createHttpApp } from '../src/http-app';

/** Boot the handler on an ephemeral port and return its base URL + a closer. */
async function boot(uiDir: string | null) {
  const resolved = loadWavegridConfig();
  const handle = createHttpApp(resolved, { uiDir });
  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, r));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return {
    base: `http://127.0.0.1:${port}`,
    layout: resolved.layout,
    close: () => new Promise<void>((r) => server.close(() => r()))
  };
}

describe('createHttpApp', () => {
  const saved = { ...process.env };
  let base: string;
  let close: () => Promise<void>;
  let layout: { count: number };

  beforeAll(async () => {
    const store = mkdtempSync(join(tmpdir(), 'wg-http-store-'));
    const state = mkdtempSync(join(tmpdir(), 'wg-http-state-'));
    const ui = mkdtempSync(join(tmpdir(), 'wg-http-ui-'));

    process.env.APPSTASH_BASE_DIR = store;
    process.env.WAVEGRID_PROJECT = 'demo';
    process.env.WG_STATE_DIR = state;
    process.env.WG_JWT_SECRET = 'test-secret';
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;
    delete process.env.LIGHT_MAP_CONFIG;

    const s = openStore();
    s.createProject('demo', { layout: { preset: 'grid-7x7' } });
    s.setActiveProject('demo');
    s.addUser('demo', 'admin', 'secretpw');

    mkdirSync(join(ui, 'assets'), { recursive: true });
    writeFileSync(join(ui, 'index.html'), '<!doctype html><div id="root"></div>');
    writeFileSync(join(ui, 'assets', 'app.js'), 'console.log("hi")');

    ({ base, close, layout } = await boot(ui));
  });

  afterAll(async () => {
    await close();
    process.env = { ...saved };
  });

  it('GET /api/config reports a same-origin ws URL + the resolved layout', async () => {
    const res = await fetch(`${base}/api/config`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.simulatorUrl).toMatch(/^ws:\/\/127\.0\.0\.1:\d+$/);
    expect(body.numCannons).toBe(layout.count);
    expect(body.layout).toBeDefined();
  });

  it('serves index.html at / and for extensionless SPA routes', async () => {
    for (const path of ['/', '/some/deep/route']) {
      const res = await fetch(`${base}${path}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('id="root"');
    }
  });

  it('serves static assets with the right content-type', async () => {
    const res = await fetch(`${base}/assets/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('javascript');
    expect(await res.text()).toContain('hi');
  });

  it('rejects bad credentials and accepts good ones', async () => {
    const bad = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'nope' })
    });
    expect(bad.status).toBe(401);

    const good = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'secretpw' })
    });
    expect(good.status).toBe(200);
    const body = await good.json();
    expect(body.ok).toBe(true);
    expect(body.token.split('.')).toHaveLength(3);
  });

  it('round-trips the light map through per-project state', async () => {
    const initial = await (await fetch(`${base}/api/light-map`)).json();
    expect(initial.physicalLights).toHaveLength(layout.count);

    const swapped = initial.physicalLights.slice();
    [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
    const post = await fetch(`${base}/api/light-map`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...initial, physicalLights: swapped })
    });
    expect(post.status).toBe(200);

    const reread = await (await fetch(`${base}/api/light-map`)).json();
    expect(reread.physicalLights[0]).toBe(swapped[0]);
    expect(reread.physicalLights[1]).toBe(swapped[1]);
    const onDisk = JSON.parse(readFileSync(join(process.env.WG_STATE_DIR!, 'light-map.json'), 'utf8'));
    expect(onDisk.physicalLights[0]).toBe(swapped[0]);
  });

  it('returns JSON 404 for unknown /api routes', async () => {
    const res = await fetch(`${base}/api/nope`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
