import { DEFAULT_CONFIG, loadWavegridConfig, resolveMode } from '../src/config';
import { resolveLayout } from '../src/presets';

describe('resolveLayout', () => {
  it('resolves built-in presets', () => {
    expect(resolveLayout({ preset: 'grid-7x7' }).count).toBe(49);
    expect(resolveLayout({ preset: 'grid-7x2' }).count).toBe(14);
    expect(resolveLayout({ preset: 'ring-6' }).count).toBe(6);
    const nova = resolveLayout({ preset: 'nova' });
    expect(nova.count).toBe(6);
    expect(nova.topology).toBe('ring');
    expect(resolveLayout({ preset: 'ring-25-filled' }).count).toBe(25);
  });

  it('resolves generator specs', () => {
    expect(resolveLayout({ kind: 'grid', cols: 10, rows: 10 }).count).toBe(100);
    expect(resolveLayout({ kind: 'ring', count: 12 }).count).toBe(12);
  });

  it('throws on unknown preset', () => {
    expect(() => resolveLayout({ preset: 'nope' })).toThrow(/Unknown layout preset/);
  });

  it('throws when neither preset nor kind is set', () => {
    expect(() => resolveLayout({})).toThrow();
  });
});

describe('resolveMode', () => {
  it('auto → simple below the threshold', () => {
    const layout = resolveLayout({ preset: 'ring-6' });
    expect(resolveMode({ ...DEFAULT_CONFIG, mode: 'auto', simpleModeMax: 40 }, layout)).toBe('simple');
  });

  it('auto → distributed at/above the threshold', () => {
    const layout = resolveLayout({ preset: 'grid-7x7' }); // 49
    expect(resolveMode({ ...DEFAULT_CONFIG, mode: 'auto', simpleModeMax: 40 }, layout)).toBe('distributed');
  });

  it('respects an explicit mode', () => {
    const layout = resolveLayout({ preset: 'grid-7x7' });
    expect(resolveMode({ ...DEFAULT_CONFIG, mode: 'simple' }, layout)).toBe('simple');
  });
});

describe('loadWavegridConfig', () => {
  it('defaults to grid-7x7 / distributed with an empty env and no config file', () => {
    const resolved = loadWavegridConfig({ cwd: '/', env: {} });
    expect(resolved.layout.count).toBe(49);
    expect(resolved.runMode).toBe('distributed');
  });

  it('applies the env layer (WAVEGRID_LAYOUT)', () => {
    const resolved = loadWavegridConfig({ cwd: '/', env: { WAVEGRID_LAYOUT: 'ring-6' } });
    expect(resolved.layout.id).toBe('ring-6');
    expect(resolved.runMode).toBe('simple');
  });

  it('honors explicit overrides above env', () => {
    const resolved = loadWavegridConfig({
      cwd: '/',
      env: { WAVEGRID_LAYOUT: 'ring-6' },
      overrides: { layout: { preset: 'grid-7x2' } }
    });
    expect(resolved.layout.id).toBe('grid-7x2');
  });
});
