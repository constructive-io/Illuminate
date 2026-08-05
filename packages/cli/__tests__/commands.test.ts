import { mkdtempSync } from 'fs';
import { Inquirerer } from 'inquirerer';
import { tmpdir } from 'os';
import { join } from 'path';

import { buildEnvLines, configEnvMap } from '../src/commands/env';
import { runInit } from '../src/commands/init';
import { getStore, resolveProjectName } from '../src/project';

/** A non-interactive prompter that fills answers from the seed/defaults. */
function autoPrompter(): Inquirerer {
  return new Inquirerer({ noTty: true, useDefaults: true });
}

/** Point the whole store (and confstash's user layer) at a throwaway dir. */
function isolate(): string {
  const home = mkdtempSync(join(tmpdir(), 'wg-cli-'));
  process.env.APPSTASH_BASE_DIR = home;
  return home;
}

const saved = { ...process.env };
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...saved };
  jest.restoreAllMocks();
});

describe('configEnvMap', () => {
  it('projects config sections into the runtime env-var names', () => {
    const env = configEnvMap({
      layout: { preset: 'ring-6' },
      mode: 'simple',
      simpleModeMax: 40,
      server: { host: '0.0.0.0', port: 3200 },
      ui: { port: 3003 },
      receiver: { alpha: 0.1, fallbackDelay: 2000, shard: { start: 0, end: 3 } },
      osc: { beyond: { host: '10.0.0.5', port: 7001, gridOrder: 'row' } },
      debug: { osc: true }
    });
    expect(env.WAVEGRID_LAYOUT).toBe('ring-6');
    expect(env.WAVEGRID_PORT).toBe('3200');
    expect(env.RECEIVER_ALPHA).toBe('0.1');
    expect(env.SHARD_START).toBe('0');
    expect(env.SHARD_END).toBe('3');
    expect(env.BEYOND_HOST).toBe('10.0.0.5');
    expect(env.DEBUG_OSC).toBe('1');
    // Secrets are never emitted by the non-secret map.
    expect(env.WG_JWT_SECRET).toBeUndefined();
    expect(env.WG_RECEIVER_KEY).toBeUndefined();
  });
});

describe('resolveProjectName', () => {
  it('throws with an actionable message when no project exists', () => {
    isolate();
    delete process.env.WAVEGRID_PROJECT;
    expect(() => resolveProjectName(getStore(), {})).toThrow(/wavegrid init/);
  });

  it('honors the flag over env over active', () => {
    isolate();
    const store = getStore();
    store.createProject('a', { layout: { preset: 'ring-6' } });
    store.createProject('b', { layout: { preset: 'grid-7x2' } });
    expect(resolveProjectName(store, {})).toBe('a'); // first created is active
    process.env.WAVEGRID_PROJECT = 'b';
    expect(resolveProjectName(store, {})).toBe('b');
    expect(resolveProjectName(store, { project: 'a' })).toBe('a');
  });

  it('rejects an unknown explicit project', () => {
    isolate();
    const store = getStore();
    store.createProject('a', { layout: { preset: 'ring-6' } });
    expect(() => resolveProjectName(store, { project: 'nope' })).toThrow(/Unknown project/);
  });
});

describe('runInit', () => {
  it('creates a project, generates secrets once, and adds a user', async () => {
    isolate();
    const argv = {
      projectName: 'ring-demo',
      shape: 'preset',
      preset: 'ring-6',
      mode: 'auto',
      createUser: true,
      username: 'artist',
      password: 'hunter2'
    };
    const name = await runInit(argv, autoPrompter());
    expect(name).toBe('ring-demo');

    const store = getStore();
    expect(store.listProjects()).toEqual(['ring-demo']);
    for (const s of store.requiredSecrets('ring-demo')) expect(s.set).toBe(true);
    expect(store.listUsers('ring-demo')).toEqual(['artist']);
    expect(store.verifyUser('ring-demo', 'artist', 'hunter2')).toBe(true);
    expect(store.verifyUser('ring-demo', 'artist', 'wrong')).toBe(false);

    // re-running init preserves existing secrets (one-time generation)
    const before = store.readSecrets('ring-demo');
    await runInit({ ...argv, createUser: false }, autoPrompter());
    expect(store.readSecrets('ring-demo')).toEqual(before);
  });
});

describe('buildEnvLines', () => {
  it('emits generated secrets for the active project', async () => {
    const cwd = isolate();
    await runInit(
      { projectName: 'p', shape: 'preset', preset: 'ring-6', mode: 'auto', createUser: false },
      autoPrompter()
    );
    const text = buildEnvLines({}, cwd).join('\n');
    expect(text).toMatch(/^WG_RECEIVER_KEY=.+/m);
    expect(text).toMatch(/^WG_JWT_SECRET=.+/m);
    expect(text).toMatch(/^WAVEGRID_LAYOUT=ring-6/m);
  });
});
