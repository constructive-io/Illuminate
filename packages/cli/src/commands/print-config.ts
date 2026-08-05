import { createWavegridLoader, loadWavegridConfig } from '@wavegrid/layout';
import c from 'yanse';

import { type Flags, getStore } from '../project';

/** Keys that must never be printed even if they ever appear in the config. */
const SECRET_KEY = /secret|password|token|key/i;

/**
 * `wavegrid config` (also `print-config` / `--print-config`) — resolve the
 * config and print it with per-key provenance. Non-sensitive only: any value
 * whose key looks secret is masked, and generated secrets are shown as a
 * set/unset status via the store, never as values.
 */
export function runPrintConfig(cwd = process.cwd(), flags: Flags = {}): void {
  const resolved = loadWavegridConfig({ cwd });

  console.log('');
  console.log(c.bold('  Resolved configuration'));
  console.log(`  → Source file: ${resolved.filepath ? c.cyan(resolved.filepath) : c.gray('(none — store + defaults + env)')}`);
  console.log(`  → Layout:      ${c.cyan(resolved.layout.name)} (${resolved.layout.topology}, ${resolved.layout.count} cannons)`);
  console.log(`  → Run mode:    ${c.cyan(resolved.runMode)}`);
  console.log('');
  console.log(c.bold('  Provenance'));

  const loader = createWavegridLoader();
  for (const entry of loader.explainSync({ cwd })) {
    const value = SECRET_KEY.test(entry.path) ? c.gray('«hidden»') : JSON.stringify(entry.value);
    console.log(`  ${entry.path} = ${value}  ${c.gray(`(${entry.source})`)}`);
  }

  // Secret status for the current/selected project — status only, never values.
  const store = getStore();
  const project =
    (typeof flags.project === 'string' ? flags.project : undefined) ??
    process.env.WAVEGRID_PROJECT ??
    store.getActiveProject() ??
    undefined;

  console.log('');
  if (project && store.hasProject(project)) {
    console.log(c.bold(`  Secrets · ${project}`));
    for (const s of store.requiredSecrets(project)) {
      const status = s.set ? c.green('set') : c.red('NOT SET');
      console.log(`  ${s.set ? c.green('✓') : c.red('✗')} ${s.name}  ${c.gray(`[${status}]`)}`);
    }
  } else {
    console.log(c.gray('  No active project — run `wavegrid init` to create one.'));
  }
  console.log('');
}
