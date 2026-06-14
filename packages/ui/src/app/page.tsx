'use client';

import { useCallback, useRef, useState } from 'react';

import { AudioTab } from '@/components/audio-tab';
import { ColorWheel } from '@/components/color-wheel';
import { DropsControls, useDrops } from '@/components/drops-tab';
import { GradientBar, useGradient } from '@/components/gradient-tab';
import type { GridMode } from '@/components/grid-display';
import { GridDisplay } from '@/components/grid-display';
import { MotionControls, useMotion } from '@/components/motion-tab';
import { AnimationPalette, ScenePalette } from '@/components/palette';
import { useAudio } from '@/lib/use-audio';
import { useSocket } from '@/lib/use-socket';

const NUM_CANNONS = parseInt(process.env.NEXT_PUBLIC_NUM_CANNONS || '49', 10);
const GRID_COLUMNS = parseInt(process.env.NEXT_PUBLIC_GRID_COLUMNS || '7', 10);
const SIMULATOR_URL = process.env.NEXT_PUBLIC_SIMULATOR_URL || 'ws://localhost:3000';

const tabs: { key: GridMode; label: string }[] = [
  { key: 'paint', label: 'Paint' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'energy', label: 'Energy' },
  { key: 'drops', label: 'Drops' },
  { key: 'motion', label: 'Motion' },
  { key: 'scenes', label: 'Scenes' },
  { key: 'animations', label: 'Animations' },
  { key: 'audio', label: 'Audio' }
];

