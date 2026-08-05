import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  buildConfig,
  buildLayoutSpec,
  CONFIG_FILENAME,
  findConfigFile,
  findRepoRoot,
  knownPresets,
  readConfigFile,
  serializeConfig
} from '../src/config-file';

describe('buildLayoutSpec', () => {
  it('maps a preset shape to a preset id', () => {
    expect(buildLayoutSpec({ shape: 'preset', preset: 'ring-6', mode: 'auto' })).toEqual({ preset: 'ring-6' });
  });

  it('maps grid/ring/filledRing to generator kinds', () => {
    expect(buildLayoutSpec({ shape: 'grid', cols: 7, rows: 2, mode: 'auto' })).toMatchObject({
      kind: 'grid',
      cols: 7,
      rows: 2
    });
    expect(buildLayoutSpec({ shape: 'ring', count: 6, mode: 'auto' })).toMatchObject({ kind: 'ring', count: 6 });
    expect(buildLayoutSpec({ shape: 'filledRing', count: 25, mode: 'auto' })).toMatchObject({
      kind: 'filledRing',
      count: 25
    });
  });

  it('throws when required params are missing', () => {
    expect(() => buildLayoutSpec({ shape: 'grid', mode: 'auto' })).toThrow();
    expect(() => buildLayoutSpec({ shape: 'ring', mode: 'auto' })).toThrow();
    expect(() => buildLayoutSpec({ shape: 'preset', mode: 'auto' })).toThrow();
  });
});

describe('buildConfig', () => {
  it('fills defaults and validates the spec', () => {
    const config = buildConfig({ shape: 'ring', count: 6, mode: 'auto' });
    expect(config).toEqual({
      layout: { kind: 'ring', count: 6, id: undefined, name: undefined },
      mode: 'auto',
      simpleModeMax: 40,
      server: { host: '0.0.0.0', port: 3000 },
      ui: { port: 3003 }
    });
  });

  it('honors overrides', () => {
    const config = buildConfig({
      shape: 'preset',
      preset: 'grid-7x2',
      mode: 'simple',
      simpleModeMax: 30,
      serverPort: 4000,
      serverHost: '127.0.0.1',
      uiPort: 4003
    });
    expect(config.mode).toBe('simple');
    expect(config.simpleModeMax).toBe(30);
    expect(config.server).toEqual({ host: '127.0.0.1', port: 4000 });
    expect(config.ui).toEqual({ port: 4003 });
  });

  it('throws on an unknown preset before writing anything', () => {
    expect(() => buildConfig({ shape: 'preset', preset: 'nope', mode: 'auto' })).toThrow(/Unknown layout preset/);
  });
});

describe('serialization', () => {
  it('round-trips a written config file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wg-cfg-'));
    const config = buildConfig({ shape: 'preset', preset: 'ring-6', mode: 'auto' });
    const path = join(dir, CONFIG_FILENAME);
    writeFileSync(path, serializeConfig(config));
    expect(readConfigFile(path)).toEqual(config);
  });
});

describe('discovery', () => {
  it('walks up to the workspace root and config file', () => {
    const root = mkdtempSync(join(tmpdir(), 'wg-root-'));
    writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
    writeFileSync(join(root, CONFIG_FILENAME), serializeConfig(buildConfig({ shape: 'preset', preset: 'ring-6', mode: 'auto' })));
    const nested = join(root, 'packages', 'x');
    mkdirSync(nested, { recursive: true });

    expect(findRepoRoot(nested)).toBe(root);
    expect(findConfigFile(nested)).toBe(join(root, CONFIG_FILENAME));
  });

  it('returns null when nothing is found', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wg-empty-'));
    expect(findConfigFile(dir)).toBeNull();
  });
});

describe('knownPresets', () => {
  it('exposes the built-in presets', () => {
    const presets = knownPresets();
    expect(presets).toEqual(expect.arrayContaining(['grid-7x7', 'grid-7x2', 'ring-6', 'ring-25-filled']));
  });
});
