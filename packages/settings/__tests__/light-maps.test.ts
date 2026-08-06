import fs from 'fs';
import os from 'os';
import path from 'path';

import { openStore } from '../src';

function tmpBase(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wg-lightmaps-'));
}

function seed() {
  const baseDir = tmpBase();
  const store = openStore({ baseDir });
  store.createProject('demo', { layout: { preset: 'ring-6' } } as never);
  return { baseDir, store };
}

const dims = { numCannons: 6, gridColumns: 0 };

describe('light-map library', () => {
  it('starts empty with no active map (identity)', () => {
    const { store } = seed();
    expect(store.listLightMaps('demo')).toEqual([]);
    expect(store.getActiveLightMap('demo')).toBeNull();
  });

  it('saves a named map with a normalized permutation and updatedAt', () => {
    const { store } = seed();
    const saved = store.saveLightMap('demo', 'swap-01', { ...dims, physicalLights: [1, 0, 2, 3, 4, 5] });
    expect(saved.name).toBe('swap-01');
    expect(saved.physicalLights).toEqual([1, 0, 2, 3, 4, 5]);
    expect(saved.updatedAt).toMatch(/\d{4}-\d\d-\d\dT/);
    expect(store.listLightMaps('demo').map((m) => m.name)).toEqual(['swap-01']);
  });

  it('materializes the active map into the runtime light-map.json', () => {
    const { store } = seed();
    store.saveLightMap('demo', 'swap-01', { ...dims, physicalLights: [1, 0, 2, 3, 4, 5] });
    const runtimeFile = path.join(store.stateDir('demo'), 'light-map.json');

    // Not active yet → no runtime file.
    expect(fs.existsSync(runtimeFile)).toBe(false);

    store.setActiveLightMap('demo', 'swap-01');
    expect(store.getActiveLightMap('demo')).toBe('swap-01');
    expect(JSON.parse(fs.readFileSync(runtimeFile, 'utf8')).physicalLights).toEqual([1, 0, 2, 3, 4, 5]);
    expect(store.listLightMaps('demo').find((m) => m.name === 'swap-01')?.active).toBe(true);

    // Editing the active map re-materializes.
    store.saveLightMap('demo', 'swap-01', { ...dims, physicalLights: [0, 1, 2, 3, 5, 4] });
    expect(JSON.parse(fs.readFileSync(runtimeFile, 'utf8')).physicalLights).toEqual([0, 1, 2, 3, 5, 4]);
  });

  it('identity active (null) removes the runtime file', () => {
    const { store } = seed();
    store.saveLightMap('demo', 'swap-01', { ...dims, physicalLights: [1, 0, 2, 3, 4, 5] });
    store.setActiveLightMap('demo', 'swap-01');
    const runtimeFile = path.join(store.stateDir('demo'), 'light-map.json');
    expect(fs.existsSync(runtimeFile)).toBe(true);

    store.setActiveLightMap('demo', null);
    expect(store.getActiveLightMap('demo')).toBeNull();
    expect(fs.existsSync(runtimeFile)).toBe(false);
  });

  it('deleting the active map falls back to identity', () => {
    const { store } = seed();
    store.saveLightMap('demo', 'swap-01', { ...dims, physicalLights: [1, 0, 2, 3, 4, 5] });
    store.setActiveLightMap('demo', 'swap-01');
    const runtimeFile = path.join(store.stateDir('demo'), 'light-map.json');

    expect(store.deleteLightMap('demo', 'swap-01')).toBe(true);
    expect(store.getActiveLightMap('demo')).toBeNull();
    expect(fs.existsSync(runtimeFile)).toBe(false);
    expect(store.listLightMaps('demo')).toEqual([]);
  });

  it('rejects activating an unknown map and invalid names', () => {
    const { store } = seed();
    expect(() => store.setActiveLightMap('demo', 'nope')).toThrow(/Unknown light map/);
    expect(() => store.saveLightMap('demo', '../evil', { ...dims, physicalLights: [0, 1, 2, 3, 4, 5] })).toThrow(
      /Invalid light-map name/
    );
  });
});
