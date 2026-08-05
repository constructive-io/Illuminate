import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { parseArgs } from '../src/cli';
import { buildConfig, CONFIG_FILENAME, serializeConfig } from '../src/config-file';
import { childEnv, runStart, servicesForMode } from '../src/commands/start';

describe('parseArgs', () => {
  it('extracts the command and flags', () => {
    const { command, flags } = parseArgs(['init', '--preset', 'ring-6', '--yes']);
    expect(command).toBe('init');
    expect(flags.preset).toBe('ring-6');
    expect(flags.yes).toBe(true);
  });

  it('coerces numeric and boolean values', () => {
    const { flags } = parseArgs(['start', '--count', '25', '--flag', 'false']);
    expect(flags.count).toBe(25);
    expect(flags.flag).toBe(false);
  });

  it('expands short flag clusters', () => {
    const { flags } = parseArgs(['-hv']);
    expect(flags.h).toBe(true);
    expect(flags.v).toBe(true);
  });
});

describe('servicesForMode', () => {
  it('runs the local trio for simple mode', () => {
    expect(servicesForMode('simple').map((s) => s.label)).toEqual(['server', 'ui', 'receiver']);
  });

  it('flags the receiver as sharded for distributed mode', () => {
    expect(servicesForMode('distributed').map((s) => s.label)).toEqual(['server', 'ui', 'receiver (shard)']);
  });
});

function scratchWorkspace(preset: string): string {
  const root = mkdtempSync(join(tmpdir(), 'wg-ws-'));
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  writeFileSync(join(root, CONFIG_FILENAME), serializeConfig(buildConfig({ shape: 'preset', preset, mode: 'auto' })));
  const cwd = join(root, 'packages', 'app');
  mkdirSync(cwd, { recursive: true });
  return cwd;
}

describe('runStart (dry-run)', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('selects simple mode under the threshold', () => {
    const cwd = scratchWorkspace('ring-6');
    const result = runStart({ cwd, dryRun: true });
    expect(result.runMode).toBe('simple');
    expect(result.services.map((s) => s.label)).toEqual(['server', 'ui', 'receiver']);
  });

  it('selects distributed mode above the threshold', () => {
    const cwd = scratchWorkspace('grid-7x7');
    const result = runStart({ cwd, dryRun: true });
    expect(result.runMode).toBe('distributed');
  });

  it('throws when no workspace root is found', () => {
    const orphan = mkdtempSync(join(tmpdir(), 'wg-orphan-'));
    expect(() => runStart({ cwd: orphan, dryRun: true })).toThrow(/workspace root/);
  });
});

describe('childEnv', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('forces the resolved mode + layout + ports for child services', () => {
    const cwd = scratchWorkspace('ring-6');
    const env = childEnv(cwd);
    expect(env.WAVEGRID_MODE).toBe('simple');
    expect(env.WAVEGRID_LAYOUT).toBe('ring-6');
    expect(env.PORT).toBe('3000');
    expect(env.UI_PORT).toBe('3003');
    expect(env.SIMULATOR_URL).toBe('ws://localhost:3000');
  });
});
