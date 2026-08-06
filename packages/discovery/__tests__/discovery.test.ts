import { buildTxt, parseService, SERVICE_TYPE } from '../src';

type ServiceLike = Parameters<typeof parseService>[0];

describe('buildTxt', () => {
  it('carries project + device identity as strings', () => {
    const txt = buildTxt({ port: 3333, project: 'bigshow', deviceId: 'abc', deviceName: 'stage-left' });
    expect(txt).toEqual({ project: 'bigshow', deviceId: 'abc', deviceName: 'stage-left', v: '1' });
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
  });
});
