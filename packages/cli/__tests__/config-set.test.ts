import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { runConfigSet } from '../src/commands/config-set';
import { getStore } from '../src/project';

function isolate(): void {
  process.env.APPSTASH_BASE_DIR = mkdtempSync(join(tmpdir(), 'wg-cfgset-'));
}

const saved = { ...process.env };
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...saved };
  jest.restoreAllMocks();
});

describe('runConfigSet', () => {
  it('changes the stored layout preset for the active project', () => {
    isolate();
    const store = getStore();
    store.createProject('ring-demo', { layout: { preset: 'grid-7x7' } });

    runConfigSet('layout', 'ring-6', {});

    expect(store.getProjectConfig('ring-demo')?.layout).toEqual({ preset: 'ring-6' });
  });

  it('sets the server port and preserves the host', () => {
    isolate();
    const store = getStore();
    store.createProject('p', { layout: { preset: 'ring-6' }, server: { host: '10.0.0.1', port: 5000 } });

    runConfigSet('port', '3000', {});

    expect(store.getProjectConfig('p')?.server).toEqual({ host: '10.0.0.1', port: 3000 });
  });

  it('rejects an unknown preset without writing', () => {
    isolate();
    const store = getStore();
    store.createProject('p', { layout: { preset: 'ring-6' } });

    expect(() => runConfigSet('layout', 'nope', {})).toThrow(/Unknown preset/);
    expect(store.getProjectConfig('p')?.layout).toEqual({ preset: 'ring-6' });
  });

  it('rejects a non-integer port', () => {
    isolate();
    getStore().createProject('p', { layout: { preset: 'ring-6' } });
    expect(() => runConfigSet('port', 'abc', {})).toThrow(/integer/);
  });

  it('errors (exit 1) on an unknown key', () => {
    isolate();
    getStore().createProject('p', { layout: { preset: 'ring-6' } });
    process.exitCode = 0;
    runConfigSet('bogus', 'x', {});
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});
