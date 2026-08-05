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
 * prompt "What do you want to do?" and let the operator pick — same pattern as
 * pgpm's CLI (autocomplete menu on a shared prompter), so users don't have to
 * memorize subcommands. Returns the chosen subcommand token, or null when
 * there's no TTY (caller should print the subcommand list instead).
 *
 * The prompter MUST be the same instance used for any follow-up action prompt
 * (e.g. `users add` asking for username/password): chaining prompts on one
 * Inquirerer works, but closing it and opening a second one leaves stdin in a
 * bad state and hangs the next prompt.
 */
export async function pickSubcommand(
  prompter: Inquirerer | undefined,
  group: string,
  subs: SubCommand[]
): Promise<string | null> {
  if (!prompter) return null;
  const answer = (await prompter.prompt({}, [
    {
      type: 'autocomplete',
      name: 'sub',
      message: `wavegrid ${group} — what do you want to do?`,
      options: subs.map((s) => ({
        name: `${c.cyan(s.value.padEnd(6))} ${c.gray(s.description)}`,
        value: s.value
      })),
      required: true
    }
  ])) as unknown as { sub: string };
  return answer.sub;
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
