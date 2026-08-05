import { gridLayout } from '@wavegrid/layout';

import { handleCommand, tickCommandMode, applyPaint, createDefaultAnimationState, AnimationState, remapGridForOutput } from '../src/command-engine';
import { createFilteredGrid, FilteredCannon } from '../src/filter';
import { CommandMessage } from '../src/command-types';

const layout2x2 = gridLayout({ cols: 2, rows: 2 });
const layout7x7 = gridLayout({ cols: 7, rows: 7 });

function makeState(overrides: Partial<AnimationState> = {}): AnimationState {
  return { ...createDefaultAnimationState(), ...overrides };
}

function makeGrid(n = 4): FilteredCannon[] {
  return createFilteredGrid(n);
}

describe('handleCommand', () => {
  describe('paint clears animation and scene', () => {
    it('clears currentAnimation when paint arrives', () => {
      const state = makeState({ currentAnimation: 'rainbow' });
      handleCommand(state, { type: 'command', action: 'paint', cells: [{ idx: 0, h: 0, s: 100, b: 100 }] });
      expect(state.currentAnimation).toBeNull();
    });

    it('clears currentScene when paint arrives', () => {
      const state = makeState({ currentScene: 'warm' });
      handleCommand(state, { type: 'command', action: 'paint', cells: [{ idx: 0, h: 0, s: 100, b: 100 }] });
      expect(state.currentScene).toBeNull();
    });

    it('clears patternActive when paint arrives', () => {
      const state = makeState({ patternActive: true });
      handleCommand(state, { type: 'command', action: 'paint', cells: [{ idx: 0, h: 0, s: 100, b: 100 }] });
      expect(state.patternActive).toBe(false);
    });
  });

  describe('setAnimation conditional tick reset', () => {
    it('resets tick to 0 when animation name changes', () => {
      const state = makeState({ currentAnimation: 'rainbow', tick: 42 });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'pulse' });
      expect(state.tick).toBe(0);
      expect(state.currentAnimation).toBe('pulse');
    });

    it('does NOT reset tick when same animation name is re-sent (keepalive safe)', () => {
      const state = makeState({ currentAnimation: 'rainbow', tick: 42 });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'rainbow' });
      expect(state.tick).toBe(42);
      expect(state.currentAnimation).toBe('rainbow');
    });

    it('resets tick when changing from null to an animation', () => {
      const state = makeState({ currentAnimation: null, tick: 10 });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'rainbow' });
      expect(state.tick).toBe(0);
    });

    it('clears currentScene when setting an animation', () => {
      const state = makeState({ currentScene: 'warm' });
      handleCommand(state, { type: 'command', action: 'setAnimation', name: 'rainbow' });
      expect(state.currentScene).toBeNull();
    });
  });

  describe('keepalive is a no-op', () => {
    it('returns true without modifying state', () => {
      const state = makeState({ currentAnimation: 'rainbow', tick: 100, brightness: 80 });
      const before = { ...state };
      const result = handleCommand(state, { type: 'command', action: 'keepalive' });
      expect(result).toBe(true);
      expect(state.currentAnimation).toBe(before.currentAnimation);
      expect(state.tick).toBe(before.tick);
      expect(state.brightness).toBe(before.brightness);
    });
  });

  describe('clear resets scene and animation', () => {
    it('clears both animation and scene', () => {
      const state = makeState({ currentAnimation: 'rainbow', currentScene: 'warm' });
      handleCommand(state, { type: 'command', action: 'clear' });
      expect(state.currentAnimation).toBeNull();
      expect(state.currentScene).toBeNull();
      expect(state.patternActive).toBe(false);
    });
  });

  describe('setSmoothness is handled at receiver level', () => {
    it('returns true (handled by receiver, not state)', () => {
      const state = makeState();
      const result = handleCommand(state, { type: 'command', action: 'setSmoothness', value: 0.5 });
      expect(result).toBe(true);
    });
  });
});

