'use client';

const sceneGradients: Record<string, string> = {
  civic: 'linear-gradient(135deg, #1a3a8a, #2563eb, #60a5fa)',
  pride: 'linear-gradient(135deg, #e33, #f90, #ee0, #3a5, #35e, #a3e)',
  gold: 'linear-gradient(135deg, #b8860b, #ffd700, #f0c040)',
  white: 'linear-gradient(135deg, #ccc, #fff, #ddd)',
  solstice: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
  ocean: 'linear-gradient(135deg, #0e4580, #0891b2, #22d3ee)',
  sunset: 'linear-gradient(135deg, #c2185b, #e65100, #f9a825)',
  off: 'linear-gradient(135deg, #1a1a25, #0e0e14)'
};

const animGradients: Record<string, string> = {
  wave: 'linear-gradient(135deg, #1e40af, #3b82f6)',
  breathe: 'linear-gradient(135deg, #4338ca, #6366f1)',
  rainbow: 'linear-gradient(135deg, #e33, #ee0, #3a5, #35e)',
  pacman: 'linear-gradient(135deg, #ca8a04, #facc15)',
  spiral: 'linear-gradient(135deg, #7e22ce, #a855f7)',
  rain: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
  heartbeat: 'linear-gradient(135deg, #b91c1c, #ef4444)'
};

export function ScenePalette({
  active,
  onSelect
}: {
  active: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.keys(sceneGradients).map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className="relative overflow-hidden transition-transform active:scale-93"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: sceneGradients[name],
            border: active === name ? '2px solid #fff' : '2px solid transparent'
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
            {name}
          </span>
        </button>
      ))}
    </div>
  );
}

export function AnimationPalette({
  active,
  onSelect,
  onStop
}: {
  active: string | null;
  onSelect: (name: string) => void;
  onStop: () => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {Object.keys(animGradients).map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className="relative overflow-hidden transition-transform active:scale-93"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: animGradients[name],
            border: active === name ? '2px solid #fff' : '2px solid transparent'
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
            {name}
          </span>
        </button>
      ))}
      <button
        onClick={onStop}
        className="transition-transform active:scale-93 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: '#1a1a25',
          border: '1px solid #333'
        }}
      >
        <span style={{ fontSize: 10, color: '#d44' }}>Stop</span>
      </button>
    </div>
  );
}
