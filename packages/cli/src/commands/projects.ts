import type { Inquirerer } from 'inquirerer';
import c from 'yanse';

import { getStore } from '../project';

/** `wavegrid projects` — list projects in the store, marking the active one. */
export function runProjects(): void {
  const store = getStore();
  const projects = store.listProjects();
  const active = store.getActiveProject();

  console.log('');
  if (projects.length === 0) {
    console.log(c.gray('  No projects yet. Create one with `wavegrid projects create`.'));
    console.log('');
    return;
  }
  console.log(c.bold('  Projects'));
  for (const name of projects) {
    const marker = name === active ? c.green('●') : c.gray('○');
    const suffix = name === active ? c.gray('  (active)') : '';
    console.log(`  ${marker} ${name}${suffix}`);
  }
  console.log('');
}

/**
 * `wavegrid projects use [name]` — set the active project. With no name, prompt
 * with a list of the store's projects (interactive); with no TTY, print usage.
 */
export async function runUse(name: string | undefined, prompter?: Inquirerer): Promise<void> {
  const store = getStore();

  let target = name;
  if (!target) {
    const projects = store.listProjects();
    if (projects.length === 0) {
      console.log('');
      console.log(c.gray('  No projects yet. Create one with `wavegrid projects create`.'));
      console.log('');
      return;
    }
    if (!prompter) {
      console.log(c.red('  Usage: wavegrid projects use <project>'));
      console.log(`  Projects: ${c.cyan(projects.join(', '))}`);
      process.exitCode = 1;
      return;
    }
    const active = store.getActiveProject();
    const answer = (await prompter.prompt({}, [
      {
        type: 'autocomplete',
        name: 'project',
        message: 'Which project should be active?',
        options: projects,
        default: active ?? projects[0],
        required: true
      }
    ])) as unknown as { project: string };
    target = answer.project;
  }

  store.setActiveProject(target);
  console.log('');
  console.log(c.green(`  ✓ Active project is now ${c.bold(target)}`));
  console.log('');
}
