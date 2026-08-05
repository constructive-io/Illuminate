import { Inquirerer } from 'inquirerer';
import c from 'yanse';

import { runConfigSet } from './commands/config-set';
import { runDoctor } from './commands/doctor';
import { runEnvExport } from './commands/env';
import { runInit } from './commands/init';
import { pickCommand, pickSubcommand, printSubcommands, type SubCommand } from './commands/menu';
import { runPrintConfig } from './commands/print-config';
import { runProjects, runUse } from './commands/projects';
import { runSecretsInit, runSecretsList } from './commands/secrets';
import { runStart } from './commands/start';
import { runUsersAdd, runUsersList, runUsersRemove } from './commands/users';
import type { Flags } from './project';

const VERSION = 'wavegrid-cli@0.5.0';

const HELP = `
${c.bold('wavegrid')} — config-driven laser installation launcher

${c.bold('Usage')}
  wavegrid <command> [options]

${c.bold('Commands')}
  init [name]         Create a project in the store (generates secrets once)
  start               Load the active project and run server + receiver
  projects            List projects in the store
  use <name>          Set the active project
  config              Print the resolved config + provenance (secrets masked)
  config set <k> <v>  Set a project config field (layout, mode, port, host, ui-port)
  secrets list        List required secrets and whether each is set
  secrets init        Generate any missing secrets (--force to rotate)
  users list          List UI login users for the current project
  users add [name]    Add/replace a UI login user (password prompted)
  users rm <name>     Remove a UI login user
  env export          Write a .env for the current project (--file to override)
  doctor              Diagnose this laptop + the whole installation

${c.bold('Options')}
  --project <name>    Act on a specific project (else the active one)
  --print-config      Alias for the config command
  -h, --help          Show this help
  -v, --version       Show version
`;

const COMMANDS: SubCommand[] = [
  { value: 'init', description: 'Create a project in the store (generates secrets once)' },
  { value: 'start', description: 'Load the active project and run server + receiver' },
  { value: 'projects', description: 'List projects in the store' },
  { value: 'use', description: 'Set the active project' },
  { value: 'config', description: 'Print the resolved config + provenance (secrets masked)' },
  { value: 'secrets', description: 'List or generate required secrets' },
  { value: 'users', description: 'List, add, or remove UI login users' },
  { value: 'env', description: 'Write a .env for the current project' },
  { value: 'doctor', description: 'Diagnose this laptop + the whole installation' }
];

const SECRETS_SUBS: SubCommand[] = [
  { value: 'list', description: 'List required secrets and whether each is set' },
  { value: 'init', description: 'Generate any missing secrets (--force to rotate)' }
];

const USERS_SUBS: SubCommand[] = [
  { value: 'list', description: 'List UI login users for the current project' },
  { value: 'add', description: 'Add/replace a UI login user (password prompted)' },
  { value: 'rm', description: 'Remove a UI login user' }
];

export interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Flags;
}

/**
 * Minimal argv parser: bare tokens are positionals (first is the command),
 * `--key value` / `--flag` become flags. Kept dependency-free so the CLI
 * stays small.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Flags = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith('--')) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next != null && !next.startsWith('-')) {
        flags[key] = coerce(next);
        i++;
      } else {
        flags[key] = true;
      }
    } else if (tok.startsWith('-')) {
      for (const ch of tok.slice(1)) flags[ch] = true;
    } else {
      positionals.push(tok);
    }
  }
  return { command: positionals[0], positionals, flags };
}

function coerce(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

const KNOWN_COMMANDS = ['init', 'start', 'projects', 'use', 'config', 'print-config', 'secrets', 'users', 'env', 'doctor'];

/**
 * Resolve a command-group subcommand: use the one given on the CLI, else prompt
 * a menu (interactive), else print the subcommand list (no TTY). The passed
 * prompter is the shared one for the whole run — a follow-up action prompt
 * (e.g. `users add`) reuses it rather than opening a second Inquirerer, which
 * would leave stdin in a bad state and hang.
 */
