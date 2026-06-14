import { createDefaultBeams, createDefaultState, hsbToRgb, DEFAULT_CONFIG } from '../src/installation/BeamState';
import { StateController } from '../src/control/StateController';

describe('BeamState', () => {
  it('should create 49 beams with correct row/col', () => {
    const beams = createDefaultBeams();
    expect(beams).toHaveLength(49);
    expect(beams[0].row).toBe(0);
    expect(beams[0].col).toBe(0);
    expect(beams[6].row).toBe(0);
    expect(beams[6].col).toBe(6);
    expect(beams[7].row).toBe(1);
    expect(beams[7].col).toBe(0);
    expect(beams[48].row).toBe(6);
    expect(beams[48].col).toBe(6);
  });

  it('should default to white beams', () => {
    const beams = createDefaultBeams();
    expect(beams[0].color).toEqual([1, 1, 1]);
    expect(beams[0].enabled).toBe(true);
    expect(beams[0].intensity).toBe(0.8);
  });

  it('should create default state', () => {
    const state = createDefaultState();
    expect(state.beams).toHaveLength(49);
    expect(state.globalBrightness).toBe(1);
    expect(state.haze).toBe(0.4);
    expect(state.timeOfDay).toBe('night');
  });
});

describe('hsbToRgb', () => {
  it('should convert red', () => {
    const [r, g, b] = hsbToRgb(0, 100, 100);
    expect(r).toBeCloseTo(1, 1);
    expect(g).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(0, 1);
  });

  it('should convert green', () => {
    const [r, g, b] = hsbToRgb(120, 100, 100);
    expect(r).toBeCloseTo(0, 1);
    expect(g).toBeCloseTo(1, 1);
    expect(b).toBeCloseTo(0, 1);
  });

  it('should convert blue', () => {
    const [r, g, b] = hsbToRgb(240, 100, 100);
    expect(r).toBeCloseTo(0, 1);
    expect(g).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(1, 1);
  });

  it('should convert white', () => {
    const [r, g, b] = hsbToRgb(0, 0, 100);
    expect(r).toBeCloseTo(1, 1);
    expect(g).toBeCloseTo(1, 1);
    expect(b).toBeCloseTo(1, 1);
  });

  it('should convert black', () => {
    const [r, g, b] = hsbToRgb(0, 0, 0);
    expect(r).toBeCloseTo(0, 1);
    expect(g).toBeCloseTo(0, 1);
    expect(b).toBeCloseTo(0, 1);
  });
});

describe('StateController', () => {
  it('should handle state messages from Simulator', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    const grid = Array.from({ length: 49 }, (_, i) => ({
      h: i * 7,
      s: 80,
      b: 60
    }));

    ctrl.handleMessage({ type: 'state', grid });

    // Beam 0: h=0 (red at s=80, b=60)
    expect(ctrl.state.beams[0].intensity).toBeCloseTo(0.6, 1);
    expect(ctrl.state.beams[0].enabled).toBe(true);
  });

  it('should ignore non-state messages', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    const before = ctrl.state.beams[0].color.slice();
    ctrl.handleMessage({ type: 'cannon', id: 0 });
    expect(ctrl.state.beams[0].color).toEqual(before);
  });

  it('should fire onChange callbacks', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    const calls: number[] = [];
    ctrl.onChange(() => calls.push(1));

    ctrl.handleMessage({
      type: 'state',
      grid: Array.from({ length: 49 }, () => ({ h: 0, s: 0, b: 50 }))
    });

    expect(calls).toHaveLength(1);
  });

  it('should allow unsubscribing from onChange', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    const calls: number[] = [];
    const unsub = ctrl.onChange(() => calls.push(1));
    unsub();

    ctrl.handleMessage({
      type: 'state',
      grid: Array.from({ length: 49 }, () => ({ h: 0, s: 0, b: 50 }))
    });

    expect(calls).toHaveLength(0);
  });

  it('should set global brightness', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    ctrl.setGlobalBrightness(1.5);
    expect(ctrl.state.globalBrightness).toBe(1.5);
  });

  it('should clamp global brightness', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    ctrl.setGlobalBrightness(5);
    expect(ctrl.state.globalBrightness).toBe(2);
    ctrl.setGlobalBrightness(-1);
    expect(ctrl.state.globalBrightness).toBe(0);
  });

  it('should set haze', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    ctrl.setHaze(0.7);
    expect(ctrl.state.haze).toBe(0.7);
  });

  it('should set time of day', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    ctrl.setTimeOfDay('dusk');
    expect(ctrl.state.timeOfDay).toBe('dusk');
  });

  it('should set individual beam', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    ctrl.setBeam(5, { color: [1, 0, 0], intensity: 0.9 });
    expect(ctrl.state.beams[5].color).toEqual([1, 0, 0]);
    expect(ctrl.state.beams[5].intensity).toBe(0.9);
  });

  it('should set all beams', () => {
    const ctrl = new StateController(DEFAULT_CONFIG);
    ctrl.setAllBeams([0, 1, 0], 0.5);
    for (const beam of ctrl.state.beams) {
      expect(beam.color).toEqual([0, 1, 0]);
      expect(beam.intensity).toBe(0.5);
    }
  });
});
