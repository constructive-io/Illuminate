import { useState } from 'react';

import { ANIMATION_SOURCES, SCENE_SOURCES } from '@/lib/preview-sources';

import { MiniGridPreview } from './mini-grid-preview';

const TILE = 72;
const TILE_EXPANDED = 96;
const TILE_RADIUS = 16;
const LABEL_SIZE = 10;

const sceneGradients: Record<string, string> = {
  civic: 'linear-gradient(135deg, #1a3a8a, #2563eb, #60a5fa)',
  pride: 'linear-gradient(135deg, #e33, #f90, #ee0, #3a5, #35e, #a3e)',
  gold: 'linear-gradient(135deg, #b8860b, #ffd700, #f0c040)',
  white: 'linear-gradient(135deg, #ccc, #fff, #ddd)',
  solstice: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
  ocean: 'linear-gradient(135deg, #0e4580, #0891b2, #22d3ee)',
  sunset: 'linear-gradient(135deg, #c2185b, #e65100, #f9a825)',
  heart: 'radial-gradient(circle at 50% 40%, #ef4444, #b91c1c, #1a1a25)',
  sf: 'linear-gradient(135deg, #1a3a8a, #ffd700, #1a3a8a)',
  forest: 'linear-gradient(to top, #14532d, #22c55e, #86efac)',
  fire: 'linear-gradient(to top, #fbbf24, #f97316, #b91c1c)',
  night: 'linear-gradient(135deg, #0f172a, #1e3a5f, #0f172a)',
  checker: 'repeating-conic-gradient(#ccc 0% 25%, #3b82f6 0% 50%) 50% / 36px 36px',
  off: 'linear-gradient(135deg, #1a1a25, #0e0e14)'
};

const animGradients: Record<string, string> = {
  wave: 'linear-gradient(135deg, #1e40af, #3b82f6)',
  breathe: 'linear-gradient(135deg, #4338ca, #6366f1)',
  rainbow: 'linear-gradient(135deg, #e33, #ee0, #3a5, #35e)',
  pacman: 'linear-gradient(135deg, #ca8a04, #facc15)',
  spiral: [
    'radial-gradient(circle at 50% 50%, #05070d 0 16%, rgba(5, 7, 13, 0.72) 17%, transparent 27%)',
    'repeating-conic-gradient(from 18deg at 50% 50%, #05070d 0deg 18deg, #e40303 20deg, #ff8c00 29deg, #ffed00 38deg, #008026 47deg, #24408e 56deg, #732982 66deg, #05070d 78deg 120deg)'
  ].join(', '),
  rain: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
  'i-heart-sf': 'linear-gradient(135deg, #ffd700, #ef4444, #1a3a8a)',
  'heart-breathe': 'radial-gradient(circle at 50% 40%, #ef4444, #b91c1c, #1a1a25)',
  'pride-flow': 'linear-gradient(180deg, #e40303, #ff8c00, #ffed00, #008026, #24408e, #732982)',
  'pride-breathe': 'linear-gradient(135deg, #e40303, #ff8c00, #ffed00, #008026, #24408e)',
  'pride-rotate': 'linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #24408e, #732982)',
  'pride-ring': 'conic-gradient(from 0deg, #e40303, #ff8c00, #ffed00, #008026, #24408e, #732982, #e40303)'
};

function Tile({
  name,
  gradient,
  active,
  onClick,
  previewSource,
  previewSpeed,
  showPreview
}: {
  name: string;
  gradient: string;
  active: boolean;
  onClick: () => void;
  previewSource?: string;
  previewSpeed?: number;
  showPreview?: boolean;
}) {
  const tileSize = showPreview ? TILE_EXPANDED : TILE;
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-all active:scale-93"
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: TILE_RADIUS,
        background: showPreview ? '#0a0a12' : gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
      }}
    >
      {showPreview && previewSource ? (
        <MiniGridPreview
          source={previewSource}
          speed={previewSpeed}
          size={tileSize}
        />
      ) : null}
      <span
        className="absolute bottom-1 left-0 right-0 text-center text-white font-semibold"
        style={{
          fontSize: LABEL_SIZE,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.03em'
        }}
      >
        {name}
      </span>
    </button>
  );
}

function PreviewToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
      style={{
        background: enabled ? '#2563eb' : '#1a1a25',
        color: enabled ? '#fff' : '#888898',
        border: '1px solid ' + (enabled ? '#3b82f6' : '#2a2a35')
      }}
      title={enabled ? 'Hide previews' : 'Show animated previews'}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {enabled ? (
          <>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </>
        )}
      </svg>
      Preview
    </button>
  );
}

export function ScenePalette({
  active,
  onSelect
}: {
  active: string | null;
  onSelect: (name: string) => void;
}) {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-end">
        <PreviewToggle enabled={showPreview} onToggle={() => setShowPreview(!showPreview)} />
      </div>
      <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 360 : undefined }}>
        {Object.keys(sceneGradients).map((name) => (
          <Tile
            key={name}
            name={name}
            gradient={sceneGradients[name]}
            active={active === name}
            onClick={() => onSelect(name)}
            previewSource={SCENE_SOURCES[name]}
            showPreview={showPreview}
          />
        ))}
      </div>
    </div>
  );
}

export function AnimationPalette({
  active,
  onSelect,
  speed
}: {
  active: string | null;
  onSelect: (name: string) => void;
  speed?: number;
}) {
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-end">
        <PreviewToggle enabled={showPreview} onToggle={() => setShowPreview(!showPreview)} />
      </div>
      <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 360 : undefined }}>
        {Object.keys(animGradients).map((name) => (
          <Tile
            key={name}
            name={name}
            gradient={animGradients[name]}
            active={active === name}
            onClick={() => onSelect(name)}
            previewSource={ANIMATION_SOURCES[name]}
            previewSpeed={speed}
            showPreview={showPreview}
          />
        ))}
      </div>
    </div>
  );
}
