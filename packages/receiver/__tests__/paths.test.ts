import { resolve } from 'path';

import { resolveLightMapFile, resolveRoutingConfigFile } from '../src/main';

describe('resolveLightMapFile', () => {
  it('prefers an explicit LIGHT_MAP_CONFIG override', () => {
    expect(resolveLightMapFile({ LIGHT_MAP_CONFIG: '/etc/wg/map.json' }, '/anywhere')).toBe('/etc/wg/map.json');
  });

  it('defaults to WG_STATE_DIR/light-map.json (the project state dir)', () => {
    expect(resolveLightMapFile({ WG_STATE_DIR: '/home/u/.wavegrid/data/projects/demo/state' }, '/cwd')).toBe(
      '/home/u/.wavegrid/data/projects/demo/state/light-map.json'
    );
  });

  it('falls back to a local .state dir, never a repo-relative path', () => {
    const out = resolveLightMapFile({}, '/some/global/cwd');
    expect(out).toBe(resolve('/some/global/cwd', '.state', 'light-map.json'));
    expect(out).not.toContain('..');
    expect(out).not.toContain('deploy');
  });
});

describe('resolveRoutingConfigFile', () => {
  it('uses an absolute path as-is', () => {
    expect(resolveRoutingConfigFile('/opt/wg/routing.json', '/cwd')).toBe('/opt/wg/routing.json');
  });

  it('resolves a relative path against cwd, not a monorepo ../../', () => {
    const out = resolveRoutingConfigFile('routing.json', '/home/u/demo');
    expect(out).toBe(resolve('/home/u/demo', 'routing.json'));
    expect(out).not.toContain('..');
  });
});
