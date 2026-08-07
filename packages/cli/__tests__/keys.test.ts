import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { runKeysEnabled, runKeysList, runKeysNew, runKeysRemove } from '../src/commands/keys';
import { getStore } from '../src/project';

function isolate(): void {
  process.env.APPSTASH_BASE_DIR = mkdtempSync(join(tmpdir(), 'wg-keys-'));
}

function project(): ReturnType<typeof getStore> {
  const store = getStore();
  store.createProject('ring-demo', { layout: { preset: 'ring-6' } });
  return store;
}

/** Everything the command printed, joined and stripped of ANSI styling. */
function printed(spy: jest.SpyInstance): string {
  // eslint-disable-next-line no-control-regex
  return spy.mock.calls.map((c) => String(c[0]).replace(/\u001b\[[0-9;]*m/g, '')).join('\n');
}

const saved = { ...process.env };
let log: jest.SpyInstance;
beforeEach(() => {
  log = jest.spyOn(console, 'log').mockImplementation(() => {});
  process.exitCode = 0;
});
afterEach(() => {
  process.env = { ...saved };
  process.exitCode = 0;
  jest.restoreAllMocks();
});

describe('wavegrid keys new', () => {
  it('mints an operator key and prints the passphrase once', () => {
    isolate();
    const store = project();

    runKeysNew({}, 'friday-guests');

    const keys = store.listAccessKeys('ring-demo');
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ name: 'friday-guests', role: 'operator', enabled: true });

    // The cleartext is shown exactly once, at mint time, and authenticates.
    const out = printed(log);
    const passphrase = out.split('\n').map((l) => l.trim()).find((l) => /^[A-Za-z0-9-]{8,}$/.test(l));
    expect(passphrase).toBeDefined();
    expect(store.authenticateAccessKey('ring-demo', passphrase!)?.username).toBe('friday-guests');
  });

  it('mints an admin key only when --admin is passed', () => {
    isolate();
    const store = project();

    runKeysNew({ admin: true }, 'tech-lead');

    expect(store.getAccessKeyRole('ring-demo', 'tech-lead')).toBe('admin');
  });

  it('requires a name', () => {
    isolate();
    const store = project();

    runKeysNew({}, undefined);

    expect(process.exitCode).toBe(1);
    expect(store.listAccessKeys('ring-demo')).toEqual([]);
  });

  it('re-minting a name invalidates the old passphrase', () => {
    isolate();
    const store = project();
    const first = store.mintAccessKey('ring-demo', 'dan-ipad').passphrase;

    runKeysNew({}, 'dan-ipad');

    expect(store.listAccessKeys('ring-demo')).toHaveLength(1);
    expect(store.authenticateAccessKey('ring-demo', first)).toBeNull();
  });
});

describe('wavegrid keys enable/disable', () => {
  it('disables one key without touching the others', () => {
    isolate();
    const store = project();
    store.mintAccessKey('ring-demo', 'crew');
    store.mintAccessKey('ring-demo', 'friday-guests');

    runKeysEnabled({}, 'friday-guests', false);

    const byName = new Map(store.listAccessKeys('ring-demo').map((k) => [k.name, k.enabled]));
    expect(byName.get('friday-guests')).toBe(false);
    expect(byName.get('crew')).toBe(true);
  });

  it('reports an unknown key instead of silently succeeding', () => {
    isolate();
    project();

    runKeysEnabled({}, 'nope', true);

    expect(process.exitCode).toBe(1);
  });
});

describe('wavegrid keys rm', () => {
  it('revokes one key', () => {
    isolate();
    const store = project();
    store.mintAccessKey('ring-demo', 'crew');
    store.mintAccessKey('ring-demo', 'friday-guests');

    runKeysRemove({}, 'friday-guests');

    expect(store.listAccessKeys('ring-demo').map((k) => k.name)).toEqual(['crew']);
  });

  it('revokes every key with --all', () => {
    isolate();
    const store = project();
    store.mintAccessKey('ring-demo', 'crew');
    store.mintAccessKey('ring-demo', 'friday-guests');

    runKeysRemove({ all: true }, undefined);

    expect(store.listAccessKeys('ring-demo')).toEqual([]);
  });

  it('requires a name when --all is absent', () => {
    isolate();
    const store = project();
    store.mintAccessKey('ring-demo', 'crew');

    runKeysRemove({}, undefined);

    expect(process.exitCode).toBe(1);
    expect(store.listAccessKeys('ring-demo')).toHaveLength(1);
  });
});

describe('wavegrid keys ls', () => {
  it('lists names, roles and state without revealing passphrases', () => {
    isolate();
    const store = project();
    const secret = store.mintAccessKey('ring-demo', 'crew').passphrase;
    store.mintAccessKey('ring-demo', 'tech-lead', 'admin');

    runKeysList({});

    const out = printed(log);
    expect(out).toContain('crew');
    expect(out).toContain('tech-lead');
    expect(out).toContain('admin');
    expect(out).not.toContain(secret);
  });

  it('says so when there are none', () => {
    isolate();
    project();

    runKeysList({});

    expect(printed(log)).toContain('keys new');
  });
});
