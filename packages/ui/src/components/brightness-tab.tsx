'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CannonColor } from '@/lib/use-socket';

export type BrightnessMode = 'off' | 'breathe' | 'ripple' | 'wave' | 'fire' | 'shimmer';

interface BrightnessConfig {
  mode: BrightnessMode;
  speed: number;   // 1–10
  intensity: number; // 0–100
}

const MODES: { key: BrightnessMode; label: string }[] = [
  { key: 'off', label: 'Off' },
  { key: 'breathe', label: 'Breathe' },
  { key: 'ripple', label: 'Ripple' },
  { key: 'wave', label: 'Wave' },
  { key: 'fire', label: 'Fire' },
  { key: 'shimmer', label: 'Shimmer' }
];

const MODE_GRADIENTS: Record<BrightnessMode, string> = {
  off: 'linear-gradient(135deg, #1a1a25, #0e0e14)',
  breathe: 'linear-gradient(135deg, #1a1a4a, #3a3a8a)',
  ripple: 'linear-gradient(135deg, #0e3060, #1a6090)',
  wave: 'linear-gradient(135deg, #0a4040, #1a8080)',
  fire: 'linear-gradient(135deg, #8a2000, #cc6600, #ffaa00)',
  shimmer: 'linear-gradient(135deg, #3a2a5a, #6a4a9a)'
};

// All modes ONLY modulate brightness — colors (h, s) are never changed
function computeBrightnessMod(
  mode: BrightnessMode,
  r: number,
  c: number,
  i: number,
  time: number,
  spd: number,
  cols: number,
  rows: number,
  noise: number
): number {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  switch (mode) {
  case 'breathe':
    // All beams pulse together
    return 0.5 + 0.5 * Math.sin(time * spd * 1.5);
  case 'ripple': {
    // Radial wave from center
    const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
    return 0.5 + 0.5 * Math.sin(dist * 1.2 - time * spd * 2);
  }
  case 'wave':
    // Horizontal sweep
    return 0.5 + 0.5 * Math.sin((c / cols) * Math.PI * 2 - time * spd * 1.8);
  case 'fire': {
    // Organic flickering — multi-frequency noise, no color change
    const t1 = Math.sin(time * spd * 3 + noise * 20);
    const t2 = Math.sin(time * spd * 5.7 + i * 0.7);
    const t3 = Math.sin(time * spd * 1.3 + noise * 10 + r * 0.5);
    return 0.3 + 0.25 * t1 + 0.25 * t2 + 0.2 * t3;
  }
  case 'shimmer':
    // Per-beam random sparkle
    return 0.5 + 0.5 * Math.sin(time * spd * 4 + noise * 30);
  default:
    return 1;
  }
}

