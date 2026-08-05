import { Inquirerer } from 'inquirerer';
import c from 'yanse';

import { runDoctor } from './commands/doctor';
import { runEnvExport } from './commands/env';
import { runInit } from './commands/init';
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

function makePrompter(): { prompter: Inquirerer; nonInteractive: boolean } {
  const nonInteractive = !process.stdin.isTTY;
  const prompter = new Inquirerer({ noTty: nonInteractive, useDefaults: nonInteractive });
  return { prompter, nonInteractive };
}

export async function run(argvInput: string[] = process.argv.slice(2)): Promise<void> {
  const { command, positionals, flags } = parseArgs(argvInput);

  if (flags.version || flags.v) {
    console.log(VERSION);
    return;
  }
  if (flags['print-config']) {
    runPrintConfig(process.cwd(), flags);
    return;
  }

  const knownCommands = ['init', 'start', 'projects', 'use', 'config', 'print-config', 'secrets', 'users', 'env', 'doctor'];
  const showHelp = flags.help || flags.h;
  if (!command || (showHelp && !knownCommands.includes(command))) {
    console.log(HELP);
    return;
  }

  switch (command) {
  case 'init': {
    const { prompter } = makePrompter();
    if (positionals[1]) flags.project = positionals[1];
    try {
      await runInit(flags, prompter);
    } finally {
      prompter.close();
    }
    break;
  }
  case 'start': {
    const { prompter, nonInteractive } = makePrompter();
    try {
      await runStart({ flags, prompter: nonInteractive ? undefined : prompter });
    } finally {
      if (nonInteractive) prompter.close();
    }
    break;
  }
  case 'projects':
    runProjects();
    break;
  case 'use':
    runUse(positionals[1]);
    break;
  case 'config':
  case 'print-config':
    runPrintConfig(process.cwd(), flags);
    break;
  case 'secrets': {
    const sub = positionals[1];
    if (sub === 'init') runSecretsInit(flags);
    else runSecretsList(flags);
    break;
  }
  case 'users': {
    const sub = positionals[1];
    if (sub === 'add') {
      const { prompter } = makePrompter();
      try {
        await runUsersAdd(flags, positionals[2], prompter);
      } finally {
        prompter.close();
      }
    } else if (sub === 'rm' || sub === 'remove') {
      runUsersRemove(flags, positionals[2]);
    } else {
      runUsersList(flags);
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
}
