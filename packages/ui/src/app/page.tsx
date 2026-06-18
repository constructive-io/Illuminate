'use client';

import { useCallback, useRef, useState } from 'react';

import { AudioTab } from '@/components/audio-tab';
import { BottomSheet, type SnapPoint } from '@/components/bottom-sheet';
import { BrightnessTab, useBrightnessAnimation } from '@/components/brightness-tab';
import { ColorWheel } from '@/components/color-wheel';
import { DropsControls, useDrops } from '@/components/drops-tab';
import { FlagsTab, useFlagAnimation } from '@/components/flags-tab';
import { GradientBar, useGradient } from '@/components/gradient-tab';
import type { GridMode } from '@/components/grid-display';
import { GridDisplay } from '@/components/grid-display';
import { MotionControls, useMotion } from '@/components/motion-tab';
import { AnimationPalette, ScenePalette } from '@/components/palette';
import { useAudio } from '@/lib/use-audio';
import { useIsPhone } from '@/lib/use-media-query';
import { useSocket } from '@/lib/use-socket';

const NUM_CANNONS = parseInt(process.env.NEXT_PUBLIC_NUM_CANNONS || '49', 10);
const GRID_COLUMNS = parseInt(process.env.NEXT_PUBLIC_GRID_COLUMNS || '7', 10);
const SIMULATOR_URL = process.env.NEXT_PUBLIC_SIMULATOR_URL || 'ws://localhost:3000';

type PanelLayout = 'bottom' | 'right';

const tabs: { key: GridMode; label: string }[] = [
  { key: 'paint', label: 'Paint' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'energy', label: 'Energy' },
  { key: 'drops', label: 'Drops' },
  { key: 'motion', label: 'Motion' },
  { key: 'scenes', label: 'Scenes' },
  { key: 'animations', label: 'Anim' },
  { key: 'flags', label: 'Flags' },
  { key: 'brightness', label: 'Bright' },
  { key: 'audio', label: 'Audio' }
];

/* ---------- Tool content (no tabs, just the active tool) ---------- */

function ToolContent({
  tab,
  hue, sat, bright, brushSize, softEdge,
  setHue, setSat, setBright, setBrushSize, setSoftEdge,
  gradient, dropsConfig, setDropsConfig,
  energyValue, handleEnergyChange,
  motion, activeScene, handleScene,
  activeAnim, handleAnim, handleAnimStop,
  flags, brightness, audio,
  isPhone
}: {
  tab: GridMode;
  hue: number; sat: number; bright: number; brushSize: number; softEdge: boolean;
  setHue: (v: number) => void; setSat: (v: number) => void; setBright: (v: number) => void;
  setBrushSize: (v: number) => void; setSoftEdge: (v: boolean) => void;
  gradient: ReturnType<typeof useGradient>;
  dropsConfig: { spectrumStart: number; spectrumEnd: number; speed: number; decay: number; width: number };
  setDropsConfig: (c: typeof dropsConfig) => void;
  energyValue: number;
  handleEnergyChange: (v: number) => void;
  motion: ReturnType<typeof useMotion>;
  activeScene: string | null;
  handleScene: (name: string) => void;
  activeAnim: string | null;
  handleAnim: (name: string) => void;
  handleAnimStop: () => void;
  flags: ReturnType<typeof useFlagAnimation>;
  brightness: ReturnType<typeof useBrightnessAnimation>;
  audio: ReturnType<typeof useAudio>;
  isPhone: boolean;
}) {
  return (
    <>
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
          compact={isPhone}
        />
      )}

      {tab === 'gradient' && (
        <div className="space-y-3">
          <GradientBar
            stops={gradient.stops}
            onAdd={(pos) => gradient.addStop(pos, hue, sat, bright)}
          />
          <button
            onClick={gradient.reset}
            className="px-4 py-2.5 rounded-lg text-sm transition-all"
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
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: '#888898', letterSpacing: '0.05em' }}>ENERGY</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              className="flex-1"
              min={0}
              max={100}
              value={energyValue}
              onChange={(e) => handleEnergyChange(Number(e.target.value))}
            />
            <span className="text-base font-mono" style={{ color: '#e8e8f0', minWidth: 44, textAlign: 'right' }}>
              {energyValue}%
            </span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(136,136,152,0.5)' }}>
            Master intensity — controls overall brightness
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

      {tab === 'flags' && (
        <FlagsTab
          activeFlag={flags.activeFlag}
          effect={flags.effect}
          purpleBlack={flags.purpleBlack}
          onSelectFlag={flags.selectFlag}
          onEffect={flags.setEffect}
          onPurpleBlack={flags.setPurpleBlack}
        />
      )}

      {tab === 'brightness' && (
        <BrightnessTab
          config={brightness.config}
          onMode={brightness.setMode}
          onSpeed={brightness.setSpeed}
          onIntensity={brightness.setIntensity}
          onResnapshot={brightness.resnapshot}
        />
      )}

      {tab === 'audio' && (
        <AudioTab audio={audio} />
      )}
    </>
  );
}

