import fs from 'fs';
import os from 'os';
import path from 'path';

import { openStore } from '../src';

function tmpBase(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wg-guest-'));
}

function seed() {
  const store = openStore({ baseDir: tmpBase() });
  store.createProject('demo', { layout: { preset: 'grid-7x7' } });
  return store;
}

describe('shared guest access', () => {
  it('starts unconfigured and disabled', () => {
    const store = seed();
    expect(store.guestStatus('demo')).toEqual({
      configured: false,
      enabled: false,
      updatedAt: null
    });
  });

  it('cannot be enabled before a passphrase is minted', () => {
    const store = seed();
    expect(() => store.setGuestEnabled('demo', true)).toThrow(/mint a guest passphrase/i);
  });

  it('minting returns a cleartext passphrase once and enables access', () => {
    const store = seed();
    const passphrase = store.rotateGuestPassphrase('demo');
    expect(passphrase).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);

    const status = store.guestStatus('demo');
    expect(status.configured).toBe(true);
    expect(status.enabled).toBe(true);
    expect(typeof status.updatedAt).toBe('number');
  });

  it('never persists the passphrase in cleartext', () => {
    const store = seed();
    const passphrase = store.rotateGuestPassphrase('demo');
    const file = path.join(store.paths.data, 'projects', 'demo', 'guest.json');
    const raw = fs.readFileSync(file, 'utf8');
    expect(raw).not.toContain(passphrase);
    const parsed = JSON.parse(raw);
    expect(parsed.hash).toBeTruthy();
    expect(parsed.salt).toBeTruthy();
  });

  it('authenticates a matching passphrase as an operator (never admin)', () => {
    const store = seed();
    const passphrase = store.rotateGuestPassphrase('demo');
    const who = store.authenticateGuest('demo', passphrase);
    expect(who).toEqual({ username: 'guest', role: 'operator' });
  });

  it('rejects the wrong passphrase and any passphrase while disabled', () => {
    const store = seed();
    const passphrase = store.rotateGuestPassphrase('demo');
    expect(store.authenticateGuest('demo', 'nope-nope-nope')).toBeNull();

    store.setGuestEnabled('demo', false);
    expect(store.guestStatus('demo').enabled).toBe(false);
    expect(store.authenticateGuest('demo', passphrase)).toBeNull();
  });

  it('rotating invalidates the previous passphrase', () => {
    const store = seed();
    const first = store.rotateGuestPassphrase('demo');
    const second = store.rotateGuestPassphrase('demo');
    expect(second).not.toBe(first);
    expect(store.authenticateGuest('demo', first)).toBeNull();
    expect(store.authenticateGuest('demo', second)).toEqual({
      username: 'guest',
      role: 'operator'
    });
  });

  it('re-enabling keeps the same passphrase working', () => {
    const store = seed();
    const passphrase = store.rotateGuestPassphrase('demo');
    store.setGuestEnabled('demo', false);
    store.setGuestEnabled('demo', true);
    expect(store.authenticateGuest('demo', passphrase)).toEqual({
      username: 'guest',
      role: 'operator'
    });
  });

  it('clearing removes guest access entirely', () => {
    const store = seed();
    const passphrase = store.rotateGuestPassphrase('demo');
    store.clearGuest('demo');
    expect(store.guestStatus('demo')).toEqual({
      configured: false,
      enabled: false,
      updatedAt: null
    });
    expect(store.authenticateGuest('demo', passphrase)).toBeNull();
  });

  it('reserves the "guest" username for shared access', () => {
    const store = seed();
    expect(() => store.addUser('demo', 'guest', 'pw123456')).toThrow(/reserved/i);
  });
});
