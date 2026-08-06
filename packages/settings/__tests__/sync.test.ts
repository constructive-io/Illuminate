import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { resolvePaths } from '../src/paths';
import {
  applyUpdate,
  deviceScope,
  divergentDevices,
  isValidScope,
  mergeRemote,
  projectScope,
  readSyncState,
  recordAck,
  type SyncState
} from '../src/sync';

function paths() {
  return resolvePaths(mkdtempSync(join(tmpdir(), 'wg-sync-')));
}

describe('config sync (settings layer)', () => {
  it('starts empty at revision 0', () => {
    const p = paths();
    const s = readSyncState(p, 'demo');
    expect(s).toEqual({ version: 1, revision: 0, entries: {}, acks: {} });
  });

  it('assigns strictly increasing revisions per accepted write', () => {
    const p = paths();
    const a = applyUpdate(p, 'demo', { scope: projectScope(), config: { port: 3333 }, deviceId: 'A' });
    const b = applyUpdate(p, 'demo', { scope: deviceScope('B'), config: { shard: [0, 5] }, deviceId: 'B' });
    expect(a.revision).toBe(1);
    expect(b.revision).toBe(2);
    const s = readSyncState(p, 'demo');
    expect(s.revision).toBe(2);
    expect(s.entries[projectScope()].config).toEqual({ port: 3333 });
    expect(s.entries[deviceScope('B')].config).toEqual({ shard: [0, 5] });
  });

  it('validates scopes: project / device:<id> / secrets, rejects junk', () => {
    expect(isValidScope('project')).toBe(true);
    expect(isValidScope('device:abc123')).toBe(true);
    expect(isValidScope('secrets')).toBe(true);
    expect(isValidScope('secret:beyond')).toBe(true);
    expect(isValidScope('secrets:beyond')).toBe(true);
    // junk
    expect(isValidScope('')).toBe(false);
    expect(isValidScope('device:')).toBe(false);
    expect(isValidScope('haxor')).toBe(false);
    expect(isValidScope('__proto__')).toBe(false);
    expect(isValidScope(42)).toBe(false);
    expect(isValidScope(null)).toBe(false);
  });

  it('rejects a write with an invalid scope', () => {
    const p = paths();
    expect(() =>
      applyUpdate(p, 'demo', { scope: 'garbage', config: { x: 1 }, deviceId: 'A' })
    ).toThrow(/Invalid sync scope/);
    // nothing was persisted
    expect(readSyncState(p, 'demo').revision).toBe(0);
  });

  it('mergeRemote drops entries with invalid scopes', () => {
    const p = paths();
    const remote: SyncState = {
      version: 1,
      revision: 3,
      entries: {
        [projectScope()]: { scope: projectScope(), config: { ok: true }, revision: 1, updatedAt: '2026-06-01T00:00:00Z', deviceId: 'B' },
        haxor: { scope: 'haxor', config: { evil: true }, revision: 3, updatedAt: '2026-06-01T00:00:00Z', deviceId: 'B' }
      },
      acks: {}
    };
    const { state, changed } = mergeRemote(p, 'demo', remote);
    expect(changed).toBe(true);
    expect(state.entries[projectScope()].config).toEqual({ ok: true });
    expect(state.entries.haxor).toBeUndefined();
  });

  it('records the author as having acked its own write', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: {}, deviceId: 'A' });
    expect(readSyncState(p, 'demo').acks.A).toBe(1);
  });

  it('flags a stale base revision but still accepts (last-writer-wins)', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 1 }, deviceId: 'A' }); // rev 1
    // B edited from base 0 while A's rev-1 already landed.
    const res = applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 2 }, deviceId: 'B', baseRevision: 0 });
    expect(res.staleBase).toBe(true);
    expect(res.accepted).toBe(true);
    expect(res.revision).toBe(2);
    expect(readSyncState(p, 'demo').entries[projectScope()].config).toEqual({ v: 2 });
  });

  it('does not flag when the base revision is current', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 1 }, deviceId: 'A' }); // rev 1
    const res = applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 2 }, deviceId: 'A', baseRevision: 1 });
    expect(res.staleBase).toBe(false);
  });

  it('recordAck never moves an ack backwards', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: {}, deviceId: 'A' }); // rev 1
    applyUpdate(p, 'demo', { scope: deviceScope('B'), config: {}, deviceId: 'A' }); // rev 2
    recordAck(p, 'demo', 'B', 2);
    recordAck(p, 'demo', 'B', 1); // stale ack ignored
    expect(readSyncState(p, 'demo').acks.B).toBe(2);
  });

  it('reports devices that have not acked the current revision', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: {}, deviceId: 'A' }); // rev 1, A acked
    applyUpdate(p, 'demo', { scope: deviceScope('C'), config: {}, deviceId: 'A' }); // rev 2, A acked
    recordAck(p, 'demo', 'B', 1); // B lags
    const div = divergentDevices(p, 'demo', ['A', 'B', 'C']);
    const ids = div.map((d) => d.deviceId).sort();
    expect(ids).toEqual(['B', 'C']); // A is current (rev 2); B behind by 1; C never acked
    const b = div.find((d) => d.deviceId === 'B')!;
    expect(b.behindBy).toBe(1);
    const c = div.find((d) => d.deviceId === 'C')!;
    expect(c.ackedRevision).toBe(0);
    expect(c.behindBy).toBe(2);
  });

  it('mergeRemote is deterministic: higher revision wins per scope', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 'local' }, deviceId: 'A' }); // rev 1
    const remote: SyncState = {
      version: 1,
      revision: 5,
      entries: {
        [projectScope()]: { scope: projectScope(), config: { v: 'remote' }, revision: 5, updatedAt: '2026-01-01T00:00:00Z', deviceId: 'B' }
      },
      acks: {}
    };
    const { changed } = mergeRemote(p, 'demo', remote);
    expect(changed).toBe(true);
    const s = readSyncState(p, 'demo');
    expect(s.entries[projectScope()].config).toEqual({ v: 'remote' });
    expect(s.revision).toBe(5);
  });

  it('mergeRemote keeps the local entry when it already wins', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 'local' }, deviceId: 'A' }); // rev 1
    applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 'local2' }, deviceId: 'A' }); // rev 2
    const remote: SyncState = {
      version: 1,
      revision: 1,
      entries: {
        [projectScope()]: { scope: projectScope(), config: { v: 'stale' }, revision: 1, updatedAt: '2020-01-01T00:00:00Z', deviceId: 'B' }
      },
      acks: {}
    };
    const { changed } = mergeRemote(p, 'demo', remote);
    expect(changed).toBe(false);
    expect(readSyncState(p, 'demo').entries[projectScope()].config).toEqual({ v: 'local2' });
  });

  it('mergeRemote breaks equal-revision ties by timestamp then deviceId', () => {
    const p = paths();
    // local rev 1, older timestamp
    applyUpdate(p, 'demo', {
      scope: projectScope(),
      config: { v: 'local' },
      deviceId: 'A',
      timestamp: '2026-01-01T00:00:00Z'
    });
    const remote: SyncState = {
      version: 1,
      revision: 1,
      entries: {
        [projectScope()]: { scope: projectScope(), config: { v: 'remote' }, revision: 1, updatedAt: '2026-06-01T00:00:00Z', deviceId: 'B' }
      },
      acks: {}
    };
    const { changed } = mergeRemote(p, 'demo', remote);
    expect(changed).toBe(true); // newer timestamp wins at equal revision
    expect(readSyncState(p, 'demo').entries[projectScope()].config).toEqual({ v: 'remote' });
  });

  it('persists across reopen (survives restart)', () => {
    const p = paths();
    applyUpdate(p, 'demo', { scope: projectScope(), config: { v: 1 }, deviceId: 'A' });
    const reread = readSyncState(p, 'demo');
    expect(reread.revision).toBe(1);
    expect(reread.entries[projectScope()].config).toEqual({ v: 1 });
  });
});
