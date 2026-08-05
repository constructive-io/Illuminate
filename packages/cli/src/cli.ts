import { Inquirerer } from 'inquirerer';
import c from 'yanse';

import { runInit } from './commands/init';
import { runPrintConfig } from './commands/print-config';
import { runStart } from './commands/start';

const VERSION = 'wavegrid-cli@0.1.0';

const HELP = `
${c.bold('wavegrid')} — config-driven laser installation launcher

${c.bold('Usage')}
  wavegrid <command> [options]

${c.bold('Commands')}
  init            Scaffold a wavegrid.json (prompts for shape + mode)
  start           Load the config and launch server + ui + receiver
  print-config    Print the resolved config with per-key provenance

${c.bold('Options')}
  --print-config  Alias for the print-config command
  -h, --help      Show this help
  -v, --version   Show version
`;

export interface ParsedArgs {
  command?: string;
  flags: Record<string, string | number | boolean>;
}

/**
 * Minimal argv parser: first bare token is the command, `--key value` / `--flag`
 * become flags. Kept dependency-free so the CLI stays small.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | number | boolean> = {};
  let command: string | undefined;

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
    } else if (command == null) {
      command = tok;
    }
  }
  return { command, flags };
}

function coerce(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !Number.isNaN(Number(value))) return Number(value);
  return value;
}

export async function run(argvInput: string[] = process.argv.slice(2)): Promise<void> {
  const { command, flags } = parseArgs(argvInput);

  if (flags.version || flags.v) {
    console.log(VERSION);
    return;
  }
  if (flags['print-config']) {
    runPrintConfig();
    return;
  }

  const showHelp = flags.help || flags.h;
  if (!command || (showHelp && command !== 'init' && command !== 'start' && command !== 'print-config')) {
    console.log(HELP);
    return;
  }

  switch (command) {
  case 'init': {
    const nonInteractive = Boolean(flags.yes || flags.y || !process.stdin.isTTY);
    const prompter = new Inquirerer({ noTty: nonInteractive, useDefaults: nonInteractive });
    try {
      await runInit(flags, prompter);
    } finally {
      prompter.close();
    }
    break;
  }
  case 'start':
    runStart();
    break;
  case 'print-config':
    runPrintConfig();
    break;
  default:
    console.log(c.red(`Unknown command: ${command}`));
    console.log(HELP);
    process.exitCode = 1;
  }
}
