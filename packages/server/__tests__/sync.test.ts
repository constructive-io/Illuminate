import { loadWavegridConfig } from '@wavegrid/layout';
import { openStore } from '@wavegrid/settings';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { WebSocket } from 'ws';

import { startServer, type ServerHandle } from '../src/server';

/** Open an authenticated (receiverKey) client and collect sync_* messages. */
function connect(port: number): Promise<{ ws: WebSocket; sync: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?key=testkey`);
    const sync: Record<string, unknown>[] = [];
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (typeof msg.type === 'string' && msg.type.startsWith('sync_')) sync.push(msg);
      } catch {
        /* ignore */
      }
    });
    ws.on('open', () => resolve({ ws, sync }));
    ws.on('error', reject);
  });
}

const send = (ws: WebSocket, msg: unknown) => ws.send(JSON.stringify(msg));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('server config sync (Phase D)', () => {
  const saved = { ...process.env };
  let handle: ServerHandle;
  let port: number;

  beforeAll(async () => {
    const store = mkdtempSync(join(tmpdir(), 'wg-sync-store-'));
    const state = mkdtempSync(join(tmpdir(), 'wg-sync-state-'));
    process.env.APPSTASH_BASE_DIR = store;
    process.env.WAVEGRID_PROJECT = 'demo';
    process.env.WG_STATE_DIR = state;
    process.env.WG_RECEIVER_KEY = 'testkey';
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;

    const s = openStore();
    s.createProject('demo', { layout: { preset: 'grid-7x7' }, server: { host: '127.0.0.1', port: 0 } });
    s.setActiveProject('demo');

    handle = startServer(loadWavegridConfig(), { uiDir: null, advertise: false });
    await new Promise<void>((r) => {
      if (handle.server.listening) return r();
      handle.server.once('listening', () => r());
    });
    const addr = handle.server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterAll(async () => {
    handle.stop();
    process.env = { ...saved };
  });

  it('serializes a push, persists a revision, and broadcasts it to all clients', async () => {
    const a = await connect(port);
    const b = await connect(port);
    await wait(50);

    send(a.ws, { type: 'sync_push', scope: 'project', config: { brightness: 0.5 }, deviceId: 'devA', baseRevision: 0 });
    await wait(150);

    // Both the sender and the other client see the accepted revision.
    const updA = a.sync.find((m) => m.type === 'sync_update');
    const updB = b.sync.find((m) => m.type === 'sync_update');
    expect(updA).toBeTruthy();
    expect(updB).toBeTruthy();
    expect(updB!.revision).toBe(1);
    expect((updB!.entry as { config: unknown }).config).toEqual({ brightness: 0.5 });

    // Persisted in the store.
    expect(openStore().getSyncState('demo').revision).toBe(1);

    a.ws.close();
    b.ws.close();
  });

  it('serves the full snapshot to a client that requests it (join/reconnect)', async () => {
    const c = await connect(port);
    await wait(50);
    send(c.ws, { type: 'sync_request', deviceId: 'devC', haveRevision: 0 });
    await wait(150);

    const stateMsg = c.sync.find((m) => m.type === 'sync_state');
    expect(stateMsg).toBeTruthy();
    expect(stateMsg!.revision).toBe(1);
    expect((stateMsg!.entries as Record<string, unknown>).project).toBeTruthy();
    c.ws.close();
  });

  it('tracks acknowledgements so doctor can flag divergence', async () => {
    const store = openStore();
    // devA authored rev 1 (auto-acked). A second edit lands at rev 2.
    const d = await connect(port);
    await wait(50);
    send(d.ws, { type: 'sync_push', scope: 'device:devA', config: { shard: [0, 5] }, deviceId: 'devA', baseRevision: 1 });
    await wait(150);
    expect(store.getSyncState('demo').revision).toBe(2);

    // devC never acked → divergent; devA is current.
    send(d.ws, { type: 'sync_ack', deviceId: 'devC', revision: 1 });
    await wait(100);
    const div = store.divergentDevices('demo', ['devA', 'devC']);
    expect(div.map((x) => x.deviceId)).toContain('devC');
    expect(div.map((x) => x.deviceId)).not.toContain('devA');
    d.ws.close();
  });

  it('drops a push with an unknown scope (no revision, no broadcast)', async () => {
    const store = openStore();
    const before = store.getSyncState('demo').revision;
    const e = await connect(port);
    await wait(50);

    send(e.ws, { type: 'sync_push', scope: 'garbage', config: { evil: true }, deviceId: 'devA', baseRevision: before });
    await wait(150);

    expect(e.sync.find((m) => m.type === 'sync_update')).toBeUndefined();
    expect(store.getSyncState('demo').revision).toBe(before);
    e.ws.close();
  });
});

describe('server config sync — disabled + secrets gate', () => {
  const saved = { ...process.env };
  let handle: ServerHandle;
  let port: number;

  beforeAll(async () => {
    const store = mkdtempSync(join(tmpdir(), 'wg-sync-off-store-'));
    const state = mkdtempSync(join(tmpdir(), 'wg-sync-off-state-'));
    process.env.APPSTASH_BASE_DIR = store;
    process.env.WAVEGRID_PROJECT = 'off';
    process.env.WG_STATE_DIR = state;
    process.env.WG_RECEIVER_KEY = 'testkey';
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;
    delete process.env.WG_SYNC_ENABLED;
    delete process.env.WG_SYNC_SECRETS;

    const s = openStore();
    s.createProject('off', {
      layout: { preset: 'grid-7x7' },
      server: { host: '127.0.0.1', port: 0 },
      sync: { enabled: false, secrets: false }
    });
    s.setActiveProject('off');

    handle = startServer(loadWavegridConfig(), { uiDir: null, advertise: false });
    await new Promise<void>((r) => {
      if (handle.server.listening) return r();
      handle.server.once('listening', () => r());
    });
    const addr = handle.server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterAll(async () => {
    handle.stop();
    process.env = { ...saved };
  });

  it('drops a push when sync is disabled (no revision, no broadcast)', async () => {
    const a = await connect(port);
    const b = await connect(port);
    await wait(50);

    send(a.ws, { type: 'sync_push', scope: 'project', config: { brightness: 0.9 }, deviceId: 'devA', baseRevision: 0 });
    await wait(150);

    expect(a.sync.find((m) => m.type === 'sync_update')).toBeUndefined();
    expect(b.sync.find((m) => m.type === 'sync_update')).toBeUndefined();
    expect(openStore().getSyncState('off').revision).toBe(0);

    a.ws.close();
    b.ws.close();
  });
});

describe('server config sync — secrets scope gate', () => {
  const saved = { ...process.env };
  let handle: ServerHandle;
  let port: number;

  beforeAll(async () => {
    const store = mkdtempSync(join(tmpdir(), 'wg-sync-sec-store-'));
    const state = mkdtempSync(join(tmpdir(), 'wg-sync-sec-state-'));
    process.env.APPSTASH_BASE_DIR = store;
    process.env.WAVEGRID_PROJECT = 'sec';
    process.env.WG_STATE_DIR = state;
    process.env.WG_RECEIVER_KEY = 'testkey';
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;
    delete process.env.WG_SYNC_ENABLED;
    delete process.env.WG_SYNC_SECRETS;

    const s = openStore();
    // Sync on, but secrets NOT opted in.
    s.createProject('sec', {
      layout: { preset: 'grid-7x7' },
      server: { host: '127.0.0.1', port: 0 },
      sync: { enabled: true, secrets: false }
    });
    s.setActiveProject('sec');

    handle = startServer(loadWavegridConfig(), { uiDir: null, advertise: false });
    await new Promise<void>((r) => {
      if (handle.server.listening) return r();
      handle.server.once('listening', () => r());
    });
    const addr = handle.server.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
  });

  afterAll(async () => {
    handle.stop();
    process.env = { ...saved };
  });

  it('replicates a normal scope but drops a secrets-scope push', async () => {
    const a = await connect(port);
    await wait(50);

    // A secrets-scoped push is ignored (never persisted/broadcast).
    send(a.ws, { type: 'sync_push', scope: 'secrets', config: { jwt: 'x' }, deviceId: 'devA', baseRevision: 0 });
    await wait(120);
    expect(a.sync.find((m) => m.type === 'sync_update')).toBeUndefined();
    expect(openStore().getSyncState('sec').revision).toBe(0);

    // A normal project scope still replicates.
    send(a.ws, { type: 'sync_push', scope: 'project', config: { brightness: 0.5 }, deviceId: 'devA', baseRevision: 0 });
    await wait(120);
    expect(a.sync.find((m) => m.type === 'sync_update')).toBeTruthy();
    expect(openStore().getSyncState('sec').revision).toBe(1);

    a.ws.close();
  });

  it('reconciles a re-homing peer via sync_merge (highest revision wins, secrets stripped, broadcasts state)', async () => {
    const a = await connect(port);
    await wait(50);

    // A transient coordinator hands over its document: a higher-revision device
    // entry (should win) plus a secrets entry (should be stripped, secrets off).
    send(a.ws, {
      type: 'sync_merge',
      state: {
        version: 1,
        revision: 9,
        entries: {
          'device:devB': { scope: 'device:devB', config: { shard: [0, 5] }, revision: 7, updatedAt: '2099-01-01T00:00:00.000Z', deviceId: 'devB' },
          secrets: { scope: 'secrets', config: { jwt: 'leak' }, revision: 9, updatedAt: '2099-01-01T00:00:00.000Z', deviceId: 'devB' }
        },
        acks: {}
      }
    });
    await wait(150);

    const state = openStore().getSyncState('sec');
    expect(state.entries['device:devB']).toBeTruthy();       // merged
    expect(state.entries.secrets).toBeUndefined();           // secret scope stripped
    expect(state.revision).toBe(7);                          // max of merged entries

    // The reconciled document is broadcast so clients converge.
    const stateMsg = a.sync.find((m) => m.type === 'sync_state');
    expect(stateMsg).toBeTruthy();
    expect((stateMsg!.entries as Record<string, unknown>)['device:devB']).toBeTruthy();

    a.ws.close();
  });
});