describe('tickCommandMode', () => {
  describe('tick increment order', () => {
    it('evaluates animation THEN increments tick (not before)', () => {
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: 'rainbow', tick: 0, speed: 1 });

      // First tick: animation evaluated at tick=0, then tick becomes 1
      tickCommandMode(grid, state, layout2x2);
      expect(state.tick).toBe(1);

      // Second tick: animation evaluated at tick=1, then tick becomes 2
      tickCommandMode(grid, state, layout2x2);
      expect(state.tick).toBe(2);
    });

    it('increments tick by speed value', () => {
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: 'rainbow', tick: 0, speed: 2.0 });
      tickCommandMode(grid, state, layout2x2);
      expect(state.tick).toBe(2.0);
    });

    it('does not increment tick when no animation is active', () => {
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: null, tick: 5 });
      // tick still increments — the tick counter runs regardless
      tickCommandMode(grid, state, layout2x2);
      expect(state.tick).toBe(6);
    });

    it('evaluates rainbow at tick=0 on first call (not tick=1)', () => {
      // Rainbow hue = (tick * 1.5 + (row + col) * 25) % 360
      // At tick=0, cell 0 (row=0, col=0): hue = (0 * 1.5 + 0) % 360 = 0
      // At tick=1, cell 0 (row=0, col=0): hue = (1 * 1.5 + 0) % 360 = 1.5
      // If tick is incremented BEFORE eval (old bug), first eval sees tick=1 → hue=1.5
      // If tick is incremented AFTER eval (fix), first eval sees tick=0 → hue=0
      const grid = makeGrid(4);
      const state = makeState({ currentAnimation: 'rainbow', tick: 0, speed: 1, attack: 1.0 });
      tickCommandMode(grid, state, layout2x2);
      // Cell 0 should have hue=0 (evaluated at tick=0, not tick=1)
      expect(grid[0].targetH).toBe(0);
    });
  });

  describe('paint targets survive ticks without animation', () => {
    it('paint targets are not overwritten when animation is null', () => {
      const grid = makeGrid(4);
      // Paint cell 0 to red
      applyPaint(grid, [{ idx: 0, h: 0, s: 100, b: 100 }], 1.0);
      expect(grid[0].targetH).toBe(0);
      expect(grid[0].targetS).toBe(100);
      expect(grid[0].targetB).toBe(100);

      // Tick without any animation active
      const state = makeState({ currentAnimation: null, currentScene: null });
      tickCommandMode(grid, state, layout2x2);

      // Paint targets should survive
      expect(grid[0].targetH).toBe(0);
      expect(grid[0].targetS).toBe(100);
      expect(grid[0].targetB).toBe(100);
    });
  });

  describe('pattern skips animation evaluation', () => {
    it('does not evaluate animation when patternActive is true', () => {
      const grid = makeGrid(4);
      // Set a known target
      grid[0].targetH = 42;
      grid[0].targetS = 50;
      grid[0].targetB = 75;

      const state = makeState({
        currentAnimation: 'rainbow',
        patternActive: true
      });

      tickCommandMode(grid, state, layout2x2);

      // Targets should be unchanged (animation was skipped due to patternActive)
      expect(grid[0].targetH).toBe(42);
      expect(grid[0].targetS).toBe(50);
      // brightness cap at 100% doesn't change 75
      expect(grid[0].targetB).toBe(75);
    });
  });
});

describe('applyPaint', () => {
  it('sets target values on specified cells', () => {
    const grid = makeGrid(4);
    applyPaint(grid, [
      { idx: 0, h: 120, s: 80, b: 90 },
      { idx: 3, h: 240, s: 60, b: 70 }
    ], 1.0);

    expect(grid[0].targetH).toBe(120);
    expect(grid[0].targetS).toBe(80);
    expect(grid[0].targetB).toBe(90);
    expect(grid[3].targetH).toBe(240);
    expect(grid[3].targetS).toBe(60);
    expect(grid[3].targetB).toBe(70);
  });

  it('ignores out-of-range indices', () => {
    const grid = makeGrid(4);
    const before = grid.map(c => ({ ...c }));
    applyPaint(grid, [{ idx: 99, h: 0, s: 100, b: 100 }], 1.0);
    // Grid should be unchanged
    for (let i = 0; i < grid.length; i++) {
      expect(grid[i].targetH).toBe(before[i].targetH);
    }
  });
});

