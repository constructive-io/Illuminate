import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { runDevicesAssign } from '../src/commands/devices';
import { getStore } from '../src/project';

const saved = { ...process.env };

function isolate() {
  process.env.APPSTASH_BASE_DIR = mkdtempSync(join(tmpdir(), 'wg-devices-'));
  const store = getStore();
  store.createProject('demo', { layout: { preset: 'grid-7x7' } });
  store.setActiveProject('demo');
  store.registerDevice('demo', { id: 'dev-1', name: 'stage-left' });
  return store;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  process.exitCode = undefined;
});
afterEach(() => {
  process.env = { ...saved };
  process.exitCode = undefined;
  jest.restoreAllMocks();
});

describe('runDevicesAssign', () => {
  it('assigns a shard from positional args (no TTY needed)', async () => {
    const store = isolate();
    await runDevicesAssign({}, 'stage-left', '0-24');
    expect(store.getDeviceRecord('demo', 'dev-1')?.shard).toEqual({ start: 0, end: 24 });
    expect(process.exitCode).toBeUndefined();
  });

  it('accepts the --shard flag', async () => {
    const store = isolate();
    await runDevicesAssign({ shard: '25-49' }, 'stage-left', undefined);
    expect(store.getDeviceRecord('demo', 'dev-1')?.shard).toEqual({ start: 25, end: 49 });
  });

  it('clears the shard with `all`', async () => {
    const store = isolate();
    store.assignShard('demo', 'dev-1', { start: 0, end: 5 });
    await runDevicesAssign({}, 'stage-left', 'all');
    expect(store.getDeviceRecord('demo', 'dev-1')?.shard).toBeNull();
  });

  it('rejects a malformed shard with a non-zero exit code', async () => {
    isolate();
    await runDevicesAssign({}, 'stage-left', '99-1');
    expect(process.exitCode).toBe(1);
  });

  it('prints usage and exits 1 in no-TTY mode when the shard is missing', async () => {
    isolate();
    await runDevicesAssign({}, 'stage-left', undefined);
    expect(process.exitCode).toBe(1);
  });
});
