import type { Fixture, Layout } from '@wavegrid/layout';

/**
 * Minimal grid cell interface used by animations and scenes.
 * Both server's CannonTarget and receiver's FilteredCannon satisfy this.
 */
export interface GridCell {
  h: number;
  s: number;
  b: number;
  targetH: number;
  targetS: number;
  targetB: number;
}

/**
 * An animation mutates cell targets for one tick. It reads geometry from the
 * layout (per-fixture `u/v/angle/radius/row/col`), never from a column count.
 */
export type AnimationFn = (grid: GridCell[], tick: number, attack: number, layout: Layout) => void;

/** A scene assigns a color to a single fixture. */
export type SceneGenerator = (fixture: Fixture, layout: Layout) => { h: number; s: number; b: number };
