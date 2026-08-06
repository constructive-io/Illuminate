import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { run } from '../src/cli';
import { getStore } from '../src/project';

function isolate(): void {
  process.env.APPSTASH_BASE_DIR = mkdtempSync(join(tmpdir(), 'wg-tree-'));
}

let logged: string[] = [];
const saved = { ...process.env };

beforeEach(() => {
  logged = [];
  jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logged.push(args.map(String).join(' '));
  });
  process.exitCode = 0;
});
afterEach(() => {
  process.env = { ...saved };
  jest.restoreAllMocks();
  process.exitCode = 0;
});

// Strip ANSI so assertions match on plain text.
const out = (): string => logged.join('\n').replace(/\u001b\[[0-9;]*m/g, '');

describe('command hierarchy (no TTY)', () => {
  it('bare `projects` prints the project subcommand list', async () => {
    isolate();
    await run(['projects']);
    const text = out();
    expect(text).toContain('projects list');
    expect(text).toContain('projects create');
    expect(text).toContain('projects use');
    expect(text).toContain('projects config');
    expect(text).toContain('projects secrets');
    expect(text).toContain('projects users');
    expect(text).toContain('projects env');
  });

  it('bare `settings` prints the settings subcommand list', async () => {
    isolate();
    await run(['settings']);
    const text = out();
    expect(text).toContain('settings environment');
    expect(text).toContain('settings initialize');
  });

  it('`use` is no longer a top-level command', async () => {
    isolate();
    await run(['use', 'whatever']);
    expect(out()).toContain('Unknown command: use');
    expect(process.exitCode).toBe(1);
  });

  it('`projects list` lists projects and marks the active one', async () => {
    isolate();
    const store = getStore();
    store.createProject('alpha', { layout: { preset: 'ring-6' } });
    store.createProject('beta', { layout: { preset: 'grid-7x7' } });
    store.setActiveProject('beta');

    await run(['projects', 'list']);
    const text = out();
    expect(text).toContain('alpha');
    expect(text).toContain('beta');
    expect(text).toContain('(active)');
  });

  it('`projects use` sets the active project (grouped form)', async () => {
    isolate();
    const store = getStore();
    store.createProject('alpha', { layout: { preset: 'ring-6' } });
    store.createProject('beta', { layout: { preset: 'grid-7x7' } });
    store.setActiveProject('alpha');

    await run(['projects', 'use', 'beta']);
    expect(getStore().getActiveProject()).toBe('beta');
  });

  it('`projects set` is an alias for `projects use`', async () => {
    isolate();
    const store = getStore();
    store.createProject('alpha', { layout: { preset: 'ring-6' } });
    store.createProject('beta', { layout: { preset: 'grid-7x7' } });
    store.setActiveProject('alpha');

    await run(['projects', 'set', 'beta']);
    expect(getStore().getActiveProject()).toBe('beta');
  });

  it('`projects config set` updates a project field (nested)', async () => {
    isolate();
    const store = getStore();
    store.createProject('alpha', { layout: { preset: 'ring-6' } });
    store.setActiveProject('alpha');

    await run(['projects', 'config', 'set', 'port', '4321']);
    expect(getStore().getProjectConfig('alpha')?.server?.port).toBe(4321);
  });

  it('`projects config` (no sub, no TTY) prints the resolved config', async () => {
    isolate();
    const store = getStore();
    store.createProject('alpha', { layout: { preset: 'ring-6' } });
    store.setActiveProject('alpha');

    await run(['projects', 'config']);
    expect(out()).toContain('Resolved configuration');
  });

  it('`settings environment` shows the store root', async () => {
    isolate();
    await run(['settings', 'environment']);
    const text = out();
    expect(text).toContain('settings · environment');
    expect(text).toContain(process.env.APPSTASH_BASE_DIR as string);
  });

  it('`settings initialize` reports the store is ready', async () => {
    isolate();
    await run(['settings', 'initialize']);
    expect(out()).toContain('Store ready');
  });

  it('unknown project subcommand is graceful (exit 1, no crash)', async () => {
    isolate();
    await run(['projects', 'bogus']);
    expect(out()).toContain('Unknown projects subcommand: bogus');
    expect(process.exitCode).toBe(1);
  });

  it('`init` still works as a top-level shortcut for project creation', async () => {
    isolate();
    await run(['init', 'gamma', '--preset', 'ring-6', '--mode', 'auto', '--yes']);
    expect(getStore().hasProject('gamma')).toBe(true);
  });
});
