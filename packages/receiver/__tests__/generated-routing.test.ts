/**
 * The contract between the two halves of unified→per-device generation: a
 * generated config's `logical` indices must address the receiver's SHARD-LOCAL
 * output array, and it must be consumable as-is by the routed OSC output.
 */
import { generateDeviceRouting, type UnifiedRouting } from '@wavegrid/layout';
import { createRoutedOutput, type RoutingConfig } from '@wavegrid/osc';

import { Receiver } from '../src/receiver';

/** A 49-cannon show split across two BEYOND PCs, zones un-numbered. */
const SPEC: UnifiedRouting = {
  targets: {
    pc1: { type: 'beyond', host: '127.0.0.1', port: 9101 },
    pc2: { type: 'beyond', host: '127.0.0.1', port: 9102 }
  },
  cannons: Array.from({ length: 49 }, (_, i) => ({
    logical: i,
    target: i < 25 ? 'pc1' : 'pc2'
  }))
};

const DEVICES = [
  { name: 'pc-a', shard: { start: 0, end: 24 } },
  { name: 'pc-b', shard: { start: 25, end: 48 } }
];

describe('generated routing ↔ sharded receiver', () => {
  it('addresses exactly the fixtures the receiver emits, in order', () => {
    const { devices } = generateDeviceRouting(SPEC, DEVICES, 49);

    for (const [i, generated] of devices.entries()) {
      const shard = DEVICES[i].shard;
      const emitted = new Receiver({ shard }).getOutputState();

      expect(generated.cannons).toHaveLength(emitted.length);
      expect(generated.cannons.map((c) => c.logical)).toEqual(emitted.map((_, index) => index));
    }
  });

  it('is consumable by the routed OSC output, with only that device\'s target', () => {
    const { devices } = generateDeviceRouting(SPEC, DEVICES, 49);

    // Structural compatibility: a DeviceRouting IS a RoutingConfig.
    const config: RoutingConfig = devices[1];
    const routed = createRoutedOutput(config);

    expect(routed.targetNames).toEqual(['pc2']);
    routed.close();
  });

  it('drives the second laptop from its own zone 0, not global 25', () => {
    const { devices } = generateDeviceRouting(SPEC, DEVICES, 49);

    const b = devices[1];
    expect(b.cannons[0]).toMatchObject({ logical: 0, globalLogical: 25, projectorIndex: 0 });
    expect(b.cannons[b.cannons.length - 1]).toMatchObject({ logical: 23, globalLogical: 48 });
  });
});
