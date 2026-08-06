import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { applyShardFlag } from '../src/commands/runtime';
import { runReceiver } from '../src/commands/receiver';
import { runServer } from '../src/commands/server';
import { buildConfig, CONFIG_FILENAME, serializeConfig } from '../src/config-file';

function scratchDir(preset: string, port?: number): string {
  const root = mkdtempSync(join(tmpdir(), 'wg-rt-'));
  const cfg = buildConfig({ shape: 'preset', preset, mode: 'auto', ...(port ? { serverPort: port } : {}) });
  writeFileSync(join(root, CONFIG_FILENAME), serializeConfig(cfg));
  return root;
}

describe('applyShardFlag', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('accepts a start-end range', () => {
    expect(applyShardFlag('0-24')).toBe(true);
    expect(process.env.SHARD_START).toBe('0');
    expect(process.env.SHARD_END).toBe('24');
  });

  it('accepts a bare single cannon', () => {
    expect(applyShardFlag(5)).toBe(true);
    expect(process.env.SHARD_START).toBe('5');
    expect(process.env.SHARD_END).toBe('5');
  });

  it('no-ops (true) when unset', () => {
    expect(applyShardFlag(undefined)).toBe(true);
    expect(process.env.SHARD_START).toBeUndefined();
  });

  it('rejects a reversed or malformed range', () => {
    expect(applyShardFlag('24-0')).toBe(false);
    expect(applyShardFlag('abc')).toBe(false);
  });
});

describe('runServer (dry-run)', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;
    delete process.env.WAVEGRID_PORT;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it('resolves the configured port without starting anything', async () => {
    const cwd = scratchDir('ring-6', 3333);
    const result = await runServer({ cwd, dryRun: true });
    expect(result.port).toBe(3333);
    expect(typeof result.stop).toBe('function');
  });
});

describe('runReceiver (dry-run)', () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.WAVEGRID_LAYOUT;
    delete process.env.WAVEGRID_MODE;
    delete process.env.SIMULATOR_URL;
    delete process.env.SHARD_START;
    delete process.env.SHARD_END;
    process.exitCode = undefined;
  });
  afterEach(() => {
    process.env = { ...saved };
    process.exitCode = undefined;
  });

  it('applies --server and --shard', async () => {
    const cwd = scratchDir('grid-7x7');
    const result = await runReceiver({
      cwd,
      dryRun: true,
      flags: { server: 'ws://192.168.1.42:3333', shard: '0-24' }
    });
    expect(result.server).toBe('ws://192.168.1.42:3333');
    expect(process.env.SHARD_START).toBe('0');
    expect(process.env.SHARD_END).toBe('24');
  });

  it('rejects a malformed --shard with a non-zero exit code', async () => {
    const cwd = scratchDir('ring-6');
    await runReceiver({ cwd, dryRun: true, flags: { shard: '99-1' } });
    expect(process.exitCode).toBe(1);
  });
});