describe('heart-breathe animation', () => {
  it('sets heart-shaped pixels to red with breathing brightness', () => {
    const grid = makeGrid(49);
    const state = makeState({ currentAnimation: 'heart-breathe', tick: 0, speed: 1, attack: 1.0 });
    tickCommandMode(grid, state, layout7x7);

    // Heart bitmap on pixel: row 0, col 1 = index 1
    expect(grid[1].targetH).toBe(0);
    expect(grid[1].targetS).toBe(100);
    // t = (sin(0)+1)/2 = 0.5, brightness = 5 + 0.5^0.4 * 95 ≈ 77
    expect(grid[1].targetB).toBeCloseTo(5 + Math.pow(0.5, 0.4) * 95, 1);

    // Off pixel: row 0, col 0 = index 0
    expect(grid[0].targetH).toBe(0);
    expect(grid[0].targetS).toBe(0);
    expect(grid[0].targetB).toBe(2);
  });

  it('brightness oscillates with tick', () => {
    const grid1 = makeGrid(49);
    const state1 = makeState({ currentAnimation: 'heart-breathe', tick: 0, attack: 1.0 });
    tickCommandMode(grid1, state1, layout7x7);
    const b0 = grid1[1].targetB;

    // Advance to a tick where sin is positive (tick ~52 → sin(52*0.03) ≈ sin(1.56) ≈ 1)
    const grid2 = makeGrid(49);
    const state2 = makeState({ currentAnimation: 'heart-breathe', tick: 52, attack: 1.0 });
    tickCommandMode(grid2, state2, layout7x7);
    const b52 = grid2[1].targetB;

    expect(b52).toBeGreaterThan(b0);
  });
});

describe('setOrientation command', () => {
  it('stores rotation, flipH, flipV in state', () => {
    const state = makeState();
    handleCommand(state, { type: 'command', action: 'setOrientation', rotation: 90, flipH: true, flipV: false } as CommandMessage);
    expect(state.rotation).toBe(90);
    expect(state.flipH).toBe(true);
    expect(state.flipV).toBe(false);
  });

  it('updates orientation when values change', () => {
    const state = makeState({ rotation: 90, flipH: true, flipV: false });
    handleCommand(state, { type: 'command', action: 'setOrientation', rotation: 180, flipH: false, flipV: true } as CommandMessage);
    expect(state.rotation).toBe(180);
    expect(state.flipH).toBe(false);
    expect(state.flipV).toBe(true);
  });

  it('defaults to identity orientation', () => {
    const state = createDefaultAnimationState();
    expect(state.rotation).toBe(0);
    expect(state.flipH).toBe(false);
    expect(state.flipV).toBe(false);
  });
});

describe('remapGridForOutput', () => {
  it('returns input unchanged when orientation is identity', () => {
    const grid = [{ h: 10 }, { h: 20 }, { h: 30 }, { h: 40 }];
    const state = makeState();
    const result = remapGridForOutput(grid, 2, 2, state);
    expect(result).toBe(grid); // same reference — no copy needed
  });

  it('remaps a 2x2 grid with 90° rotation', () => {
    // Logical layout:
    //   [A, B]    indices: 0, 1
    //   [C, D]    indices: 2, 3
    //
    // 90° CW rotation maps logical → physical:
    //   mapUiToGrid(0) → 1 (A goes to physical 1)
    //   mapUiToGrid(1) → 3 (B goes to physical 3)
    //   mapUiToGrid(2) → 0 (C goes to physical 0)
    //   mapUiToGrid(3) → 2 (D goes to physical 2)
    //
    // Physical layout should be:
    //   [C, A]    indices: 0, 1
    //   [D, B]    indices: 2, 3
    const grid = [{ v: 'A' }, { v: 'B' }, { v: 'C' }, { v: 'D' }];
    const state = makeState({ rotation: 90 });
    const result = remapGridForOutput(grid, 2, 2, state);
    expect(result[0]).toEqual({ v: 'C' });
    expect(result[1]).toEqual({ v: 'A' });
    expect(result[2]).toEqual({ v: 'D' });
    expect(result[3]).toEqual({ v: 'B' });
  });

  it('remaps a 2x2 grid with flipH', () => {
    // Logical: [A, B, C, D] → flipH mirrors columns
    // row 0: col 0→col 1, col 1→col 0: [B, A]
    // row 1: col 0→col 1, col 1→col 0: [D, C]
    const grid = [{ v: 'A' }, { v: 'B' }, { v: 'C' }, { v: 'D' }];
    const state = makeState({ flipH: true });
    const result = remapGridForOutput(grid, 2, 2, state);
    expect(result[0]).toEqual({ v: 'B' });
    expect(result[1]).toEqual({ v: 'A' });
    expect(result[2]).toEqual({ v: 'D' });
    expect(result[3]).toEqual({ v: 'C' });
  });

  it('180° rotation reverses grid order', () => {
    const grid = [{ v: 'A' }, { v: 'B' }, { v: 'C' }, { v: 'D' }];
    const state = makeState({ rotation: 180 });
    const result = remapGridForOutput(grid, 2, 2, state);
    expect(result[0]).toEqual({ v: 'D' });
    expect(result[1]).toEqual({ v: 'C' });
    expect(result[2]).toEqual({ v: 'B' });
    expect(result[3]).toEqual({ v: 'A' });
  });
});