async function resolveSub(
  given: string | undefined,
  group: string,
  subs: SubCommand[],
  prompter: Inquirerer,
  nonInteractive: boolean
): Promise<string | null> {
  if (given != null) return given;
  const chosen = await pickSubcommand(nonInteractive ? undefined : prompter, group, subs);
  if (chosen == null) printSubcommands(group, subs);
  return chosen;
}

export async function run(argvInput: string[] = process.argv.slice(2)): Promise<void> {
  const { command: given, positionals, flags } = parseArgs(argvInput);

  if (flags.version || flags.v) {
    console.log(VERSION);
    return;
  }
  if (flags['print-config']) {
    runPrintConfig(process.cwd(), flags);
    return;
  }

  const showHelp = flags.help || flags.h;
  // Explicit help, or an unknown command with --help, just prints usage.
  if (showHelp && (!given || !KNOWN_COMMANDS.includes(given))) {
    console.log(HELP);
    return;
  }

  // One prompter for the whole run: a top-level menu chains into a command's
  // own prompts on the SAME instance (closing + reopening hangs stdin).
  const nonInteractive = !process.stdin.isTTY;
  const prompter = new Inquirerer({ noTty: nonInteractive, useDefaults: nonInteractive });
  // `start` runs a long-lived server; leave its interactive prompter attached
  // (closing it mid-run interferes with Ctrl-C handling of the running server).
  let keepOpen = false;

  try {
    let command = given;
    if (!command) {
      // Bare `wavegrid`: interactive menu, or usage when there's no TTY.
      if (nonInteractive) {
        console.log(HELP);
        return;
      }
      command = (await pickCommand(prompter, COMMANDS)) ?? undefined;
      if (!command) {
        console.log(HELP);
        return;
      }
    }

    switch (command) {
    case 'init': {
      if (positionals[1]) flags.project = positionals[1];
      await runInit(flags, prompter);
      break;
    }
    case 'start': {
      keepOpen = !nonInteractive;
      await runStart({ flags, prompter: nonInteractive ? undefined : prompter });
      break;
    }
    case 'projects':
      runProjects();
      break;
    case 'use':
      await runUse(positionals[1], nonInteractive ? undefined : prompter);
      break;
    case 'config':
    case 'print-config':
      if (positionals[1] === 'set') {
        await runConfigSet(positionals[2], positionals[3], flags, nonInteractive ? undefined : prompter);
      } else runPrintConfig(process.cwd(), flags);
      break;
    case 'secrets': {
      const sub = (await resolveSub(positionals[1], 'secrets', SECRETS_SUBS, prompter, nonInteractive)) ?? undefined;
      if (sub == null) break;
      if (sub === 'init') runSecretsInit(flags);
      else if (sub === 'list') runSecretsList(flags);
      else {
        console.log(c.red(`Unknown secrets subcommand: ${sub}`));
        process.exitCode = 1;
      }
      break;
    }
    case 'users': {
      const sub = (await resolveSub(positionals[1], 'users', USERS_SUBS, prompter, nonInteractive)) ?? undefined;
      if (sub == null) break;
      if (sub === 'add') await runUsersAdd(flags, positionals[2], prompter);
      else if (sub === 'rm' || sub === 'remove') {
        await runUsersRemove(flags, positionals[2], nonInteractive ? undefined : prompter);
      } else if (sub === 'list') runUsersList(flags);
      else {
        console.log(c.red(`Unknown users subcommand: ${sub}`));
        process.exitCode = 1;
      }
      break;
    }
    case 'env': {
      const sub = positionals[1];
      if (sub === 'export' || sub == null) runEnvExport(flags);
      else {
        console.log(c.red(`Unknown env subcommand: ${sub}`));
        process.exitCode = 1;
      }
      break;
    }
    case 'doctor':
      await runDoctor(flags);
      break;
    default:
      console.log(c.red(`Unknown command: ${command}`));
      console.log(HELP);
      process.exitCode = 1;
    }
  } finally {
    if (!keepOpen) prompter.close();
  }
}
