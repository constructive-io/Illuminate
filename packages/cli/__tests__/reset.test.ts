import { mkdtempSync } from 'fs';
import type { Inquirerer } from 'inquirerer';
import { tmpdir } from 'os';
import { join } from 'path';

import { runSettingsClear } from '../src/commands/reset';
import { getStore } from '../src/project';

function isolate(): string {
  const dir = mkdtempSync(join(tmpdir(), 'wg-clear-'));
  process.env.APPSTASH_BASE_DIR = dir;
  return dir;
}

/** Two projects with users, keys and secrets — what a clear-all has to remove. */
function populated(): ReturnType<typeof getStore> {
  const store = getStore();
  for (const name of ['ring-demo', 'warehouse']) {
    store.createProject(name, { layout: { preset: 'ring-6' } });
    store.generateSecrets(name);
    store.addUser(name, 'ada', 'hunter2', 'admin');
    store.mintAccessKey(name, 'crew');
  }
  return store;
}

function text(spy: jest.SpyInstance): string {
  return spy.mock.calls.map((c) => String(c[0]).replace(/\u001b\[[0-9;]*m/g, '')).join('\n');
}

/** A prompter stand-in that answers the confirmation with `answer`. */
function prompter(answer: string): Inquirerer {
  return { prompt: jest.fn().mockResolvedValue({ confirm: answer }) } as unknown as Inquirerer;
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

describe('wavegrid settings clear', () => {
  it('wipes every project once the confirmation word is typed', async () => {
    isolate();
    const store = populated();

    await runSettingsClear({}, prompter('clear all'));

    expect(store.listProjects()).toEqual([]);
    expect(text(log)).toMatch(/Cleared/);
  });

  it('accepts the confirmation regardless of case or padding', async () => {
    isolate();
    const store = populated();

    await runSettingsClear({}, prompter('  Clear All  '));

    expect(store.listProjects()).toEqual([]);
  });

  it('keeps everything when the confirmation does not match', async () => {
    isolate();
    const store = populated();

    await runSettingsClear({}, prompter('yes'));

    expect(store.listProjects()).toEqual(['ring-demo', 'warehouse']);
    expect(text(log)).toMatch(/Nothing cleared/);
  });

  it('clears without prompting when --yes is passed', async () => {
    isolate();
    const store = populated();

    await runSettingsClear({ yes: true });

    expect(store.listProjects()).toEqual([]);
  });

  it('refuses non-interactively without --yes rather than guessing', async () => {
    isolate();
    const store = populated();

    await runSettingsClear({});

    expect(store.listProjects()).toEqual(['ring-demo', 'warehouse']);
    expect(process.exitCode).toBe(1);
    expect(text(log)).toMatch(/Refusing to clear without confirmation/);
  });

  it('lists what will go before asking', async () => {
    isolate();
    populated();

    await runSettingsClear({}, prompter('no'));

    const out = text(log);
    expect(out).toMatch(/2 project\(s\): ring-demo, warehouse/);
    expect(out).toMatch(/cannot be recovered/);
  });

  it('keeps this machine\'s identity with --keep-device', async () => {
    isolate();
    const store = populated();
    const before = store.getDevice();

    await runSettingsClear({ yes: true, 'keep-device': true });

    expect(store.getDevice().id).toBe(before.id);
  });

  it('says so and does nothing on an already-empty store', async () => {
    isolate();
    const store = getStore();

    await runSettingsClear({ yes: true });

    expect(store.listProjects()).toEqual([]);
    expect(text(log)).toMatch(/already empty/);
    expect(process.exitCode).toBe(0);
  });
});
