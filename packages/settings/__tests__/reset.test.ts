import fs from 'fs';
import os from 'os';
import path from 'path';

import { openStore, type SettingsStore } from '../src';

function tmpBase(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wg-reset-'));
}

/** A store with two fully-populated projects — every kind of state a reset must clear. */
function populated(): { store: SettingsStore; base: string } {
  const base = tmpBase();
  const store = openStore({ baseDir: base });
  store.getDevice(); // materializes this machine's identity, as any real run does

  for (const name of ['ring-6', 'warehouse']) {
    store.createProject(name, { layout: { preset: name === 'ring-6' ? 'ring-6' : 'grid-7x7' } });
    store.generateSecrets(name);
    store.addUser(name, 'ada', 'hunter2', 'admin');
    store.mintAccessKey(name, 'crew');
    store.createSession(name, { username: 'ada', role: 'admin', ip: '10.0.0.9' });
    store.registerDevice(name, { id: 'dev-1', name: 'pc-a' });
    store.saveLightMap(name, 'corrected', {
      numCannons: 6,
      gridColumns: 3,
      physicalLights: [1, 0, 2, 3, 4, 5]
    });
    fs.mkdirSync(store.logsDir(name), { recursive: true });
    fs.mkdirSync(store.stateDir(name), { recursive: true });
    fs.writeFileSync(path.join(store.logsDir(name), 'run.log'), 'painted\n');
    fs.writeFileSync(path.join(store.stateDir(name), 'light-map.json'), '{}');
  }
  return { store, base };
}

describe('store reset (clear all)', () => {
  it('removes every project, secret, user, key, session, device and map', () => {
    const { store } = populated();

    const summary = store.reset();

    expect(summary.projects).toEqual(['ring-6', 'warehouse']);
    expect(store.listProjects()).toEqual([]);
    expect(store.getActiveProject()).toBeNull();
    expect(store.hasProject('ring-6')).toBe(false);
    // Nothing survives to be read back for a re-created project of the same name.
    store.createProject('ring-6', { layout: { preset: 'ring-6' } });
    expect(store.listUsers('ring-6')).toEqual([]);
    expect(store.listAccessKeys('ring-6')).toEqual([]);
    expect(store.listSessions('ring-6')).toEqual([]);
    expect(store.listDevices('ring-6')).toEqual([]);
    expect(store.listLightMaps('ring-6')).toEqual([]);
    expect(store.hasSecret('ring-6', 'jwtSecret')).toBe(false);
  });

  it('reports the secrets and logs it removed', () => {
    const { store } = populated();

    const summary = store.reset();

    expect(summary.secrets).toBe(2);
    expect(summary.logs).toBe(2);
    expect(summary.device).toBe(true);
  });

  it('leaves the store scaffold usable without re-initializing', () => {
    const { store, base } = populated();

    store.reset();

    for (const dir of [store.paths.config, store.paths.data, store.paths.logs]) {
      expect(fs.existsSync(dir)).toBe(true);
      expect(fs.readdirSync(dir)).toEqual(expect.not.arrayContaining(['projects.json']));
    }
    // A fresh project works immediately on the wiped store.
    const reopened = openStore({ baseDir: base });
    reopened.createProject('fresh', { layout: { preset: 'ring-6' } });
    expect(reopened.listProjects()).toEqual(['fresh']);
    expect(reopened.getActiveProject()).toBe('fresh');
  });

  it('keeps this machine\'s identity when asked', () => {
    const { store } = populated();
    const before = store.getDevice();

    const summary = store.reset({ keepDevice: true });

    expect(summary.device).toBe(false);
    expect(store.getDevice().id).toBe(before.id);
  });

  it('forgets this machine\'s identity by default, so it rejoins as a new device', () => {
    const { store } = populated();
    const before = store.getDevice();

    store.reset();

    expect(store.getDevice().id).not.toBe(before.id);
  });

  it('is a harmless no-op on an empty store', () => {
    const store = openStore({ baseDir: tmpBase() });

    const summary = store.reset();

    expect(summary).toMatchObject({ projects: [], secrets: 0, logs: 0 });
    expect(store.listProjects()).toEqual([]);
  });

  it('touches nothing outside the store root', () => {
    const { store, base } = populated();
    const outside = path.join(path.dirname(base), `wg-bystander-${path.basename(base)}.json`);
    fs.writeFileSync(outside, 'keep me');

    store.reset();

    expect(fs.readFileSync(outside, 'utf8')).toBe('keep me');
    fs.rmSync(outside);
  });

  it('clears leftovers a partial delete left behind', () => {
    const { store } = populated();
    // A project dir with no registry entry, and a stale secrets file.
    const orphanDir = path.join(store.paths.data, 'projects', 'orphan');
    fs.mkdirSync(orphanDir, { recursive: true });
    fs.writeFileSync(path.join(store.paths.config, 'secrets', 'gone.json'), '{}');

    store.reset();

    expect(fs.readdirSync(path.join(store.paths.data, 'projects'))).toEqual([]);
    expect(fs.readdirSync(path.join(store.paths.config, 'secrets'))).toEqual([]);
  });
});