/* ---------- Tab strip ---------- */

function TabStrip({
  tab,
  setTab,
  variant
}: {
  tab: GridMode;
  setTab: (t: GridMode) => void;
  variant: 'phone' | 'bottom' | 'right';
}) {
  const isPhone = variant === 'phone';
  const isRight = variant === 'right';

  return (
    <div
      className={isRight ? 'flex flex-wrap gap-1 shrink-0' : 'flex gap-1 overflow-x-auto shrink-0'}
      style={{
        padding: isRight ? '10px 10px 6px' : '8px 12px 6px',
        ...(isRight ? {} : { WebkitOverflowScrolling: 'touch' as const })
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setTab(t.key)}
          className="whitespace-nowrap transition-all"
          style={{
            padding: isPhone ? '10px 16px' : isRight ? '8px 12px' : '10px 18px',
            borderRadius: 22,
            fontSize: isPhone ? 14 : isRight ? 12 : 14,
            fontWeight: 600,
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
  );
}

/* ---------- Desktop/tablet ToolPanel (non-phone) ---------- */

function ToolPanel({
  tab,
  setTab,
  layout,
  toolContentProps
}: {
  tab: GridMode;
  setTab: (t: GridMode) => void;
  layout: PanelLayout;
  toolContentProps: Omit<React.ComponentProps<typeof ToolContent>, 'tab'>;
}) {
  const isRight = layout === 'right';

  return (
    <div
      className={isRight ? 'flex flex-col h-full' : ''}
      style={{
        background: '#0c0c12',
        ...(isRight
          ? { borderLeft: '1px solid #1a1a25', width: 360 }
          : { borderTop: '1px solid #1a1a25' })
      }}
    >
      <TabStrip tab={tab} setTab={setTab} variant={isRight ? 'right' : 'bottom'} />

      <div
        className={isRight ? 'flex-1 overflow-y-auto' : ''}
        style={{ padding: isRight ? '8px 14px 14px' : '8px 16px 20px', minHeight: isRight ? 0 : 140 }}
      >
        <ToolContent tab={tab} {...toolContentProps} />
      </div>
    </div>
  );
}

/* ---------- Master sliders (top bar on desktop, expandable on phone) ---------- */

function MasterSliders({
  masterBright,
  smoothness,
  attack,
  onMasterBright,
  onSmooth,
  onAttack,
  throttledSlider,
  vertical
}: {
  masterBright: number;
  smoothness: number;
  attack: number;
  onMasterBright: (v: number) => void;
  onSmooth: (v: number) => void;
  onAttack: (v: number) => void;
  throttledSlider: (handler: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  vertical?: boolean;
}) {
  const sliders = [
    { label: 'Bright', value: masterBright, handler: onMasterBright },
    { label: 'Fade', value: smoothness, handler: onSmooth },
    { label: 'Attack', value: attack, handler: onAttack }
  ];

  if (vertical) {
    return (
      <div className="space-y-4 p-4">
        {sliders.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: '#888898', minWidth: 56 }}>
              {s.label}
            </span>
            <input
              type="range"
              className="flex-1"
              min={0}
              max={100}
              value={s.value}
              onChange={throttledSlider(s.handler)}
            />
            <span className="text-sm font-mono" style={{ color: '#888898', minWidth: 32, textAlign: 'right' }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {sliders.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
            {s.label}
          </span>
          <input
            type="range"
            style={{ width: 100 }}
            min={0}
            max={100}
            value={s.value}
            onChange={throttledSlider(s.handler)}
          />
          <span className="text-xs font-mono" style={{ color: '#888898', minWidth: 28, textAlign: 'right' }}>
            {s.value}
          </span>
        </div>
      ))}
    </>
  );
}

/* ---------- Main page ---------- */

export default function Home() {
  const { connected, grid, send } = useSocket(SIMULATOR_URL);
  const isPhone = useIsPhone();

  const [tab, setTab] = useState<GridMode>('paint');
  const [layout, setLayout] = useState<PanelLayout>('bottom');
  const [hue, setHue] = useState(220);
  const [sat, setSat] = useState(90);
  const [bright, setBright] = useState(80);
  const [brushSize, setBrushSize] = useState(1);
  const [softEdge, setSoftEdge] = useState(false);
  const [smoothness, setSmoothness] = useState(50);
  const [attack, setAttack] = useState(80);
  const [masterBright, setMasterBright] = useState(100);
  const [sheetSnap, setSheetSnap] = useState<SnapPoint>('peek');
  const [showMasterSliders, setShowMasterSliders] = useState(false);

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

  const audio = useAudio(NUM_CANNONS, GRID_COLUMNS, gridData, send);
  const { addDrop } = useDrops(NUM_CANNONS, GRID_COLUMNS, dropsConfig, send);
  const motion = useMotion(hue, sat, bright, send);
  const gradient = useGradient();

  const handleCannon = useCallback(
    (index: number, h: number, s: number, b: number) => {
      send({ type: 'cannon', index, h, s, b });
    },
    [send]
  );

  const flags = useFlagAnimation(send);
  const brightness = useBrightnessAnimation(NUM_CANNONS, GRID_COLUMNS, gridData, send);

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

  const handleTabChange = useCallback((t: GridMode) => {
    setTab(t);
    if (isPhone && sheetSnap === 'peek') {
      setSheetSnap('half');
    }
  }, [isPhone, sheetSnap]);

  const toolContentProps = {
    hue, sat, bright, brushSize, softEdge,
    setHue, setSat, setBright, setBrushSize, setSoftEdge,
    gradient, dropsConfig, setDropsConfig,
    energyValue, handleEnergyChange,
    motion, activeScene, handleScene,
    activeAnim, handleAnim, handleAnimStop,
    flags, brightness, audio,
    isPhone
  };

  /* ---------- PHONE LAYOUT ---------- */
  if (isPhone) {
    return (
      <div className="flex flex-col h-screen" style={{ background: '#050508' }}>
        {/* Minimal top bar */}
        <header
          className="flex items-center justify-between px-4 py-2 shrink-0"
          style={{ background: '#0c0c12', borderBottom: '1px solid #1a1a25' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#888898' }}>Wavegrid</span>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: connected ? '#4a4' : '#d44' }}
            />
            {audio.state.playing && (
              <span className="text-sm animate-pulse" style={{ color: '#4a7cff' }}>♪</span>
            )}
          </div>
          <button
            onClick={() => setShowMasterSliders(!showMasterSliders)}
            className="flex items-center justify-center transition-all"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: showMasterSliders ? 'rgba(74,124,255,0.15)' : '#12121a',
              border: `1px solid ${showMasterSliders ? '#4a7cff' : '#1a1a25'}`,
              color: showMasterSliders ? '#4a7cff' : '#888898',
              fontSize: 18
            }}
          >
            ≡
          </button>
        </header>

        {/* Expandable master sliders */}
        {showMasterSliders && (
          <div style={{ background: '#0c0c12', borderBottom: '1px solid #1a1a25' }}>
            <MasterSliders
              masterBright={masterBright}
              smoothness={smoothness}
              attack={attack}
              onMasterBright={handleMasterBright}
              onSmooth={handleSmooth}
              onAttack={handleAttack}
              throttledSlider={throttledSlider}
              vertical
            />
          </div>
        )}

        {/* Grid canvas — takes remaining space above the sheet */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{ padding: 12, paddingBottom: 88 }}
        >
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

        {/* Bottom sheet */}
        <BottomSheet snap={sheetSnap} onSnapChange={setSheetSnap}>
          <TabStrip tab={tab} setTab={handleTabChange} variant="phone" />
          <div style={{ padding: '4px 16px 24px' }}>
            <ToolContent tab={tab} {...toolContentProps} />
          </div>
        </BottomSheet>
      </div>
    );
  }

  /* ---------- TABLET / DESKTOP LAYOUT ---------- */
  return (
    <div className="flex flex-col h-screen" style={{ background: '#050508' }}>
      {/* Top Bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ background: '#0c0c12', borderBottom: '1px solid #1a1a25' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-medium tracking-wider"
            style={{ color: '#888898', letterSpacing: '0.04em' }}
          >
            Wavegrid
          </span>
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: connected ? '#4a4' : '#d44' }}
          />
          {audio.state.playing && (
            <span className="text-sm animate-pulse" style={{ color: '#4a7cff' }}>♪</span>
          )}
        </div>
        <div className="flex items-center gap-5">
          <MasterSliders
            masterBright={masterBright}
            smoothness={smoothness}
            attack={attack}
            onMasterBright={handleMasterBright}
            onSmooth={handleSmooth}
            onAttack={handleAttack}
            throttledSlider={throttledSlider}
          />

          {/* Layout toggle */}
          <button
            onClick={() => setLayout((l) => l === 'bottom' ? 'right' : 'bottom')}
            className="flex items-center justify-center transition-all"
            title={layout === 'bottom' ? 'Panel: right side' : 'Panel: bottom'}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#12121a',
              border: '1px solid #1a1a25',
              color: '#888898',
              fontSize: 16
            }}
          >
            {layout === 'bottom' ? '⊟' : '⊞'}
          </button>
        </div>
      </header>

      {/* Main content: canvas + tool panel */}
      <div className={`flex-1 flex ${layout === 'right' ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        {/* Grid Canvas */}
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

        {/* Tool Panel */}
        <div className={layout === 'right' ? 'shrink-0 h-full' : 'shrink-0'}>
          <ToolPanel
            tab={tab}
            setTab={setTab}
            layout={layout}
            toolContentProps={toolContentProps}
          />
        </div>
      </div>
    </div>
  );
}
