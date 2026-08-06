import { useEffect, useRef } from 'react';

const COLS = 7;
const ROWS = 7;
const COUNT = COLS * ROWS;

interface MiniGridPreviewProps {
  /** Render body string using ctx API, OR full IIFE pattern code */
  source: string;
  /** Animation speed multiplier (default 1) */
  speed?: number;
  /** Canvas size in px (square) */
  size?: number;
  /** Whether this is a full pattern expression (IIFE) vs a render body */
  isPattern?: boolean;
}

function hsbToRgb(h: number, s: number, b: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  b = Math.max(0, Math.min(100, b)) / 100;
  const c = b * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = b - c;
  let r = 0, g = 0, bl = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; bl = x; }
  else if (h < 240) { g = x; bl = c; }
  else if (h < 300) { r = x; bl = c; }
  else { r = c; bl = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((bl + m) * 255)
  ];
}

function buildRenderFn(source: string, isPattern: boolean): ((ctx: Record<string, unknown>) => void) | null {
  try {
    if (isPattern) {
      const factory = new Function('return (' + source + ');');
      const obj = factory();
      if (obj && typeof obj.render === 'function') {
        return obj.render;
      }
      return null;
    }
    return new Function('ctx', source) as (ctx: Record<string, unknown>) => void;
  } catch {
    return null;
  }
}

export function MiniGridPreview({ source, speed = 1, size = 72, isPattern = false }: MiniGridPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);
  const startRef = useRef(0);
  const renderFnRef = useRef<((ctx: Record<string, unknown>) => void) | null>(null);

  useEffect(() => {
    renderFnRef.current = buildRenderFn(source, isPattern);
  }, [source, isPattern]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    startRef.current = performance.now();
    frameRef.current = 0;

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;
    const buf: { h: number; s: number; b: number }[] = new Array(COUNT);
    for (let i = 0; i < COUNT; i++) buf[i] = { h: 0, s: 0, b: 0 };

    function tick() {
      const renderFn = renderFnRef.current;
      if (!renderFn) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const elapsed = (now - startRef.current) / 1000;
      const frame = frameRef.current;

      const patternCtx = {
        count: COUNT,
        cols: COLS,
        rows: ROWS,
        t: elapsed * speed,
        frame: frame * speed,
        set(i: number, h: number, s: number, b: number) {
          if (i >= 0 && i < COUNT) {
            buf[i].h = h || 0;
            buf[i].s = s || 0;
            buf[i].b = b || 0;
          }
        },
        get(i: number) {
          if (i >= 0 && i < COUNT) return [buf[i].h, buf[i].s, buf[i].b];
          return [0, 0, 0];
        },
        fill(h: number, s: number, b: number) {
          for (let i = 0; i < COUNT; i++) {
            buf[i].h = h || 0;
            buf[i].s = s || 0;
            buf[i].b = b || 0;
          }
        },
        uv(i: number): [number, number] {
          return [
            (i % COLS) / (COLS - 1 || 1),
            Math.floor(i / COLS) / (ROWS - 1 || 1)
          ];
        },
        polar(i: number): [number, number] {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const cx = (COLS - 1) / 2;
          const cy = (ROWS - 1) / 2;
          const dx = col - cx;
          const dy = row - cy;
          const mr = Math.hypot(cx, cy) || 1;
          return [Math.hypot(dx, dy) / mr, Math.atan2(dy, dx)];
        },
        xy(i: number): [number, number] {
          return [i % COLS, Math.floor(i / COLS)];
        },
        noise(x: number, y: number, z: number) {
          const dot = x * 12.9898 + y * 78.233 + z * 37.719;
          const s = Math.sin(dot) * 43758.5453;
          return s - Math.floor(s);
        },
        smoothstep(e0: number, e1: number, x: number) {
          const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
          return t * t * (3 - 2 * t);
        }
      };

      try {
        renderFn(patternCtx);
      } catch {
        // pattern error — leave buffer as-is
      }

      // Draw the grid
      for (let i = 0; i < COUNT; i++) {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const [r, g, b] = hsbToRgb(buf[i].h, buf[i].s, buf[i].b);
        ctx2d!.fillStyle = `rgb(${r},${g},${b})`;
        ctx2d!.fillRect(col * cellW, row * cellH, cellW, cellH);
      }

      frameRef.current++;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [speed, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        imageRendering: 'pixelated'
      }}
    />
  );
}
