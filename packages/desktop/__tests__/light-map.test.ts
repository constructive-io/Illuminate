import { buildLightMapView, normalizeLightMap } from '@/main/light-map';

describe('normalizeLightMap', () => {
  const dims = { numCannons: 6, gridColumns: 0 };

  it('defaults a missing map to identity', () => {
    expect(normalizeLightMap(null, dims).physicalLights).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('keeps a valid permutation as-is', () => {
    const pl = [5, 4, 3, 2, 1, 0];
    expect(normalizeLightMap({ physicalLights: pl }, dims).physicalLights).toEqual(pl);
  });

  it('drops duplicates and back-fills from unused identity slots', () => {
    // logical 0 and 1 both claim physical 2 → the second is dropped and back-filled.
    const out = normalizeLightMap({ physicalLights: [2, 2, 0, 1] }, dims).physicalLights;
    expect(out).toHaveLength(6);
    expect(new Set(out).size).toBe(6); // still a permutation
    expect(out.every((n) => n >= 0 && n < 6)).toBe(true);
    expect(out[0]).toBe(2);
  });

  it('drops out-of-range and non-integer values', () => {
    const out = normalizeLightMap({ physicalLights: [99, -1, 1.5, 3] }, dims).physicalLights;
    expect(new Set(out).size).toBe(6);
    expect(out.every((n) => Number.isInteger(n) && n >= 0 && n < 6)).toBe(true);
    expect(out[3]).toBe(3);
  });

  it('truncates an over-long source to numCannons and stays a permutation', () => {
    const out = normalizeLightMap({ physicalLights: [0, 1, 2, 3, 4, 5, 6, 7] }, dims).physicalLights;
    expect(out).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('buildLightMapView', () => {
  it('resolves one row per fixture with the mapping chain', () => {
    const view = buildLightMapView({
      project: 'demo',
      config: { layout: { preset: 'ring-6' } },
      devices: [{ name: 'laptop-a', shard: { start: 0, end: 2 } }],
      stored: { physicalLights: [1, 0, 2, 3, 4, 5] }
    });

    expect(view.numCannons).toBe(6);
    expect(view.rows).toHaveLength(6);
    expect(view.physicalLights[0]).toBe(1);
    // logical 0..2 are driven by the sharded device; 3..5 by nobody in particular.
    expect(view.rows[0].shardOwner).toBe('laptop-a');
    expect(view.rows[5].shardOwner).toBeNull();
    // no OSC target configured → console.
    expect(view.rows[0].oscTarget).toMatch(/console/);
  });

  it('describes a BEYOND OSC target and grid positions', () => {
    const view = buildLightMapView({
      project: 'grid',
      config: {
        layout: { preset: 'grid-7x7' },
        osc: { beyond: { host: '10.0.0.5', port: 5568, gridOrder: 'row' } }
      },
      devices: [],
      stored: null
    });

    expect(view.numCannons).toBe(49);
    expect(view.rows[0].oscTarget).toBe('BEYOND @ 10.0.0.5:5568');
    expect(view.rows[0].position).toMatch(/row \d+, col \d+/);
  });
});
