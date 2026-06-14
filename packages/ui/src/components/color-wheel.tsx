'use client';

import { useCallback, useEffect, useRef } from 'react';

interface ColorWheelProps {
  hue: number;
  saturation: number;
  brightness: number;
  brushSize: number;
  softEdge: boolean;
  onHueChange: (h: number) => void;
  onSatChange: (s: number) => void;
  onBrightChange: (b: number) => void;
  onBrushSizeChange: (s: number) => void;
  onSoftEdgeChange: (v: boolean) => void;
}

function hslRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

export function ColorWheel({
  hue,
  saturation,
  brightness,
  brushSize,
  softEdge,
  onHueChange,
  onSatChange,
  onBrightChange,
  onBrushSizeChange,
  onSoftEdgeChange
}: ColorWheelProps) {
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const brightBarRef = useRef<HTMLDivElement>(null);
  const draggingWheel = useRef(false);
  const draggingBright = useRef(false);
  const wheelSize = 160;

  // Draw the color wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = wheelSize;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 2;
    const imgData = ctx.createImageData(size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
        const sat = (dist / radius) * 100;
        const [r, g, b] = hslRgb(angle, sat, 50);
        const idx = (y * size + x) * 4;
        imgData.data[idx] = r * 255;
        imgData.data[idx + 1] = g * 255;
        imgData.data[idx + 2] = b * 255;
        imgData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const pickWheel = useCallback((clientX: number, clientY: number) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = wheelSize / rect.width;
    const px = (clientX - rect.left) * scale;
    const py = (clientY - rect.top) * scale;
    const cx = wheelSize / 2;
    const cy = wheelSize / 2;
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = wheelSize / 2 - 2;
    if (dist > radius) return;
    const h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const s = (dist / radius) * 100;
    onHueChange(Math.round(h));
    onSatChange(Math.round(s));
  }, [onHueChange, onSatChange]);

  const pickBright = useCallback((clientY: number) => {
    const bar = brightBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, 100 - ((clientY - rect.top) / rect.height) * 100));
    onBrightChange(Math.round(pct));
  }, [onBrightChange]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingWheel.current) pickWheel(e.clientX, e.clientY);
      if (draggingBright.current) pickBright(e.clientY);
    };
    const onUp = () => {
      draggingWheel.current = false;
      draggingBright.current = false;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [pickWheel, pickBright]);

  // Cursor position on wheel
  const radius = wheelSize / 2 - 2;
  const cursorAngle = (hue * Math.PI) / 180;
  const cursorDist = (saturation / 100) * radius;
  const cursorX = wheelSize / 2 + Math.cos(cursorAngle) * cursorDist;
  const cursorY = wheelSize / 2 + Math.sin(cursorAngle) * cursorDist;
  const displayScale = 160 / wheelSize;
  const cursorDisplayX = cursorX * displayScale;
  const cursorDisplayY = cursorY * displayScale;

  // Preview color
  const [pr, pg, pb] = hslRgb(hue, saturation, Math.max(10, brightness * 0.5));
  const previewColor = `rgb(${Math.round(pr * 255)},${Math.round(pg * 255)},${Math.round(pb * 255)})`;
  const previewGlow = `rgba(${Math.round(pr * 255)},${Math.round(pg * 255)},${Math.round(pb * 255)},0.4)`;

  return (
    <div className="flex items-start gap-4">
      {/* Color wheel */}
      <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
        <canvas
          ref={wheelRef}
          width={wheelSize}
          height={wheelSize}
          className="rounded-full cursor-crosshair"
          style={{ width: 160, height: 160, touchAction: 'none' }}
          onPointerDown={(e) => {
            draggingWheel.current = true;
            pickWheel(e.clientX, e.clientY);
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid #fff',
            boxShadow: '0 0 6px rgba(0,0,0,0.5)',
            transform: 'translate(-50%, -50%)',
            left: `${cursorDisplayX}px`,
            top: `${cursorDisplayY}px`
          }}
        />
      </div>

      {/* Brightness bar */}
      <div
        ref={brightBarRef}
        className="relative shrink-0 rounded-lg cursor-pointer"
        style={{
          width: 28,
          height: 160,
          background: `linear-gradient(to bottom, hsl(${hue},${saturation}%,50%), #000)`,
          touchAction: 'none'
        }}
        onPointerDown={(e) => {
          draggingBright.current = true;
          pickBright(e.clientY);
        }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            left: -2,
            right: -2,
            height: 4,
            borderRadius: 2,
            background: '#fff',
            boxShadow: '0 0 6px rgba(0,0,0,0.5)',
            bottom: `${brightness}%`,
            transform: 'translateY(50%)'
          }}
        />
      </div>

      {/* Preview + controls column */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* Color preview swatch */}
        <div
          className="rounded-xl"
          style={{
            width: 52,
            height: 52,
            background: previewColor,
            boxShadow: `0 0 20px ${previewGlow}`,
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        />

        {/* Brush size */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#888898', fontSize: 9, letterSpacing: '0.05em' }}>SIZE</span>
          <input
            type="range"
            min={1}
            max={5}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            style={{ width: 60 }}
          />
          <span className="text-xs font-mono" style={{ color: '#888898' }}>{brushSize}</span>
        </div>

        {/* Soft edge toggle */}
        <button
          onClick={() => onSoftEdgeChange(!softEdge)}
          className="px-3 py-1 rounded-2xl text-xs transition-all"
          style={{
            background: softEdge ? 'rgba(74,124,255,0.15)' : '#12121a',
            color: softEdge ? '#4a7cff' : '#888898',
            border: `1px solid ${softEdge ? '#4a7cff' : '#1a1a25'}`,
            fontSize: 10
          }}
        >
          Soft Edge
        </button>
      </div>
    </div>
  );
}
