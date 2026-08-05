import { resolveLayout, type WavegridConfig } from '@wavegrid/layout';
import c from 'yanse';

import { knownPresets } from '../config-file';
import { type Flags, getStore, resolveProjectName } from '../project';

/** Settable config keys and how each maps into the stored project config. */
const SETTERS: Record<string, (config: Partial<WavegridConfig>, value: string) => void> = {
  layout: (config, value) => {
    if (!knownPresets().includes(value)) {
      throw new Error(`Unknown preset "${value}". Known: ${knownPresets().join(', ')}.`);
    }
    // Validate the preset actually resolves before persisting.
    resolveLayout({ preset: value });
    config.layout = { preset: value };
  },
  mode: (config, value) => {
    if (value !== 'auto' && value !== 'simple' && value !== 'distributed') {
      throw new Error(`Invalid mode "${value}". Use auto | simple | distributed.`);
    }
    config.mode = value;
  },
  port: (config, value) => {
    config.server = { ...config.server, port: intOrThrow('port', value) } as WavegridConfig['server'];
  },
  host: (config, value) => {
    config.server = { ...config.server, host: value } as WavegridConfig['server'];
  },
  'ui-port': (config, value) => {
    config.ui = { ...config.ui, port: intOrThrow('ui-port', value) } as WavegridConfig['ui'];
  }
};

// `preset` is an alias for `layout`.
SETTERS.preset = SETTERS.layout;

function intOrThrow(key: string, value: string): number {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || String(n) !== value.trim()) {
    throw new Error(`${key} must be an integer, got "${value}".`);
  }
  return n;
}

/**
 * `wavegrid config set <key> <value>` — update a single field in the active
 * (or `--project`) project's stored config. This is the supported way to
 * change layout/port/etc. after `init` without hand-editing the store JSON.
 */
export function runConfigSet(key: string | undefined, value: string | undefined, flags: Flags = {}): void {
  const setter = key ? SETTERS[key] : undefined;
  if (!key || !setter) {
    console.log(c.red(`  Usage: wavegrid config set <key> <value>`));
    console.log(`  Keys: ${c.cyan(Object.keys(SETTERS).sort().join(', '))}`);
    process.exitCode = 1;
    return;
  }
  if (value == null || value === '') {
    console.log(c.red(`  Missing value for "${key}".`));
    process.exitCode = 1;
    return;
  }

  const store = getStore();
  const project = resolveProjectName(store, flags);
  const config = store.getProjectConfig(project) ?? {};
  setter(config, value);
  store.saveProjectConfig(project, config);

  console.log('');
  console.log(c.green(`  ✓ ${project}: set ${c.cyan(key)} = ${c.cyan(value)}`));
  console.log(c.gray(`  Run \`wavegrid config\` to see the resolved result.`));
  console.log('');
}
