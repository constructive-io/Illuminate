import { hsbToRgb, hsbToRgb100, hsbToRgb255 } from '../src/color';

describe('hsbToRgb', () => {
  it('pure red (h=0, s=100, b=100)', () => {
    const rgb = hsbToRgb(0, 100, 100);
    expect(rgb.r).toBeCloseTo(1, 4);
    expect(rgb.g).toBeCloseTo(0, 4);
    expect(rgb.b).toBeCloseTo(0, 4);
  });

  it('pure green (h=120, s=100, b=100)', () => {
    const rgb = hsbToRgb(120, 100, 100);
    expect(rgb.r).toBeCloseTo(0, 4);
    expect(rgb.g).toBeCloseTo(1, 4);
    expect(rgb.b).toBeCloseTo(0, 4);
  });

  it('pure blue (h=240, s=100, b=100)', () => {
    const rgb = hsbToRgb(240, 100, 100);
    expect(rgb.r).toBeCloseTo(0, 4);
    expect(rgb.g).toBeCloseTo(0, 4);
    expect(rgb.b).toBeCloseTo(1, 4);
  });

  it('white (h=0, s=0, b=100)', () => {
    const rgb = hsbToRgb(0, 0, 100);
    expect(rgb.r).toBeCloseTo(1, 4);
    expect(rgb.g).toBeCloseTo(1, 4);
    expect(rgb.b).toBeCloseTo(1, 4);
  });

  it('black (h=0, s=0, b=0)', () => {
    const rgb = hsbToRgb(0, 0, 0);
    expect(rgb.r).toBeCloseTo(0, 4);
    expect(rgb.g).toBeCloseTo(0, 4);
    expect(rgb.b).toBeCloseTo(0, 4);
  });

  it('civic blue (h=220, s=90, b=80)', () => {
    const rgb = hsbToRgb(220, 90, 80);
    expect(rgb.r).toBeGreaterThanOrEqual(0);
    expect(rgb.r).toBeLessThanOrEqual(1);
    expect(rgb.b).toBeGreaterThan(rgb.r);
    expect(rgb.b).toBeGreaterThan(rgb.g);
  });

  it('wraps hue > 360', () => {
    const a = hsbToRgb(10, 100, 100);
    const b = hsbToRgb(370, 100, 100);
    expect(a.r).toBeCloseTo(b.r, 4);
    expect(a.g).toBeCloseTo(b.g, 4);
    expect(a.b).toBeCloseTo(b.b, 4);
  });
});

describe('hsbToRgb255', () => {
  it('returns integers in 0–255 range', () => {
    const rgb = hsbToRgb255(0, 100, 100);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('black returns all zeros', () => {
    const rgb = hsbToRgb255(0, 0, 0);
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });
});

describe('hsbToRgb100', () => {
  it('returns integers in 0–100 range', () => {
    const rgb = hsbToRgb100(0, 100, 100);
    expect(rgb.r).toBe(100);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('50% brightness red', () => {
    const rgb = hsbToRgb100(0, 100, 50);
    expect(rgb.r).toBe(50);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });
});