export function useBrightnessAnimation(
  numCannons: number,
  gridColumns: number,
  gridData: CannonColor[],
  send: (msg: Record<string, unknown>) => void
) {
  const [config, setConfig] = useState<BrightnessConfig>({
    mode: 'off',
    speed: 5,
    intensity: 60
  });
  const configRef = useRef(config);
  configRef.current = config;

  // Snapshot of the grid colors taken when a mode is activated
  const snapshotRef = useRef<CannonColor[] | null>(null);

  // Live grid ref — only used to take a snapshot, never read during animation
  const gridRef = useRef(gridData);
  gridRef.current = gridData;

  // Stable noise values per beam (for fire/shimmer)
  const noiseRef = useRef<Float32Array>(new Float32Array(0));
  if (noiseRef.current.length !== numCannons) {
    const arr = new Float32Array(numCannons);
    for (let i = 0; i < numCannons; i++) arr[i] = Math.random();
    noiseRef.current = arr;
  }

  const rafRef = useRef(0);
  const startRef = useRef(0);
  const lastSeedRef = useRef(0);

  const setMode = useCallback((mode: BrightnessMode) => {
    if (mode !== 'off') {
      // Snapshot current grid colors at the moment the mode is activated
      snapshotRef.current = gridRef.current.map((c) => ({ ...c }));
    } else {
      // Turning off — restore the snapshot colors one final time
      if (snapshotRef.current) {
        for (let i = 0; i < snapshotRef.current.length; i++) {
          const { h, s, b } = snapshotRef.current[i];
          send({ type: 'cannon', index: i, h, s, b });
        }
      }
      snapshotRef.current = null;
    }
    setConfig((c) => ({ ...c, mode }));
  }, [send]);

  const setSpeed = useCallback((speed: number) => {
    setConfig((c) => ({ ...c, speed }));
  }, []);

  const setIntensity = useCallback((intensity: number) => {
    setConfig((c) => ({ ...c, intensity }));
  }, []);

  // Re-snapshot: allow user to pick a new flag/scene and re-capture
  const resnapshot = useCallback(() => {
    if (configRef.current.mode !== 'off') {
      snapshotRef.current = gridRef.current.map((c) => ({ ...c }));
    }
  }, []);

  useEffect(() => {
    if (config.mode === 'off') return;

    startRef.current = performance.now() / 1000;
    lastSeedRef.current = 0;
    let running = true;

    const tick = () => {
      if (!running) return;
      const snap = snapshotRef.current;
      if (!snap) { rafRef.current = requestAnimationFrame(tick); return; }

      const t = performance.now() / 1000 - startRef.current;
      const cfg = configRef.current;
      const spd = cfg.speed / 5;
      const mix = cfg.intensity / 100;
      const rows = Math.ceil(snap.length / gridColumns);

      // Re-seed noise every ~0.3s for fire variation
      if (cfg.mode === 'fire' && t - lastSeedRef.current > 0.3) {
        lastSeedRef.current = t;
        const arr = noiseRef.current;
        for (let j = 0; j < arr.length; j++) {
          arr[j] = arr[j] * 0.7 + Math.random() * 0.3;
        }
      }

      for (let i = 0; i < snap.length; i++) {
        const r = Math.floor(i / gridColumns);
        const c = i % gridColumns;
        const { h, s, b } = snap[i]; // Original colors — never modified

        const bMod = computeBrightnessMod(
          cfg.mode, r, c, i, t, spd, gridColumns, rows, noiseRef.current[i]
        );

        // Blend: original brightness mixed with modulated brightness
        const modB = Math.max(5, Math.round(b * (1 - mix) + (b * bMod) * mix));

        send({ type: 'cannon', index: i, h, s, b: modB });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [config.mode, gridColumns, send]);

  return { config, setMode, setSpeed, setIntensity, resnapshot };
}

export function BrightnessTab({
  config,
  onMode,
  onSpeed,
  onIntensity,
  onResnapshot
}: {
  config: BrightnessConfig;
  onMode: (m: BrightnessMode) => void;
  onSpeed: (v: number) => void;
  onIntensity: (v: number) => void;
  onResnapshot: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Mode swatches */}
      <div className="flex gap-2 flex-wrap">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => onMode(m.key)}
            className="relative overflow-hidden transition-transform active:scale-93"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: MODE_GRADIENTS[m.key],
              border: config.mode === m.key ? '2px solid #fff' : '2px solid transparent'
            }}
          >
            <span
              className="absolute bottom-0.5 left-0 right-0 text-center text-white font-semibold"
              style={{
                fontSize: 8,
                textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                letterSpacing: '0.03em'
              }}
            >
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Sliders + resnapshot */}
      {config.mode !== 'off' && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className="text-xs"
              style={{ color: '#888898', letterSpacing: '0.05em', minWidth: 52 }}
            >
              SPEED
            </span>
            <input
              type="range"
              className="flex-1"
              min={1}
              max={10}
              value={config.speed}
              onChange={(e) => onSpeed(Number(e.target.value))}
            />
            <span
              className="text-xs font-mono"
              style={{ color: '#e8e8f0', minWidth: 24, textAlign: 'right' }}
            >
              {config.speed}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-xs"
              style={{ color: '#888898', letterSpacing: '0.05em', minWidth: 52 }}
            >
              MIX
            </span>
            <input
              type="range"
              className="flex-1"
              min={0}
              max={100}
              value={config.intensity}
              onChange={(e) => onIntensity(Number(e.target.value))}
            />
            <span
              className="text-xs font-mono"
              style={{ color: '#e8e8f0', minWidth: 32, textAlign: 'right' }}
            >
              {config.intensity}%
            </span>
          </div>
          <button
            onClick={onResnapshot}
            className="px-3 py-1 rounded-lg text-xs transition-all"
            style={{
              background: '#12121a',
              color: '#888898',
              border: '1px solid #1a1a25'
            }}
          >
            Recapture colors
          </button>
          <p
            className="text-xs"
            style={{ color: 'rgba(136,136,152,0.5)' }}
          >
            Colors are captured when you pick a mode. Change the scene/flag first, then tap Recapture.
          </p>
        </div>
      )}
    </div>
  );
}
