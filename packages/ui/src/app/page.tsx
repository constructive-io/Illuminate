'use client';

import { useCallback, useState } from 'react';

import { AudioTab } from '@/components/audio-tab';
import { ColorPicker } from '@/components/controls';
import { GridDisplay } from '@/components/grid-display';
import { AnimationPalette, ScenePalette } from '@/components/palette';
import { useSocket } from '@/lib/use-socket';

const NUM_CANNONS = parseInt(process.env.NEXT_PUBLIC_NUM_CANNONS || '49', 10);
const GRID_COLUMNS = parseInt(process.env.NEXT_PUBLIC_GRID_COLUMNS || '7', 10);
const SIMULATOR_URL = process.env.NEXT_PUBLIC_SIMULATOR_URL || 'ws://localhost:3000';

type Tab = 'paint' | 'scenes' | 'animations' | 'audio';

export default function Home() {
  const { connected, grid, send } = useSocket(SIMULATOR_URL);

  const [tab, setTab] = useState<Tab>('paint');
  const [hue, setHue] = useState(220);
  const [sat, setSat] = useState(90);
  const [bright, setBright] = useState(80);
  const [smoothness, setSmoothness] = useState(50);
  const [attack, setAttack] = useState(80);
  const [masterBright, setMasterBright] = useState(100);
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [activeAnim, setActiveAnim] = useState<string | null>(null);

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'paint', label: 'Paint' },
    { key: 'scenes', label: 'Scenes' },
    { key: 'animations', label: 'Animations' },
    { key: 'audio', label: 'Audio' }
  ];

  return (
    <div className="flex flex-col h-screen" style={{ background: '#050508' }}>
      {/* ─── Top Bar ─── */}
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
              onChange={(e) => handleMasterBright(Number(e.target.value))}
            />
            <span className="text-xs font-mono" style={{ color: '#888898', minWidth: 28, textAlign: 'right' }}>
              {masterBright}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>
              Smooth
            </span>
            <input
              type="range"
              style={{ width: 80 }}
              min={0}
              max={100}
              value={smoothness}
              onChange={(e) => handleSmooth(Number(e.target.value))}
            />
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
              onChange={(e) => handleAttack(Number(e.target.value))}
            />
          </div>
        </div>
      </header>

      {/* ─── Sculpture Canvas ─── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ padding: 16 }}>
        <GridDisplay
          grid={grid.length > 0 ? grid : Array.from({ length: NUM_CANNONS }, () => ({ h: 220, s: 90, b: 80 }))}
          columns={GRID_COLUMNS}
          currentHue={hue}
          currentSat={sat}
          currentBright={bright}
          onCannon={handleCannon}
        />
      </div>

      {/* ─── Tool Dock (bottom) ─── */}
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
            <div className="flex items-center gap-4">
              <ColorPicker
                hue={hue}
                saturation={sat}
                brightness={bright}
                onHueChange={setHue}
                onSatChange={setSat}
                onBrightChange={setBright}
              />
            </div>
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
            <AudioTab
              numCannons={NUM_CANNONS}
              gridColumns={GRID_COLUMNS}
              grid={grid.length > 0 ? grid : Array.from({ length: NUM_CANNONS }, () => ({ h: 0, s: 0, b: 0 }))}
              send={send}
            />
          )}
        </div>
      </div>
    </div>
  );
}
