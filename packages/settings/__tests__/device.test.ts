import fs from 'fs';
import os from 'os';
import path from 'path';

import { openStore } from '../src';

function tmpBase(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wg-device-'));
}

describe('device identity', () => {
  it('generates and persists a stable id + hostname-derived name on first read', () => {
    const baseDir = tmpBase();
    const store = openStore({ baseDir });
    const first = store.getDevice();
    expect(first.id).toMatch(/[0-9a-f-]{36}/);
    expect(first.name.length).toBeGreaterThan(0);
    expect(fs.existsSync(store.paths.deviceFile)).toBe(true);

    // A second read returns the same identity (persisted, not regenerated).
    const second = openStore({ baseDir }).getDevice();
    expect(second.id).toBe(first.id);
    expect(second.name).toBe(first.name);
  });

  it('defaults the name to the machine hostname', () => {
    const store = openStore({ baseDir: tmpBase() });
    expect(store.getDevice().name).toBe(os.hostname().slice(0, 64));
  });

  it('renames the device and persists it, keeping the id stable', () => {
    const baseDir = tmpBase();
    const store = openStore({ baseDir });
    const id = store.getDevice().id;
    const renamed = store.setDeviceName('stage-left');
    expect(renamed.name).toBe('stage-left');
    expect(renamed.id).toBe(id);
    expect(openStore({ baseDir }).getDevice().name).toBe('stage-left');
  });

  it('rejects an empty name', () => {
    const store = openStore({ baseDir: tmpBase() });
    expect(() => store.setDeviceName('   ')).toThrow(/empty/i);
  });

  it('writes the device file with owner-only permissions', () => {
    const store = openStore({ baseDir: tmpBase() });
    store.getDevice();
    const mode = fs.statSync(store.paths.deviceFile).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});
