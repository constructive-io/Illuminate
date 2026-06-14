'use client';

import { useCallback, useEffect, useRef } from 'react';

import type { CannonColor } from '@/lib/use-socket';

interface GridDisplayProps {
  grid: CannonColor[];
  columns: number;
  currentHue: number;
  currentSat: number;
  currentBright: number;
  onCannon: (index: number, h: number, s: number, b: number) => void;
}

function hslStr(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function hslRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

export function GridDisplay({
  grid,
  columns,
  currentHue,
  currentSat,
  currentBright,
  onCannon
}: GridDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const paintingRef = useRef(false);
  const sizeRef = useRef({ cellSize: 0, gridOffset: 0, canvasW: 0, canvasH: 0 });

  const rows = Math.ceil(grid.length / columns);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const maxW = wrap.clientWidth - 32;
    const maxH = wrap.clientHeight - 32;
    const size = Math.min(maxW, maxH, 560);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellSize = (size - 20) / Math.max(columns, rows);
    sizeRef.current = { cellSize, gridOffset: 10, canvasW: size, canvasH: size };
  }, [columns, rows]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { cellSize, gridOffset, canvasW, canvasH } = sizeRef.current;
    ctx.clearRect(0, 0, canvasW, canvasH);

    const r = cellSize * 0.34;

    for (let i = 0; i < grid.length; i++) {
      const row = Math.floor(i / columns);
      const col = i % columns;
      const cx = gridOffset + col * cellSize + cellSize / 2;
      const cy = gridOffset + row * cellSize + cellSize / 2;
      const c = grid[i];
      const lightness = Math.max(5, c.b * 0.5);

      // Outer glow
      if (c.b > 5) {
        const glowR = r * (1.2 + c.b * 0.012);
        const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, glowR);
        const [gr, gg, gb] = hslRgb(c.h, c.s, lightness);
        grad.addColorStop(0, `rgba(${Math.round(gr * 255)},${Math.round(gg * 255)},${Math.round(gb * 255)},0.5)`);
        grad.addColorStop(1, `rgba(${Math.round(gr * 255)},${Math.round(gg * 255)},${Math.round(gb * 255)},0)`);
        ctx.beginPath();
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Core orb
      const orbGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
      if (c.b < 2) {
        orbGrad.addColorStop(0, '#181820');
        orbGrad.addColorStop(1, '#0e0e14');
      } else {
        const bright = Math.min(lightness + 15, 95);
        orbGrad.addColorStop(0, hslStr(c.h, c.s, bright));
        orbGrad.addColorStop(1, hslStr(c.h, c.s, lightness * 0.6));
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = orbGrad;
      ctx.fill();

      // Specular highlight
      if (c.b > 20) {
        ctx.beginPath();
        ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${c.b * 0.002})`;
        ctx.fill();
      }
    }
  }, [grid, columns]);

  // Get cannon index from pointer coordinates
  const cannonAtXY = useCallback((clientX: number, clientY: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return -1;
    const rect = canvas.getBoundingClientRect();
    const { cellSize, gridOffset, canvasW } = sizeRef.current;
    const x = (clientX - rect.left) * (canvasW / rect.width);
    const y = (clientY - rect.top) * (canvasW / rect.height);
    const col = Math.floor((x - gridOffset) / cellSize);
    const row = Math.floor((y - gridOffset) / cellSize);
    if (col < 0 || col >= columns || row < 0 || row >= rows) return -1;
    const idx = row * columns + col;
    return idx < grid.length ? idx : -1;
  }, [columns, rows, grid.length]);

  const paint = useCallback((clientX: number, clientY: number) => {
    const idx = cannonAtXY(clientX, clientY);
    if (idx >= 0) onCannon(idx, currentHue, currentSat, currentBright);
  }, [cannonAtXY, onCannon, currentHue, currentSat, currentBright]);

  const handleStart = useCallback((e: React.PointerEvent) => {
    paintingRef.current = true;
    paint(e.clientX, e.clientY);
  }, [paint]);

  const handleMove = useCallback((e: React.PointerEvent) => {
    if (paintingRef.current) paint(e.clientX, e.clientY);
  }, [paint]);

  const handleEnd = useCallback(() => {
    paintingRef.current = false;
  }, []);

  // Resize and draw
  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div
      ref={wrapRef}
      className="flex-1 flex items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        style={{ borderRadius: 16, touchAction: 'none' }}
        onPointerDown={handleStart}
        onPointerMove={handleMove}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
      />
    </div>
  );
}
