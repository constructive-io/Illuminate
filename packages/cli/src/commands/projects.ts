import c from 'yanse';

import { getStore } from '../project';

/** `wavegrid projects` — list projects in the store, marking the active one. */
export function runProjects(): void {
  const store = getStore();
  const projects = store.listProjects();
  const active = store.getActiveProject();

  console.log('');
  if (projects.length === 0) {
    console.log(c.gray('  No projects yet. Create one with `wavegrid init`.'));
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

/** `wavegrid use <name>` — set the active project. */
export function runUse(name: string | undefined): void {
  if (!name) {
    throw new Error('Usage: wavegrid use <project>');
  }
  const store = getStore();
  store.setActiveProject(name);
  console.log('');
  console.log(c.green(`  ✓ Active project is now ${c.bold(name)}`));
  console.log('');
}
