import type { Inquirerer } from 'inquirerer';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { runUse } from '../src/commands/projects';
import { getStore } from '../src/project';

function isolate(): void {
  process.env.APPSTASH_BASE_DIR = mkdtempSync(join(tmpdir(), 'wg-use-'));
}

const saved = { ...process.env };
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...saved };
  jest.restoreAllMocks();
});

describe('runUse', () => {
  it('activates the project named on the CLI (positional)', async () => {
    isolate();
    const store = getStore();
    store.createProject('a', { layout: { preset: 'ring-6' } });
    store.createProject('b', { layout: { preset: 'grid-7x7' } });

    await runUse('b');

    expect(store.getActiveProject()).toBe('b');
  });

  it('prompts a list of projects when no name is given (interactive)', async () => {
    isolate();
    const store = getStore();
    store.createProject('a', { layout: { preset: 'ring-6' } });
    store.createProject('b', { layout: { preset: 'grid-7x7' } });

    const questions: Array<Record<string, unknown>> = [];
    const stub = {
      prompt: async (_argv: unknown, qs: Array<Record<string, unknown>>) => {
        questions.push(qs[0]);
        return { project: 'a' };
      }
    } as unknown as Inquirerer;

    await runUse(undefined, stub);

    expect((questions[0].options as string[])).toEqual(['a', 'b']);
    expect(store.getActiveProject()).toBe('a');
  });

  it('errors (exit 1, no crash) when no name is given and there is no TTY', async () => {
    isolate();
    getStore().createProject('a', { layout: { preset: 'ring-6' } });
    process.exitCode = 0;

    await runUse(undefined);

    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('is a graceful no-op when there are no projects yet', async () => {
    isolate();
    process.exitCode = 0;

    await runUse(undefined);

    expect(process.exitCode).toBe(0);
  });
});
