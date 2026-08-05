import { mkdtempSync } from 'fs';
import { Inquirerer } from 'inquirerer';
import { tmpdir } from 'os';
import { join } from 'path';

import { pickSubcommand, printSubcommands, type SubCommand } from '../src/commands/menu';
import { runUsersAdd } from '../src/commands/users';
import { getStore } from '../src/project';

const USERS_SUBS: SubCommand[] = [
  { value: 'list', description: 'List UI login users for the current project' },
  { value: 'add', description: 'Add/replace a UI login user (password prompted)' },
  { value: 'rm', description: 'Remove a UI login user' }
];

/** A non-interactive prompter that fills answers from the seed/defaults. */
function autoPrompter(): Inquirerer {
  return new Inquirerer({ noTty: true, useDefaults: true });
}

function isolate(): void {
  process.env.APPSTASH_BASE_DIR = mkdtempSync(join(tmpdir(), 'wg-menu-'));
}

const saved = { ...process.env };
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...saved };
  jest.restoreAllMocks();
});

describe('pickSubcommand', () => {
  it('returns null (no menu) when there is no prompter', async () => {
    expect(await pickSubcommand(undefined, 'users', USERS_SUBS)).toBeNull();
  });

  it('prompts an autocomplete menu and returns the chosen subcommand', async () => {
    const questions: Array<Record<string, unknown>> = [];
    const stub = {
      prompt: async (_argv: unknown, qs: Array<Record<string, unknown>>) => {
        questions.push(qs[0]);
        return { sub: 'add' };
      }
    } as unknown as Inquirerer;

    const chosen = await pickSubcommand(stub, 'users', USERS_SUBS);
    expect(chosen).toBe('add');

    const q = questions[0];
    expect(q.type).toBe('autocomplete');
    expect(q.name).toBe('sub');
    expect(String(q.message).toLowerCase()).toContain('what do you want to do?');
    expect((q.options as Array<{ value: string }>).map((o) => o.value)).toEqual(['list', 'add', 'rm']);
  });
});

describe('printSubcommands', () => {
  it('lists every subcommand for the group', () => {
    const spy = jest.spyOn(console, 'log');
    printSubcommands('users', USERS_SUBS);
    const out = spy.mock.calls.map((c) => String(c[0])).join('\n');
    for (const s of USERS_SUBS) expect(out).toContain(`users ${s.value}`);
  });
});

describe('runUsersAdd positional (_: true)', () => {
  it('takes the username from the bare positional and the password flag', async () => {
    isolate();
    const store = getStore();
    store.createProject('ring-demo', { layout: { preset: 'ring-6' } });

    await runUsersAdd({ password: 'hunter2' }, 'alice', autoPrompter());

    expect(store.listUsers('ring-demo')).toEqual(['alice']);
    expect(store.verifyUser('ring-demo', 'alice', 'hunter2')).toBe(true);
  });

  it('takes the username from the --username flag', async () => {
    isolate();
    const store = getStore();
    store.createProject('ring-demo', { layout: { preset: 'ring-6' } });

    await runUsersAdd({ username: 'bob', password: 'pw12345' }, undefined, autoPrompter());

    expect(store.listUsers('ring-demo')).toEqual(['bob']);
    expect(store.verifyUser('ring-demo', 'bob', 'pw12345')).toBe(true);
  });
});
