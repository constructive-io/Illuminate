import { useCallback, useEffect, useRef, useState } from 'react';

interface GradientStop {
  pos: number;
  h: number;
  s: number;
  b: number;
}

export function useGradient() {
  const [stops, setStops] = useState<GradientStop[]>([
    { pos: 0, h: 220, s: 90, b: 80 },
    { pos: 1, h: 340, s: 80, b: 75 }
  ]);

  const colorAt = useCallback((t: number): { h: number; s: number; b: number } => {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    if (t <= sorted[0].pos) return sorted[0];
    if (t >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (t >= sorted[i].pos && t <= sorted[i + 1].pos) {
        const f = (t - sorted[i].pos) / (sorted[i + 1].pos - sorted[i].pos);
        return {
          h: sorted[i].h + (sorted[i + 1].h - sorted[i].h) * f,
          s: sorted[i].s + (sorted[i + 1].s - sorted[i].s) * f,
          b: sorted[i].b + (sorted[i + 1].b - sorted[i].b) * f
        };
      }
    }
    return sorted[0];
  }, [stops]);

  const addStop = useCallback((pos: number, h: number, s: number, b: number) => {
    setStops((prev) => [...prev, { pos, h, s, b }]);
  }, []);

  const reset = useCallback(() => {
    setStops([
      { pos: 0, h: 220, s: 90, b: 80 },
      { pos: 1, h: 340, s: 80, b: 75 }
    ]);
  }, []);

  return { stops, colorAt, addStop, reset };
}

export function GradientBar({
  stops,
  onAdd
}: {
  stops: GradientStop[];
  onAdd: (pos: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (const stop of sorted) {
      const l = Math.max(10, stop.b * 0.5);
      grad.addColorStop(stop.pos, `hsl(${stop.h}, ${stop.s}%, ${l}%)`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, [stops]);

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: '#888898', letterSpacing: '0.05em' }}>
        GRADIENT
      </p>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={300}
          height={32}
          className="w-full rounded-lg cursor-pointer"
          style={{ height: 32, touchAction: 'none' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            onAdd(pos);
          }}
        />
        {stops.map((stop, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${stop.pos * 100}%`,
              width: 3,
              background: '#fff',
              opacity: 0.6,
              transform: 'translateX(-50%)',
              borderRadius: 1
            }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: 'rgba(136,136,152,0.5)' }}>
        Tap bar to add color stops. Drag across grid to apply.
      </p>
    </div>
  );
}
