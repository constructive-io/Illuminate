import type { Inquirerer } from 'inquirerer';
import c from 'yanse';

export interface SubCommand {
  /** The subcommand token, e.g. `add`. */
  value: string;
  /** Short one-line description shown next to the choice. */
  description: string;
}

/**
 * When a command group (e.g. `wavegrid users`) is run with no subcommand,
 * prompt "What do you want to do?" and let the operator pick — so users don't
 * have to memorize subcommands. Returns the chosen subcommand token, or null
 * when there's no TTY (caller should print the subcommand list instead).
 *
 * Uses a `list` (arrow-select) rather than an autocomplete: the options carry
 * decorated (ANSI + description) names, and autocomplete's type-to-filter
 * mis-resolves several short tokens against those decorated strings (e.g.
 * typing `rm` selected `add`, `mode` selected `host`). A list shows every
 * choice with its description and always returns exactly what's highlighted.
 *
 * The prompter MUST be the same instance used for any follow-up action prompt
 * (e.g. `users add` asking for username/password): chaining prompts on one
 * Inquirerer works, but closing it and opening a second one leaves stdin in a
 * bad state and hangs the next prompt.
 */
export async function pickFromMenu(
  prompter: Inquirerer | undefined,
  message: string,
  subs: SubCommand[]
): Promise<string | null> {
  if (!prompter) return null;
  const pad = Math.max(6, ...subs.map((s) => s.value.length));
  const answer = (await prompter.prompt({}, [
    {
      type: 'list',
      name: 'choice',
      message,
      options: subs.map((s) => ({
        name: `${c.cyan(s.value.padEnd(pad))} ${c.gray(s.description)}`,
        value: s.value
      })),
      required: true
    }
  ])) as unknown as { choice: string };
  return answer.choice;
}

/** Menu for a bare command group, e.g. `wavegrid users`. */
export function pickSubcommand(
  prompter: Inquirerer | undefined,
  group: string,
  subs: SubCommand[]
): Promise<string | null> {
  return pickFromMenu(prompter, `wavegrid ${group} — what do you want to do?`, subs);
}

/** Top-level menu for bare `wavegrid`. */
export function pickCommand(prompter: Inquirerer | undefined, subs: SubCommand[]): Promise<string | null> {
  return pickFromMenu(prompter, 'wavegrid — what do you want to do?', subs);
}

/** Print a group's subcommands (used when there's no TTY to prompt). */
export function printSubcommands(group: string, subs: SubCommand[]): void {
  console.log('');
  console.log(c.bold(`  wavegrid ${group}`));
  for (const s of subs) {
    console.log(`  ${c.cyan(`${group} ${s.value}`.padEnd(18))} ${c.gray(s.description)}`);
  }
  console.log('');
}
