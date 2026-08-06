import c from 'yanse';

import { getStore } from '../project';

/**
 * `wavegrid settings environment` — show the global store environment: where
 * the store lives, the `APPSTASH_BASE_DIR` override (if any), the active
 * project, and the runtime. Read-only, no secrets.
 */
export function runSettingsEnvironment(): void {
  const store = getStore();
  const { paths } = store;
  const active = store.getActiveProject();
  const projects = store.listProjects();
  const override = process.env.APPSTASH_BASE_DIR;

  console.log('');
  console.log(c.bold('  Wavegrid · settings · environment'));
  console.log('');
  console.log(`  → Store root:   ${c.cyan(paths.root)}`);
  console.log(`  → Config:       ${c.cyan(paths.config)}`);
  console.log(`  → Data:         ${c.cyan(paths.data)}`);
  console.log(`  → Logs:         ${c.cyan(paths.logs)}`);
  console.log(`  → Base override: ${override ? c.cyan(override) : c.gray('(none — using home dir)')}`);
  console.log(`  → Active project: ${active ? c.cyan(active) : c.gray('(none)')}`);
  console.log(`  → Projects:     ${projects.length ? c.cyan(String(projects.length)) : c.gray('0')}`);
  console.log(`  → Node:         ${c.cyan(process.version)}`);
  console.log('');
}

/**
 * `wavegrid settings initialize` — ensure the global store scaffold exists.
 * Opening the store already creates `~/.wavegrid/{config,data,logs}`; this
 * makes that explicit and idempotent, then prints where everything landed.
 */
export function runSettingsInitialize(): void {
  const store = getStore();
  const { paths } = store;

  console.log('');
  console.log(c.green(`  ✓ Store ready at ${c.bold(paths.root)}`));
  console.log(c.gray(`    config: ${paths.config}`));
  console.log(c.gray(`    data:   ${paths.data}`));
  console.log(c.gray(`    logs:   ${paths.logs}`));
  console.log('');
  console.log(c.gray('  Create a project with `wavegrid projects create`.'));
  console.log('');
}
