'use client';

import { useCallback, useEffect, useRef } from 'react';

interface DropsConfig {
  spectrumStart: number;
  spectrumEnd: number;
  speed: number;
  decay: number;
  width: number;
}

interface Drop {
  origin: number;
  tick: number;
}

export function useDrops(
  numCannons: number,
  gridColumns: number,
  config: DropsConfig,
  send: (msg: Record<string, unknown>) => void
) {
  const dropsRef = useRef<Drop[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef(config);
  const sendRef = useRef(send);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { sendRef.current = send; }, [send]);

  const addDrop = useCallback((originIndex: number) => {
    dropsRef.current.push({ origin: originIndex, tick: 0 });
    if (!timerRef.current) {
      timerRef.current = setInterval(() => tickDrops(), 80);
    }
  }, []);

  const tickDrops = useCallback(() => {
    const drops = dropsRef.current;
    const cfg = configRef.current;
    const s = sendRef.current;
    if (drops.length === 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    const rows = Math.ceil(numCannons / gridColumns);
    const contrib = new Float32Array(numCannons);
    const hues = new Float32Array(numCannons);
    const sats = new Float32Array(numCannons);
    const counts = new Float32Array(numCannons);
    const maxRadius = Math.max(gridColumns, rows) * 1.5;
    const decayRate = 0.6 + (10 - cfg.decay) * 0.06;
    const speedMult = 0.3 + cfg.speed * 0.15;
    const ringWidth = cfg.width;

    for (let d = drops.length - 1; d >= 0; d--) {
      const drop = drops[d];
      const radius = drop.tick * speedMult;
      if (radius > maxRadius + ringWidth) {
        drops.splice(d, 1);
        continue;
      }

      const oRow = Math.floor(drop.origin / gridColumns);
      const oCol = drop.origin % gridColumns;

      for (let i = 0; i < numCannons; i++) {
        const r = Math.floor(i / gridColumns);
        const c = i % gridColumns;
        const dist = Math.sqrt((r - oRow) * (r - oRow) + (c - oCol) * (c - oCol));
        const delta = Math.abs(dist - radius);
        if (delta > ringWidth) continue;

        const ringFalloff = 1 - (delta / ringWidth);
        const ageFalloff = Math.pow(decayRate, drop.tick * 0.3);
        const intensity = ringFalloff * ageFalloff * 80;
        if (intensity < 1) continue;

        const specRange = cfg.spectrumEnd - cfg.spectrumStart;
        const hue = (cfg.spectrumStart + (dist / maxRadius) * specRange + 360) % 360;

        contrib[i] += intensity;
        hues[i] += hue * intensity;
        sats[i] += 90 * intensity;
        counts[i] += intensity;
      }

      drop.tick++;
    }

    for (let i = 0; i < numCannons; i++) {
      if (counts[i] > 0) {
        const h = (hues[i] / counts[i] + 360) % 360;
        const sat = sats[i] / counts[i];
        const b = Math.min(100, contrib[i]);
        s({ type: 'cannon', index: i, h, s: sat, b });
      }
    }

    if (drops.length === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [numCannons, gridColumns]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { addDrop };
}

export function DropsControls({
  config,
  onChange
}: {
  config: DropsConfig;
  onChange: (c: DropsConfig) => void;
}) {
  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<'start' | 'end' | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = spectrumRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    for (let x = 0; x < w; x++) {
      const hue = (x / w) * 360;
      ctx.fillStyle = `hsl(${hue}, 90%, 50%)`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, []);

  const hueFromPointer = useCallback((clientX: number) => {
    const canvas = spectrumRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pos * 360);
  }, []);

  const handleSpectrumDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const hue = hueFromPointer(e.clientX);
    const dStart = Math.abs(hue - config.spectrumStart);
    const dEnd = Math.abs(hue - config.spectrumEnd);
    const which = dStart < dEnd ? 'start' : 'end';
    draggingRef.current = which;
    if (which === 'start') {
      onChange({ ...config, spectrumStart: hue });
    } else {
      onChange({ ...config, spectrumEnd: hue });
    }
  }, [config, onChange, hueFromPointer]);

  const handleSpectrumMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const which = draggingRef.current;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const hue = hueFromPointer(e.clientX);
      if (which === 'start') {
        onChange({ ...config, spectrumStart: hue });
      } else {
        onChange({ ...config, spectrumEnd: hue });
      }
    });
  }, [config, onChange, hueFromPointer]);

  const handleSpectrumUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const handleSliderChange = useCallback((key: 'speed' | 'decay' | 'width', val: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      onChange({ ...config, [key]: val });
    });
  }, [config, onChange]);

  return (
    <div className="space-y-3">
      {/* Spectrum range */}
      <div>
        <p className="text-xs mb-1.5" style={{ color: '#888898', letterSpacing: '0.05em' }}>
          SPECTRUM
        </p>
        <div
          className="relative"
          style={{ touchAction: 'none' }}
          onPointerDown={handleSpectrumDown}
          onPointerMove={handleSpectrumMove}
          onPointerUp={handleSpectrumUp}
          onPointerCancel={handleSpectrumUp}
        >
          <canvas
            ref={spectrumRef}
            width={200}
            height={36}
            className="w-full rounded-md"
            style={{ height: 36 }}
          />
          {/* Start handle */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `calc(${(config.spectrumStart / 360) * 100}% - 10px)`,
              top: -4,
              bottom: -4,
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: 6,
                height: '100%',
                background: '#fff',
                borderRadius: 3,
                boxShadow: '0 0 8px rgba(0,0,0,0.6), 0 0 2px rgba(255,255,255,0.4)'
              }}
            />
          </div>
          {/* End handle */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: `calc(${(config.spectrumEnd / 360) * 100}% - 10px)`,
              top: -4,
              bottom: -4,
              width: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                width: 6,
                height: '100%',
                background: '#fff',
                borderRadius: 3,
                boxShadow: '0 0 8px rgba(0,0,0,0.6), 0 0 2px rgba(255,255,255,0.4)'
              }}
            />
          </div>
          {/* Selected range overlay */}
          <div
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{
              left: `${(Math.min(config.spectrumStart, config.spectrumEnd) / 360) * 100}%`,
              width: `${(Math.abs(config.spectrumEnd - config.spectrumStart) / 360) * 100}%`,
              background: 'rgba(255,255,255,0.12)',
              borderTop: '2px solid rgba(255,255,255,0.4)',
              borderBottom: '2px solid rgba(255,255,255,0.4)'
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs font-mono" style={{ color: '#888898', fontSize: 9 }}>{config.spectrumStart}°</span>
          <span className="text-xs font-mono" style={{ color: '#888898', fontSize: 9 }}>{config.spectrumEnd}°</span>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex gap-4">
        {[
          { label: 'Speed', key: 'speed' as const, min: 1, max: 10, val: config.speed },
          { label: 'Decay', key: 'decay' as const, min: 1, max: 10, val: config.decay },
          { label: 'Width', key: 'width' as const, min: 1, max: 5, val: config.width }
        ].map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: '#888898', fontSize: 9 }}>{s.label}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={s.val}
              onChange={(e) => handleSliderChange(s.key, Number(e.target.value))}
              style={{ width: 60 }}
            />
            <span className="text-xs font-mono" style={{ color: '#888898', minWidth: 14, textAlign: 'right', fontSize: 9 }}>
              {s.val}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color: 'rgba(136,136,152,0.5)' }}>
        Tap on the grid to create ripples
      </p>
    </div>
  );
}
