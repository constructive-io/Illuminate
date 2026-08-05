import { computeCoverage, formatRanges } from '../src/coverage';

describe('computeCoverage', () => {
  it('returns empty results for a zero-cannon layout', () => {
    expect(computeCoverage(0, [])).toEqual({ claimed: [], gaps: [], overlaps: [] });
  });

  it('reports the whole range as a gap when nothing is claimed', () => {
    const r = computeCoverage(6, []);
    expect(r.claimed).toEqual([]);
    expect(r.gaps).toEqual([{ start: 0, end: 5 }]);
    expect(r.overlaps).toEqual([]);
  });

  it('treats a null shard as claiming every cannon', () => {
    const r = computeCoverage(6, [null]);
    expect(r.claimed).toEqual([{ start: 0, end: 5 }]);
    expect(r.gaps).toEqual([]);
    expect(r.overlaps).toEqual([]);
  });

  it('reports full contiguous coverage from two disjoint shards', () => {
    const r = computeCoverage(50, [
      { start: 0, end: 24 },
      { start: 25, end: 49 }
    ]);
    expect(r.claimed).toEqual([{ start: 0, end: 49 }]);
    expect(r.gaps).toEqual([]);
    expect(r.overlaps).toEqual([]);
  });

  it('detects gaps when a middle range is unclaimed', () => {
    const r = computeCoverage(50, [
      { start: 0, end: 19 },
      { start: 30, end: 49 }
    ]);
    expect(r.gaps).toEqual([{ start: 20, end: 29 }]);
  });

  it('detects overlaps when two shards claim the same cannons', () => {
    const r = computeCoverage(50, [
      { start: 0, end: 30 },
      { start: 25, end: 49 }
    ]);
    expect(r.overlaps).toEqual([{ start: 25, end: 30 }]);
  });

  it('clamps out-of-range shards to the cannon count', () => {
    const r = computeCoverage(10, [{ start: -5, end: 100 }]);
    expect(r.claimed).toEqual([{ start: 0, end: 9 }]);
  });
});

describe('formatRanges', () => {
  it('renders none/singletons/ranges', () => {
    expect(formatRanges([])).toBe('none');
    expect(formatRanges([{ start: 3, end: 3 }])).toBe('3');
    expect(formatRanges([{ start: 0, end: 24 }, { start: 30, end: 30 }])).toBe('0–24, 30');
  });
});
