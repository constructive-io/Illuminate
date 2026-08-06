import type { DiscoveredBrain } from '@wavegrid/discovery';
import type { ResolvedConfig } from '@wavegrid/layout';

import { pickProjectBrain } from '../src/commands/coordinate';
import { p2pEligible } from '../src/commands/receiver';

function resolved(runMode: 'simple' | 'distributed', syncEnabled = true): ResolvedConfig {
  return {
    runMode,
    config: { sync: { enabled: syncEnabled, secrets: false } }
  } as unknown as ResolvedConfig;
}

function brain(partial: Partial<DiscoveredBrain>): DiscoveredBrain {
  return {
    name: 'b', project: 'demo', port: 3333, host: 'h', addresses: [],
    deviceId: 'x', deviceName: null, transient: false, ...partial
  };
}

describe('p2pEligible', () => {
  it('is true for a distributed project that replicates config', () => {
    expect(p2pEligible(resolved('distributed'), {})).toBe(true);
  });

  it('is false for a simple one-laptop project (never elects)', () => {
    expect(p2pEligible(resolved('simple'), {})).toBe(false);
  });

  it('is false when config sync is turned off', () => {
    expect(p2pEligible(resolved('distributed', false), {})).toBe(false);
  });

  it('is false when the operator opts out with --no-p2p', () => {
    expect(p2pEligible(resolved('distributed'), { 'no-p2p': true })).toBe(false);
  });
});

describe('pickProjectBrain', () => {
  it('only considers brains for this project, excluding self', () => {
    const chosen = pickProjectBrain(
      [
        brain({ project: 'other', deviceId: 'a' }),
        brain({ project: 'demo', deviceId: 'self' }),
        brain({ project: 'demo', deviceId: 'z' })
      ],
      'demo',
      'self'
    );
    expect(chosen!.deviceId).toBe('z');
  });

  it('returns null when only this device advertises', () => {
    expect(pickProjectBrain([brain({ project: 'demo', deviceId: 'self' })], 'demo', 'self')).toBeNull();
  });
});
