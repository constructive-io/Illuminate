import fs from 'fs';
import os from 'os';
import path from 'path';

import { openStore } from '../src';

function tmpBase(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wg-registry-'));
}

describe('project device registry', () => {
  it('registers a new device, defaulting the name and stamping runtime facts', () => {
    const store = openStore({ baseDir: tmpBase() });
    const rec = store.registerDevice('demo', {
      id: 'dev-1',
      name: 'stage-left',
      hostname: 'laptop-a',
      address: '192.168.1.10',
      layout: 'nova',
      mode: 'distributed',
      shard: { start: 0, end: 2 }
    });
    expect(rec.name).toBe('stage-left');
    expect(rec.address).toBe('192.168.1.10');
    expect(rec.shard).toEqual({ start: 0, end: 2 });
    expect(rec.lastSeen).toBeGreaterThan(0);
    expect(store.listDevices('demo')).toHaveLength(1);
  });

  it('defaults the name to the hostname, then a short id', () => {
    const store = openStore({ baseDir: tmpBase() });
    expect(store.registerDevice('demo', { id: 'abc', hostname: 'laptop-b' }).name).toBe('laptop-b');
    expect(store.registerDevice('demo', { id: 'deadbeef-1234' }).name).toBe('device-deadbeef');
  });

  it('re-registration refreshes runtime facts but keeps the operator-assigned name', () => {
    const store = openStore({ baseDir: tmpBase() });
    store.registerDevice('demo', { id: 'dev-1', hostname: 'laptop-a', address: '10.0.0.1' });
    store.renameDevice('demo', 'dev-1', 'front-of-house');
    const again = store.registerDevice('demo', { id: 'dev-1', hostname: 'laptop-a', address: '10.0.0.9' });
    expect(again.name).toBe('front-of-house'); // not clobbered
    expect(again.address).toBe('10.0.0.9'); // refreshed
    expect(store.listDevices('demo')).toHaveLength(1);
  });

  it('renames by id or by current name, and rejects empty', () => {
    const store = openStore({ baseDir: tmpBase() });
    store.registerDevice('demo', { id: 'dev-1', name: 'one' });
    expect(store.renameDevice('demo', 'one', 'uno')?.name).toBe('uno');
    expect(store.renameDevice('demo', 'dev-1', 'ichi')?.name).toBe('ichi');
    expect(store.renameDevice('demo', 'nope', 'x')).toBeNull();
    expect(() => store.renameDevice('demo', 'dev-1', '  ')).toThrow(/empty/i);
  });

  it('assigns and clears a device shard by id or name', () => {
    const store = openStore({ baseDir: tmpBase() });
    store.registerDevice('demo', { id: 'dev-1', name: 'one' });
    expect(store.assignShard('demo', 'one', { start: 0, end: 24 })?.shard).toEqual({ start: 0, end: 24 });
    expect(store.getDeviceRecord('demo', 'dev-1')?.shard).toEqual({ start: 0, end: 24 });
    // re-assign by id
    expect(store.assignShard('demo', 'dev-1', { start: 25, end: 49 })?.shard).toEqual({ start: 25, end: 49 });
    // clear
    expect(store.assignShard('demo', 'dev-1', null)?.shard).toBeNull();
    // missing device
    expect(store.assignShard('demo', 'ghost', { start: 0, end: 1 })).toBeNull();
  });

  it('removes by id or name', () => {
    const store = openStore({ baseDir: tmpBase() });
    store.registerDevice('demo', { id: 'dev-1', name: 'one' });
    store.registerDevice('demo', { id: 'dev-2', name: 'two' });
    expect(store.removeDevice('demo', 'one')).toBe(true);
    expect(store.removeDevice('demo', 'dev-2')).toBe(true);
    expect(store.removeDevice('demo', 'ghost')).toBe(false);
    expect(store.listDevices('demo')).toHaveLength(0);
  });

  it('keeps registries isolated per project', () => {
    const store = openStore({ baseDir: tmpBase() });
    store.registerDevice('alpha', { id: 'dev-1', name: 'a1' });
    store.registerDevice('beta', { id: 'dev-1', name: 'b1' });
    expect(store.listDevices('alpha').map(d => d.name)).toEqual(['a1']);
    expect(store.listDevices('beta').map(d => d.name)).toEqual(['b1']);
  });
});
