import type { DiscoveredBrain } from '@wavegrid/discovery';

import { brainLabel, brainToWsUrl } from '../src/commands/receiver';

function brain(partial: Partial<DiscoveredBrain>): DiscoveredBrain {
  return {
    name: 'Wavegrid demo',
    project: 'demo',
    port: 3333,
    host: 'host.local',
    addresses: [],
    deviceId: null,
    deviceName: null,
    ...partial
  };
}

describe('brainToWsUrl', () => {
  it('prefers the first resolved IP address', () => {
    expect(brainToWsUrl(brain({ addresses: ['192.168.1.42'], port: 3333 }))).toBe('ws://192.168.1.42:3333');
  });

  it('falls back to the mDNS host when no address is present', () => {
    expect(brainToWsUrl(brain({ addresses: [], host: 'brain.local', port: 3000 }))).toBe('ws://brain.local:3000');
  });
});

describe('brainLabel', () => {
  it('includes project, endpoint, and device name', () => {
    const label = brainLabel(brain({ project: 'bigshow', addresses: ['10.0.0.5'], port: 3333, deviceName: 'front-of-house' }));
    expect(label).toBe('bigshow — 10.0.0.5:3333 (front-of-house)');
  });

  it('omits the device name when unknown', () => {
    expect(brainLabel(brain({ project: 'demo', addresses: ['10.0.0.9'], port: 3000 }))).toBe('demo — 10.0.0.9:3000');
  });
});
