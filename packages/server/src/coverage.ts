/**
 * Shard-coverage math for distributed installations.
 *
 * Each connected receiver claims a contiguous range of cannon indices (its
 * shard), or the whole layout when it has no shard. Given the layout's cannon
 * count and every receiver's claimed range, we compute which cannons are
 * covered, which are unclaimed (gaps), and which are claimed by more than one
 * receiver (overlaps). `wavegrid doctor` renders this so an operator can see at
 * a glance whether the laptops fully and uniquely tile the installation.
 */

export interface ShardRange {
  /** Inclusive start index. */
  start: number;
  /** Inclusive end index. */
  end: number;
}

export interface CoverageResult {
  /** Merged, sorted ranges that at least one receiver claims. */
  claimed: ShardRange[];
  /** Cannon ranges no receiver claims. */
  gaps: ShardRange[];
  /** Cannon ranges claimed by two or more receivers. */
  overlaps: ShardRange[];
}

/**
 * Compute coverage for `count` cannons given each receiver's claimed range.
 * A `null` shard means the receiver drives every cannon (simple mode / no
 * shard). Ranges are clamped to `[0, count)`.
 */
export function computeCoverage(count: number, shards: Array<ShardRange | null>): CoverageResult {
  if (count <= 0) return { claimed: [], gaps: [], overlaps: [] };

  // How many receivers claim each cannon index.
  const claims = new Array<number>(count).fill(0);
  for (const shard of shards) {
    const start = shard ? Math.max(0, shard.start) : 0;
    const end = shard ? Math.min(count - 1, shard.end) : count - 1;
    for (let i = start; i <= end; i++) claims[i]++;
  }

  return {
    claimed: rangesWhere(claims, n => n >= 1),
    gaps: rangesWhere(claims, n => n === 0),
    overlaps: rangesWhere(claims, n => n >= 2)
  };
}

/** Collapse indices satisfying `pred` into contiguous inclusive ranges. */
function rangesWhere(claims: number[], pred: (n: number) => boolean): ShardRange[] {
  const ranges: ShardRange[] = [];
  let start = -1;
  for (let i = 0; i < claims.length; i++) {
    if (pred(claims[i])) {
      if (start === -1) start = i;
    } else if (start !== -1) {
      ranges.push({ start, end: i - 1 });
      start = -1;
    }
  }
  if (start !== -1) ranges.push({ start, end: claims.length - 1 });
  return ranges;
}

/** Human-readable `"0–24, 30–49"` (or `"none"`). */
export function formatRanges(ranges: ShardRange[]): string {
  if (ranges.length === 0) return 'none';
  return ranges.map(r => (r.start === r.end ? `${r.start}` : `${r.start}–${r.end}`)).join(', ');
}
