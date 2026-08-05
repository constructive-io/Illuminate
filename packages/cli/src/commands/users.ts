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

  // Let the username come from the bare positional (`wavegrid users add alice`)
  // via inquirerer's `_: true`, or the named `--username`/`--password` flags.
  const argv: Record<string, unknown> = {};
  if (positional) argv._ = [positional];
  if (typeof flags.username === 'string') argv.username = flags.username;
  if (typeof flags.password === 'string') argv.password = flags.password;

  const questions: Question[] = [
    { type: 'text', name: 'username', message: 'Username', _: true },
    { type: 'password', name: 'password', message: 'Password' }
  ];
  const answers = (await prompter.prompt(argv, questions)) as unknown as { username: string; password: string };

  if (!answers.username || !answers.password) {
    throw new Error('A username and password are required.');
  }
  store.addUser(project, answers.username, answers.password);

  console.log('');
  console.log(c.green(`  ✓ Added UI user ${c.bold(answers.username)} to ${project}`));
  console.log('');
}

/**
 * `wavegrid users rm [username]` — remove a UI user. With no username, prompt
 * with a list of the project's users (interactive); with no TTY, print usage.
 */
export async function runUsersRemove(flags: Flags, username: string | undefined, prompter?: Inquirerer): Promise<void> {
  const store = getStore();
  const project = resolveProjectName(store, flags);

  let target = username;
  if (!target) {
    const users = store.listUsers(project);
    if (users.length === 0) {
      console.log('');
      console.log(c.gray(`  No UI users in ${project} — add one with \`wavegrid users add\``));
      console.log('');
      return;
    }
    if (!prompter) {
      console.log(c.red('  Usage: wavegrid users rm <username>'));
      console.log(`  Users: ${c.cyan(users.join(', '))}`);
      process.exitCode = 1;
      return;
    }
    const answer = (await prompter.prompt({}, [
      {
        type: 'autocomplete',
        name: 'username',
        message: `Which user should be removed from ${project}?`,
        options: users,
        required: true
      }
    ])) as unknown as { username: string };
    target = answer.username;
  }

  const removed = store.removeUser(project, target);

  console.log('');
  if (removed) console.log(c.green(`  ✓ Removed UI user ${c.bold(target)} from ${project}`));
  else console.log(c.yellow(`  No such user "${target}" in ${project}`));
  console.log('');
}
