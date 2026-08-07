import fs from 'fs';
import os from 'os';
import path from 'path';

import { openStore } from '../src';

function tmpBase(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wg-access-'));
}

function seed() {
  const store = openStore({ baseDir: tmpBase() });
  store.createProject('demo', { layout: { preset: 'grid-7x7' } });
  return store;
}

describe('user roles', () => {
  it('makes the first user an admin and later users operators by default', () => {
    const store = seed();
    store.addUser('demo', 'alice', 'pw123456');
    store.addUser('demo', 'bob', 'pw123456');

    expect(store.getUserRole('demo', 'alice')).toBe('admin');
    expect(store.getUserRole('demo', 'bob')).toBe('operator');
    expect(store.listUserInfos('demo')).toEqual([
      { username: 'alice', role: 'admin' },
      { username: 'bob', role: 'operator' }
    ]);
  });

  it('honours an explicit role', () => {
    const store = seed();
    store.addUser('demo', 'alice', 'pw123456', 'operator');
    store.addUser('demo', 'boss', 'pw123456', 'admin');
    expect(store.getUserRole('demo', 'alice')).toBe('operator');
    expect(store.getUserRole('demo', 'boss')).toBe('admin');
  });

  it('authenticate returns username + role, or null on bad creds', () => {
    const store = seed();
    store.addUser('demo', 'alice', 'pw123456');
    expect(store.authenticate('demo', 'alice', 'pw123456')).toEqual({ username: 'alice', role: 'admin' });
    expect(store.authenticate('demo', 'alice', 'wrong')).toBeNull();
    expect(store.authenticate('demo', 'ghost', 'pw123456')).toBeNull();
  });

  it('promotes/demotes but refuses to demote or remove the last admin', () => {
    const store = seed();
    store.addUser('demo', 'alice', 'pw123456'); // admin
    store.addUser('demo', 'bob', 'pw123456'); // operator

    expect(() => store.setUserRole('demo', 'alice', 'operator')).toThrow(/last remaining admin/);
    expect(() => store.removeUser('demo', 'alice')).toThrow(/last remaining admin/);

    store.setUserRole('demo', 'bob', 'admin');
    // now two admins — demoting alice is allowed
    store.setUserRole('demo', 'alice', 'operator');
    expect(store.getUserRole('demo', 'alice')).toBe('operator');
    expect(store.getUserRole('demo', 'bob')).toBe('admin');
  });

  it('treats a legacy user record (no role) as admin', () => {
    const store = seed();
    const file = path.join(store.paths.data, 'projects', 'demo', 'users.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify([{ username: 'legacy', salt: 'aa', hash: 'bb' }]));
    expect(store.getUserRole('demo', 'legacy')).toBe('admin');
    expect(store.listUserInfos('demo')).toEqual([{ username: 'legacy', role: 'admin' }]);
  });
});

describe('UI sessions', () => {
  it('creates, lists and revokes sessions', () => {
    const store = seed();
    const a = store.createSession('demo', { username: 'alice', role: 'admin', ip: '1.2.3.4', userAgent: 'ua' });
    const b = store.createSession('demo', { username: 'bob', role: 'operator', ip: '5.6.7.8' });

    const list = store.listSessions('demo');
    expect(list).toHaveLength(2);
    expect(store.getSession('demo', a.id)?.username).toBe('alice');
    expect(store.getSession('demo', b.id)?.ip).toBe('5.6.7.8');

    expect(store.revokeSession('demo', a.id)).toBe(true);
    expect(store.getSession('demo', a.id)).toBeNull();
    expect(store.listSessions('demo')).toHaveLength(1);
    expect(store.revokeSession('demo', 'nope')).toBe(false);
  });

  it('prunes expired sessions on read', () => {
    const store = seed();
    store.createSession('demo', { username: 'alice', role: 'admin', ttlMs: -1 });
    const live = store.createSession('demo', { username: 'bob', role: 'operator', ttlMs: 60_000 });
    expect(store.listSessions('demo').map((s) => s.id)).toEqual([live.id]);
    expect(store.getSession('demo', live.id)).not.toBeNull();
  });

  it('touch updates lastSeen; revokeUserSessions clears all of a user', () => {
    const store = seed();
    const a = store.createSession('demo', { username: 'alice', role: 'admin' });
    store.createSession('demo', { username: 'alice', role: 'admin' });
    store.createSession('demo', { username: 'bob', role: 'operator' });

    const touched = store.touchSession('demo', a.id);
    expect(touched).not.toBeNull();
    expect(touched!.lastSeen).toBeGreaterThanOrEqual(a.issuedAt);

    expect(store.revokeUserSessions('demo', 'alice')).toBe(2);
    expect(store.listSessions('demo').map((s) => s.username)).toEqual(['bob']);
  });
});
