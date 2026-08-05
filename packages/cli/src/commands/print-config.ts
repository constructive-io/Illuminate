import { createWavegridLoader, loadWavegridConfig } from '@wavegrid/layout';
import c from 'yanse';

/**
 * `wavegrid print-config` (also `--print-config`) — resolve the config and
 * print it with per-key provenance so it is obvious where each value came from.
 */
export function runPrintConfig(cwd = process.cwd()): void {
  const resolved = loadWavegridConfig({ cwd });

  console.log('');
  console.log(c.bold('  Resolved configuration'));
  console.log(`  → Source file: ${resolved.filepath ? c.cyan(resolved.filepath) : c.gray('(none — defaults + env)')}`);
  console.log(`  → Layout:      ${c.cyan(resolved.layout.name)} (${resolved.layout.topology}, ${resolved.layout.count} cannons)`);
  console.log(`  → Run mode:    ${c.cyan(resolved.runMode)}`);
  console.log('');
  console.log(c.bold('  Provenance'));

  const loader = createWavegridLoader();
  for (const entry of loader.explainSync({ cwd })) {
    console.log(`  ${entry.path} = ${JSON.stringify(entry.value)}  ${c.gray(`(${entry.source})`)}`);
  }
  console.log('');
}