export default function Home() {
  const { connected, grid, send } = useSocket(SIMULATOR_URL);

  const [tab, setTab] = useState<GridMode>('paint');
  const [hue, setHue] = useState(220);
  const [sat, setSat] = useState(90);
  const [bright, setBright] = useState(80);
  const [brushSize, setBrushSize] = useState(1);
  const [softEdge, setSoftEdge] = useState(false);
  const [smoothness, setSmoothness] = useState(50);
  const [attack, setAttack] = useState(80);
  const [masterBright, setMasterBright] = useState(100);

  // rAF-throttled slider helper — prevents React reflow on every pointermove
  const rafRef = useRef(0);
  const throttledSlider = useCallback((handler: (v: number) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => handler(val));
    };
  }, []);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [activeAnim, setActiveAnim] = useState<string | null>(null);
  const [energyValue, setEnergyValue] = useState(80);
  const [dropsConfig, setDropsConfig] = useState({
    spectrumStart: 0,
    spectrumEnd: 180,
    speed: 5,
    decay: 5,
    width: 2
  });

  const gridData = grid.length > 0 ? grid : Array.from({ length: NUM_CANNONS }, () => ({ h: 220, s: 90, b: 80 }));

  // Audio engine (lives at page level — persists across tab switches)
  const audio = useAudio(NUM_CANNONS, GRID_COLUMNS, gridData, send);

  // Drops engine
  const { addDrop } = useDrops(NUM_CANNONS, GRID_COLUMNS, dropsConfig, send);

  // Motion engine
  const motion = useMotion(hue, sat, bright, send);

  // Gradient engine
  const gradient = useGradient();

  const handleCannon = useCallback(
    (index: number, h: number, s: number, b: number) => {
      send({ type: 'cannon', index, h, s, b });
    },
    [send]
  );

  const handleScene = useCallback(
    (name: string) => {
      setActiveScene(name);
      setActiveAnim(null);
      send({ type: 'scene', name });
    },
    [send]
  );

  const handleAnim = useCallback(
    (name: string) => {
      setActiveAnim(name);
      send({ type: 'animation', name });
    },
    [send]
  );

  const handleAnimStop = useCallback(() => {
    setActiveAnim(null);
    send({ type: 'animation', name: 'stop' });
  }, [send]);

  const handleSmooth = useCallback(
    (pct: number) => {
      setSmoothness(pct);
      const alpha = Math.pow(10, -2.7 * (pct / 100));
      send({ type: 'smoothness', value: alpha });
    },
    [send]
  );

  const handleAttack = useCallback(
    (pct: number) => {
      setAttack(pct);
      const value = 0.05 + (pct / 100) * 0.95;
      send({ type: 'attack', value });
    },
    [send]
  );

  const handleMasterBright = useCallback(
    (pct: number) => {
      setMasterBright(pct);
      send({ type: 'master_brightness', value: pct / 100 });
    },
    [send]
  );

  const handleEnergyChange = useCallback(
    (val: number) => {
      setEnergyValue(val);
      send({ type: 'master_brightness', value: val / 100 });
    },
    [send]
  );

  const handleGradientDrag = useCallback(
    (startIdx: number, endIdx: number) => {
      const startRow = Math.floor(startIdx / GRID_COLUMNS);
      const startCol = startIdx % GRID_COLUMNS;
      const endRow = Math.floor(endIdx / GRID_COLUMNS);
      const endCol = endIdx % GRID_COLUMNS;
      const dist = Math.sqrt((endRow - startRow) ** 2 + (endCol - startCol) ** 2);
      if (dist < 0.5) return;

      for (let i = 0; i < NUM_CANNONS; i++) {
        const r = Math.floor(i / GRID_COLUMNS);
        const c = i % GRID_COLUMNS;
        const proj = ((r - startRow) * (endRow - startRow) + (c - startCol) * (endCol - startCol)) / (dist * dist);
        const t = Math.max(0, Math.min(1, proj));
        const gc = gradient.colorAt(t);
        send({ type: 'cannon', index: i, h: gc.h, s: gc.s, b: gc.b });
      }
    },
    [send, gradient]
  );

  return (
    <div className="flex flex-col h-screen" style={{ background: '#050508' }}>
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: '#0c0c12', borderBottom: '1px solid #1a1a25' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-xs font-medium tracking-wider"
            style={{ color: '#888898', letterSpacing: '0.04em' }}
          >
            Wavegrid
          </span>
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: connected ? '#4a4' : '#d44' }}
          />
          {audio.state.playing && (
            <span className="text-xs animate-pulse" style={{ color: '#4a7cff' }}>
              ♪
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>
              Bright
            </span>
            <input
              type="range"
              style={{ width: 80 }}
              min={0}
              max={100}
              value={masterBright}
              onChange={throttledSlider(handleMasterBright)}
            />
            <span className="text-xs font-mono" style={{ color: '#888898', minWidth: 28, textAlign: 'right' }}>
              {masterBright}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>
              Fade
            </span>
            <input
              type="range"
              style={{ width: 80 }}
              min={0}
              max={100}
              value={smoothness}
              onChange={throttledSlider(handleSmooth)}
            />
            <span className="text-xs font-mono" style={{ color: '#888898', minWidth: 28, textAlign: 'right' }}>
              {smoothness}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>
              Attack
            </span>
            <input
              type="range"
              style={{ width: 80 }}
              min={0}
              max={100}
              value={attack}
              onChange={throttledSlider(handleAttack)}
            />
            <span className="text-xs font-mono" style={{ color: '#888898', minWidth: 28, textAlign: 'right' }}>
              {attack}
            </span>
          </div>
        </div>
      </header>

      {/* Sculpture Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ padding: 16 }}>
        <GridDisplay
          grid={gridData}
          columns={GRID_COLUMNS}
          currentHue={hue}
          currentSat={sat}
          currentBright={bright}
          mode={tab}
          brushSize={brushSize}
          softEdge={softEdge}
          motionPath={motion.state.path}
          onCannon={handleCannon}
          onDrop={addDrop}
          onMotionPoint={motion.recordPoint}
          onGradientDrag={handleGradientDrag}
        />
      </div>

      {/* Tool Dock (bottom) */}
      <div className="shrink-0" style={{ background: '#0c0c12', borderTop: '1px solid #1a1a25' }}>
        {/* Mode tabs */}
        <div
          className="flex gap-0.5 overflow-x-auto"
          style={{ padding: '8px 12px 4px', WebkitOverflowScrolling: 'touch' }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="whitespace-nowrap transition-all"
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.02em',
                background: tab === t.key ? '#12121a' : 'transparent',
                border: tab === t.key ? '1px solid #1a1a25' : '1px solid transparent',
                color: tab === t.key ? '#e8e8f0' : '#888898'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tool area */}
        <div style={{ padding: '8px 16px 16px', minHeight: 120 }}>
          {tab === 'paint' && (
            <ColorWheel
              hue={hue}
              saturation={sat}
              brightness={bright}
              brushSize={brushSize}
              softEdge={softEdge}
              onHueChange={setHue}
              onSatChange={setSat}
              onBrightChange={setBright}
              onBrushSizeChange={setBrushSize}
              onSoftEdgeChange={setSoftEdge}
            />
          )}

          {tab === 'gradient' && (
            <div className="space-y-2">
              <GradientBar
                stops={gradient.stops}
                onAdd={(pos) => gradient.addStop(pos, hue, sat, bright)}
              />
              <button
                onClick={gradient.reset}
                className="px-3 py-1 rounded-lg text-xs transition-all"
                style={{
                  background: '#12121a',
                  color: '#888898',
                  border: '1px solid #1a1a25'
                }}
              >
                Reset
              </button>
            </div>
          )}

          {tab === 'energy' && (
            <div className="space-y-2">
              <p className="text-xs" style={{ color: '#888898', letterSpacing: '0.05em' }}>ENERGY</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  className="flex-1"
                  min={0}
                  max={100}
                  value={energyValue}
                  onChange={(e) => handleEnergyChange(Number(e.target.value))}
                />
                <span className="text-sm font-mono" style={{ color: '#e8e8f0', minWidth: 36, textAlign: 'right' }}>
                  {energyValue}%
                </span>
              </div>
              <p className="text-xs" style={{ color: 'rgba(136,136,152,0.5)' }}>
                Master intensity — controls overall brightness of all lights
              </p>
            </div>
          )}

          {tab === 'drops' && (
            <DropsControls config={dropsConfig} onChange={setDropsConfig} />
          )}

          {tab === 'motion' && (
            <MotionControls
              state={motion.state}
              onRecord={motion.toggleRecord}
              onPlay={motion.togglePlay}
              onClear={motion.clear}
              onSpeed={motion.setSpeed}
            />
          )}

          {tab === 'scenes' && (
            <ScenePalette active={activeScene} onSelect={handleScene} />
          )}

          {tab === 'animations' && (
            <AnimationPalette
              active={activeAnim}
              onSelect={handleAnim}
              onStop={handleAnimStop}
            />
          )}

          {tab === 'audio' && (
            <AudioTab audio={audio} />
          )}
        </div>
      </div>
    </div>
  );
}
