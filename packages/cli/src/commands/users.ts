import type { Inquirerer, Question } from 'inquirerer';
import c from 'yanse';

import { type Flags, getStore, resolveProjectName } from '../project';

/** `wavegrid users list` — list UI usernames for the current project. */
export function runUsersList(flags: Flags): void {
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const users = store.listUsers(project);

  console.log('');
  console.log(c.bold(`  UI users · ${project}`));
  if (users.length === 0) {
    console.log(c.gray('  (none) — add one with `wavegrid users add`'));
  } else {
    for (const u of users) console.log(`  ${c.cyan('•')} ${u}`);
  }
  console.log('');
}

/**
 * `wavegrid users add [username]` — add/replace a UI login user. Password is
 * hashed before storage; nothing is written in plaintext.
 */
export async function runUsersAdd(flags: Flags, positional: string | undefined, prompter: Inquirerer): Promise<void> {
  const store = getStore();
  const project = resolveProjectName(store, flags);

  const seed: Record<string, unknown> = {};
  if (positional) seed.username = positional;
  else if (typeof flags.username === 'string') seed.username = flags.username;
  if (typeof flags.password === 'string') seed.password = flags.password;

  const questions: Question[] = [
    { type: 'text', name: 'username', message: 'Username' },
    { type: 'password', name: 'password', message: 'Password' }
  ];
  const answers = (await prompter.prompt(seed, questions)) as unknown as { username: string; password: string };

  if (!answers.username || !answers.password) {
    throw new Error('A username and password are required.');
  }
  store.addUser(project, answers.username, answers.password);

  console.log('');
  console.log(c.green(`  ✓ Added UI user ${c.bold(answers.username)} to ${project}`));
  console.log('');
}

/** `wavegrid users rm <username>` — remove a UI user. */
export function runUsersRemove(flags: Flags, username: string | undefined): void {
  if (!username) throw new Error('Usage: wavegrid users rm <username>');
  const store = getStore();
  const project = resolveProjectName(store, flags);
  const removed = store.removeUser(project, username);

  console.log('');
  if (removed) console.log(c.green(`  ✓ Removed UI user ${c.bold(username)} from ${project}`));
  else console.log(c.yellow(`  No such user "${username}" in ${project}`));
  console.log('');
}
