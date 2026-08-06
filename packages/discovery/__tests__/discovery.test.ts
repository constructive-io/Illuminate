import {
  buildTxt,
  type DiscoveredBrain,
  electCoordinator,
  ELECTION_TYPE,
  parseService,
  preferBrain,
  SERVICE_TYPE
} from '../src';

type ServiceLike = Parameters<typeof parseService>[0];

describe('buildTxt', () => {
  it('carries project + device identity as strings', () => {
    const txt = buildTxt({ port: 3333, project: 'bigshow', deviceId: 'abc', deviceName: 'stage-left' });
    expect(txt).toEqual({ project: 'bigshow', deviceId: 'abc', deviceName: 'stage-left', transient: '0', v: '1' });
  });

  it('marks a transient (self-promoted) brain', () => {
    const txt = buildTxt({ port: 3333, project: 'p', deviceId: 'abc', deviceName: 'd', transient: true });
    expect(txt.transient).toBe('1');
  });
});

function svc(partial: Record<string, unknown>): ServiceLike {
  return partial as unknown as ServiceLike;
}

describe('parseService', () => {
  it('parses a well-formed wavegrid service', () => {
    const brain = parseService(svc({
      name: 'Wavegrid bigshow',
      port: 3333,
      host: 'host.local',
      addresses: ['192.168.1.42', 'fe80::1'],
      txt: { project: 'bigshow', deviceId: 'id-1', deviceName: 'brain' }
    }));
    expect(brain).not.toBeNull();
    expect(brain!.project).toBe('bigshow');
    expect(brain!.port).toBe(3333);
    expect(brain!.addresses).toEqual(['192.168.1.42']);
    expect(brain!.deviceId).toBe('id-1');
    expect(brain!.deviceName).toBe('brain');
    expect(brain!.transient).toBe(false);
  });

  it('reads the transient flag from TXT', () => {
    const brain = parseService(svc({
      name: '', port: 3333, addresses: ['10.0.0.9'],
      txt: { project: 'p', deviceId: 'id', deviceName: 'n', transient: '1' }
    }));
    expect(brain!.transient).toBe(true);
  });

  it('ignores a service with no project TXT (not ours)', () => {
    expect(parseService(svc({ name: 'printer', port: 9100, txt: {} }))).toBeNull();
  });

  it('falls back to a derived name and null device fields', () => {
    const brain = parseService(svc({ name: '', port: 3000, addresses: ['10.0.0.5'], txt: { project: 'demo' } }));
    expect(brain!.name).toBe('Wavegrid demo');
    expect(brain!.host).toBe('10.0.0.5');
    expect(brain!.deviceId).toBeNull();
    expect(brain!.deviceName).toBeNull();
  });
});

describe('SERVICE_TYPE', () => {
  it('is the wavegrid mDNS type', () => {
    expect(SERVICE_TYPE).toBe('wavegrid');
    expect(ELECTION_TYPE).toBe('wavegrid-elect');
  });
});

describe('electCoordinator', () => {
  it('picks the lexicographically smallest deviceId (deterministic winner)', () => {
    expect(electCoordinator(['c', 'a', 'b'])).toBe('a');
    expect(electCoordinator(['zzz', 'aaa'])).toBe('aaa');
  });

  it('every peer computes the same winner from the same set', () => {
    const ids = ['dev-9', 'dev-3', 'dev-7'];
    const shuffled = ['dev-7', 'dev-9', 'dev-3'];
    expect(electCoordinator(ids)).toBe(electCoordinator(shuffled));
  });

  it('ignores empty ids and returns null for an empty set', () => {
    expect(electCoordinator(['', 'x', ''])).toBe('x');
    expect(electCoordinator([])).toBeNull();
  });
});

describe('preferBrain', () => {
  const brain = (partial: Partial<DiscoveredBrain>): DiscoveredBrain => ({
    name: 'b', project: 'demo', port: 3333, host: 'h', addresses: [],
    deviceId: 'x', deviceName: null, transient: false, ...partial
  });

  it('excludes this device\'s own advertisement', () => {
    expect(preferBrain([brain({ deviceId: 'self' })], 'self')).toBeNull();
  });

  it('prefers a dedicated brain over a transient coordinator', () => {
    const chosen = preferBrain(
      [brain({ deviceId: 'a', transient: true }), brain({ deviceId: 'z', transient: false })],
      'self'
    );
    expect(chosen!.deviceId).toBe('z');
  });

  it('among equals, the lowest deviceId wins', () => {
    const chosen = preferBrain(
      [brain({ deviceId: 'm', transient: true }), brain({ deviceId: 'b', transient: true })],
      'self'
    );
    expect(chosen!.deviceId).toBe('b');
  });
});
