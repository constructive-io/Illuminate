import { getCanvasHTML } from '../src/ui';

describe('canvas UI', () => {
  it('should return HTML string', () => {
    const html = getCanvasHTML();
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('should contain all mode tabs', () => {
    const html = getCanvasHTML();
    expect(html).toContain('data-mode="paint"');
    expect(html).toContain('data-mode="gradient"');
    expect(html).toContain('data-mode="energy"');
    expect(html).toContain('data-mode="scenes"');
    expect(html).toContain('data-mode="motion"');
    expect(html).toContain('data-mode="drops"');
    expect(html).not.toContain('data-mode="symmetry"');
  });

  it('should contain scene swatches', () => {
    const html = getCanvasHTML();
    expect(html).toContain('scene-palette');
    expect(html).toContain('Civic Blue');
    expect(html).toContain('Golden Gate');
    expect(html).toContain('Pride');
  });

  it('should contain sculpture canvas', () => {
    const html = getCanvasHTML();
    expect(html).toContain('id="sculpture"');
  });

  it('should contain color wheel', () => {
    const html = getCanvasHTML();
    expect(html).toContain('id="color-wheel"');
  });

  it('should have brush controls in paint panel', () => {
    const html = getCanvasHTML();
    expect(html).toContain('id="brush-size"');
    expect(html).toContain('id="brush-falloff"');
    expect(html).not.toContain('data-mode="brush"');
  });

  it('should not contain technical language', () => {
    const html = getCanvasHTML();
    expect(html).not.toContain('projector');
    expect(html).not.toContain('OSC');
    expect(html).not.toContain('BEYOND');
  });
});
