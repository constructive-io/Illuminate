import type { ResetSummary } from '@wavegrid/settings';
import type { Inquirerer, Question } from 'inquirerer';
import c from 'yanse';

import { type Flags, getStore } from '../project';

/** The word an operator has to type to lose everything. */
const CONFIRM_WORD = 'clear all';

function report(summary: ResetSummary, root: string): void {
  console.log('');
  console.log(c.green(`  ✓ Cleared ${c.bold(root)}`));
  if (summary.projects.length > 0) {
    console.log(c.gray(`    projects: ${summary.projects.join(', ')}`));
  }
  console.log(
    c.gray(`    ${summary.secrets} secret file(s), ${summary.logs} log dir(s)` +
      `${summary.device ? ', device identity' : ''} removed`)
  );
  console.log('');
  console.log(c.gray('  Start again with `wavegrid projects create`.'));
  console.log('');
}

/**
 * `wavegrid settings clear` — wipe the whole store. Irreversible: secrets are
 * generated once and cannot be recovered, so it refuses unless the operator
 * types the confirmation word, or passes `--yes` for scripts.
 */
export async function runSettingsClear(flags: Flags, prompter?: Inquirerer): Promise<void> {
  const store = getStore();
  const projects = store.listProjects();
  const keepDevice = flags['keep-device'] === true;

  console.log('');
  console.log(c.bold(`  Clear all — ${c.cyan(store.paths.root)}`));
  if (projects.length === 0) {
    console.log(c.gray('  The store is already empty.'));
    console.log('');
    return;
  }
  console.log(`  ${projects.length} project(s): ${c.cyan(projects.join(', '))}`);
  console.log(c.yellow('  Removes every project, secret, user, access key, session, device'));
  console.log(c.yellow(`  record, light map and log${keepDevice ? '' : ', plus this machine\'s device identity'}.`));
  console.log(c.red('  Secrets are generated once and cannot be recovered.'));

  if (flags.yes !== true && flags.y !== true) {
    if (!prompter) {
      console.log('');
      console.log(c.red('  Refusing to clear without confirmation.'));
      console.log(c.gray('  Re-run interactively, or pass --yes if you really mean it.'));
      console.log('');
      process.exitCode = 1;
      return;
    }
    console.log('');
    const answer = (await prompter.prompt({}, [
      {
        type: 'text',
        name: 'confirm',
        message: `Type "${CONFIRM_WORD}" to confirm`,
        required: false
      } as Question
    ])) as unknown as { confirm?: string };
    if ((answer.confirm ?? '').trim().toLowerCase() !== CONFIRM_WORD) {
      console.log('');
      console.log(c.gray('  Nothing cleared.'));
      console.log('');
      return;
    }
  }

  report(store.reset({ keepDevice }), store.paths.root);
}
