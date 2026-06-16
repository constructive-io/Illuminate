'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ROWS = 7;
const COLS = 7;

type HSB = [number, number, number];

interface FlagDef {
  name: string;
  gradient: string;
  pattern: (row: number, col: number) => HSB;
}

// Common flag colors in HSB [hue, saturation, brightness]
const RED: HSB = [0, 100, 80];
const WHITE: HSB = [0, 0, 100];
const BLUE: HSB = [220, 100, 70];
const BLACK: HSB = [0, 0, 5];
const GREEN: HSB = [140, 100, 40];
const YELLOW: HSB = [50, 100, 100];
const GOLD: HSB = [45, 100, 80];
const SKY_BLUE: HSB = [200, 55, 85];
const DARK_GREEN: HSB = [150, 100, 30];
const NAVY: HSB = [230, 80, 35];
const DARK_RED: HSB = [350, 90, 55];
const BRIGHT_GREEN: HSB = [120, 100, 50];
const DARK_PURPLE: HSB = [270, 80, 25];

function hStripes(bands: [HSB, number][]): (row: number, col: number) => HSB {
  const map: HSB[] = [];
  for (const [color, count] of bands) {
    for (let i = 0; i < count; i++) map.push(color);
  }
  return (row) => map[Math.min(row, map.length - 1)];
}

function vStripes(bands: [HSB, number][]): (row: number, col: number) => HSB {
  const map: HSB[] = [];
  for (const [color, count] of bands) {
    for (let i = 0; i < count; i++) map.push(color);
  }
  return (_, col) => map[Math.min(col, map.length - 1)];
}

const FLAGS: FlagDef[] = [
  {
    name: 'Argentina',
    gradient: 'linear-gradient(180deg, #74ACDF 0%, #74ACDF 33%, #fff 33%, #fff 66%, #74ACDF 66%)',
    pattern: hStripes([[SKY_BLUE, 2], [WHITE, 3], [SKY_BLUE, 2]])
  },
  {
    name: 'Austria',
    gradient: 'linear-gradient(180deg, #ED2939 0%, #ED2939 33%, #fff 33%, #fff 66%, #ED2939 66%)',
    pattern: hStripes([[RED, 2], [WHITE, 3], [RED, 2]])
  },
  {
    name: 'Brazil',
    gradient: 'linear-gradient(135deg, #009739, #FEDD00, #009739)',
    pattern: (row, col) => {
      const cr = 3, cc = 3;
      const dist = Math.abs(row - cr) / 3 + Math.abs(col - cc) / 3;
      if (dist <= 0.85) {
        const circDist = Math.sqrt((row - cr) ** 2 + (col - cc) ** 2);
        if (circDist <= 1.2) return [220, 90, 50];
        return YELLOW;
      }
      return GREEN;
    }
  },
  {
    name: 'Egypt',
    gradient: 'linear-gradient(180deg, #CE1126 0%, #CE1126 33%, #fff 33%, #fff 66%, #000 66%)',
    pattern: hStripes([[RED, 2], [WHITE, 3], [BLACK, 2]])
  },
  {
    name: 'England',
    gradient: 'linear-gradient(180deg, #fff 42%, #CE1124 42%, #CE1124 58%, #fff 58%)',
    pattern: (row, col) => {
      if (row === 3 || col === 3) return RED;
      return WHITE;
    }
  },
  {
    name: 'France',
    gradient: 'linear-gradient(90deg, #002395 0%, #002395 33%, #fff 33%, #fff 66%, #ED2939 66%)',
    pattern: vStripes([[BLUE, 2], [WHITE, 3], [RED, 2]])
  },
  {
    name: 'Germany',
    gradient: 'linear-gradient(180deg, #000 0%, #000 33%, #DD0000 33%, #DD0000 66%, #FFCC00 66%)',
    pattern: hStripes([[BLACK, 2], [RED, 3], [GOLD, 2]])
  },
  {
    name: 'Italy',
    gradient: 'linear-gradient(90deg, #008C45 0%, #008C45 33%, #fff 33%, #fff 66%, #CD212A 66%)',
    pattern: vStripes([[GREEN, 2], [WHITE, 3], [RED, 2]])
  },
  {
    name: 'Japan',
    gradient: 'radial-gradient(circle, #BC002D 30%, #fff 30%)',
    pattern: (row, col) => {
      const dist = Math.sqrt((row - 3) ** 2 + (col - 3) ** 2);
      return dist <= 1.8 ? [0, 100, 70] : WHITE;
    }
  },
  {
    name: 'Jordan',
    gradient: 'linear-gradient(180deg, #000 0%, #000 33%, #fff 33%, #fff 66%, #007A3D 66%)',
    pattern: (row, col) => {
      // Black, white, green horizontal stripes with red chevron on left
      if (col <= 2) {
        const midRow = 3;
        const chevronDist = Math.abs(row - midRow);
        if (chevronDist <= col + 1) return RED;
      }
      if (row <= 1) return BLACK;
      if (row <= 4) return WHITE;
      return [150, 100, 30];
    }
  },
  {
    name: 'Mexico',
    gradient: 'linear-gradient(90deg, #006847 0%, #006847 33%, #fff 33%, #fff 66%, #CE1126 66%)',
    pattern: vStripes([[DARK_GREEN, 2], [WHITE, 3], [RED, 2]])
  },
  {
    name: 'Morocco',
    gradient: 'linear-gradient(135deg, #C1272D, #006233, #C1272D)',
    pattern: (row, col) => {
      const dist = Math.sqrt((row - 3) ** 2 + (col - 3) ** 2);
      if (dist <= 1.6) return BRIGHT_GREEN;
      return DARK_RED;
    }
  },
  {
    name: 'New Zealand',
    gradient: 'linear-gradient(135deg, #00247D, #CC142B, #00247D)',
    pattern: (row, col) => {
      if (row <= 2 && col <= 2) {
        if (row === 1 || col === 1) return RED;
        return NAVY;
      }
      if ((row === 1 && col === 5) || (row === 2 && col === 6) ||
          (row === 4 && col === 5) || (row === 5 && col === 6)) return RED;
      return NAVY;
    }
  },
  {
    name: 'Portugal',
    gradient: 'linear-gradient(90deg, #006600 0%, #006600 40%, #FF0000 40%)',
    pattern: vStripes([[GREEN, 3], [RED, 4]])
  },
  {
    name: 'Saudi Arabia',
    gradient: 'linear-gradient(180deg, #006C35, #006C35)',
    pattern: (row, col) => {
      if (row >= 2 && row <= 4 && col >= 1 && col <= 5) return WHITE;
      return [140, 100, 35];
    }
  },
  {
    name: 'South Africa',
    gradient: 'linear-gradient(180deg, #E03C31 0%, #E03C31 17%, #fff 17%, #fff 22%, #007749 22%, #007749 50%, #FFB81C 50%, #FFB81C 55%, #001489 55%, #001489 78%, #fff 78%, #fff 83%, #E03C31 83%)',
    pattern: (row, col) => {
      if (col <= 1) {
        if (row === 3) return BRIGHT_GREEN;
        if (row === 2 || row === 4) return YELLOW;
        return row < 3 ? RED : BLUE;
      }
      if (row <= 1) return RED;
      if (row === 2) return WHITE;
      if (row === 3) return BRIGHT_GREEN;
      if (row === 4) return YELLOW;
      if (row >= 5) return BLUE;
      return WHITE;
    }
  },
  {
    name: 'South Korea',
    gradient: 'radial-gradient(circle, #CD2E3A 25%, #0047A0 25% 50%, #fff 50%)',
    pattern: (row, col) => {
      const dist = Math.sqrt((row - 3) ** 2 + (col - 3) ** 2);
      if (dist <= 1.5) {
        return row <= 3 ? [0, 90, 75] : [215, 100, 55];
      }
      if ((row <= 1 && col <= 1) || (row <= 1 && col >= 5) ||
          (row >= 5 && col <= 1) || (row >= 5 && col >= 5)) return BLACK;
      return WHITE;
    }
  },
  {
    name: 'Spain',
    gradient: 'linear-gradient(180deg, #AA151B 0%, #AA151B 25%, #F1BF00 25%, #F1BF00 75%, #AA151B 75%)',
    pattern: hStripes([[RED, 2], [YELLOW, 3], [RED, 2]])
  },
  {
    name: 'Tunisia',
    gradient: 'radial-gradient(circle, #fff 25%, #E70013 25%)',
    pattern: (row, col) => {
      const dist = Math.sqrt((row - 3) ** 2 + (col - 3) ** 2);
      if (dist <= 1.8) return WHITE;
      return RED;
    }
  },
  {
    name: 'UAE',
    gradient: 'linear-gradient(180deg, #00732F 0%, #00732F 25%, #fff 25%, #fff 50%, #000 50%, #000 75%, #FF0000 75%)',
    pattern: (row, col) => {
      if (col <= 1) return RED;
      if (row <= 1) return GREEN;
      if (row <= 3) return WHITE;
      if (row <= 4) return BLACK;
      return [0, 0, 5];
    }
  },
  {
    name: 'United States',
    gradient: 'linear-gradient(180deg, #B22234 0%, #B22234 15%, #fff 15%, #fff 23%, #B22234 23%, #B22234 38%, #fff 38%, #fff 46%, #B22234 46%, #B22234 62%, #fff 62%, #fff 69%, #B22234 69%)',
    pattern: (row, col) => {
      if (row <= 2 && col <= 2) return [220, 90, 50];
      return row % 2 === 0 ? [0, 95, 65] : WHITE;
    }
  }
];

type FlagEffect = 'none' | 'spin' | 'ripple' | 'wave';

function isBlack(hsb: HSB): boolean {
  return hsb[2] <= 10;
}

function applyEffects(
  baseGrid: HSB[][],
  time: number,
  effect: FlagEffect,
  purpleBlack: boolean
): { index: number; h: number; s: number; b: number }[] {
  const cells: { index: number; h: number; s: number; b: number }[] = [];
  const cx = 3, cy = 3;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let [h, s, b] = baseGrid[r][c];

      // Swap black → dark purple if toggled
      if (purpleBlack && isBlack(baseGrid[r][c])) {
        [h, s, b] = DARK_PURPLE;
      }

      switch (effect) {
      case 'spin': {
        // Sample from rotated coordinates
        const angle = time * 0.4;
        const dr = r - cy, dc = c - cx;
        const sr = Math.round(cy + dr * Math.cos(angle) - dc * Math.sin(angle));
        const sc = Math.round(cx + dr * Math.sin(angle) + dc * Math.cos(angle));
        const cr = ((sr % ROWS) + ROWS) % ROWS;
        const cc = ((sc % COLS) + COLS) % COLS;
        [h, s, b] = baseGrid[cr][cc];
        if (purpleBlack && isBlack(baseGrid[cr][cc])) {
          [h, s, b] = DARK_PURPLE;
        }
        break;
      }
      case 'ripple': {
        // Radial sine wave brightness modulation
        const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
        const wave = 0.5 + 0.5 * Math.sin(dist * 1.5 - time * 2.5);
        b = Math.max(5, b * (0.4 + 0.6 * wave));
        break;
      }
      case 'wave': {
        // Horizontal sine wave — shifts hue slightly and modulates brightness
        const phase = Math.sin((c / COLS) * Math.PI * 2 - time * 2);
        b = Math.max(5, b * (0.5 + 0.5 * phase));
        h = (h + phase * 15 + 360) % 360;
        break;
      }
      default:
        break;
      }

      cells.push({ index: r * COLS + c, h, s, b: Math.round(b) });
    }
  }
  return cells;
}

function buildBaseGrid(flag: FlagDef): HSB[][] {
  const grid: HSB[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: HSB[] = [];
    for (let c = 0; c < COLS; c++) {
      row.push(flag.pattern(r, c));
    }
    grid.push(row);
  }
  return grid;
}

const EFFECTS: { key: FlagEffect; label: string }[] = [
  { key: 'none', label: 'Static' },
  { key: 'spin', label: 'Spin' },
  { key: 'ripple', label: 'Ripple' },
  { key: 'wave', label: 'Wave' }
];

export function useFlagAnimation(
  send: (msg: Record<string, unknown>) => void
) {
  const [activeFlag, setActiveFlag] = useState<string | null>(null);
  const [effect, setEffect] = useState<FlagEffect>('none');
  const [purpleBlack, setPurpleBlack] = useState(false);
  const baseGridRef = useRef<HSB[][] | null>(null);
  const rafRef = useRef(0);
  const startTimeRef = useRef(0);
  const activeRef = useRef(false);

  const sendCells = useCallback((cells: { index: number; h: number; s: number; b: number }[]) => {
    for (const c of cells) {
      send({ type: 'cannon', index: c.index, h: c.h, s: c.s, b: c.b });
    }
  }, [send]);

  // Start/stop the animation loop
  useEffect(() => {
    const grid = baseGridRef.current;
    if (!grid || !activeRef.current) return;

    if (effect === 'none') {
      // Send static frame once
      const cells = applyEffects(grid, 0, 'none', purpleBlack);
      sendCells(cells);
      return;
    }

    startTimeRef.current = performance.now() / 1000;
    let running = true;

    const tick = () => {
      if (!running || !baseGridRef.current) return;
      const t = performance.now() / 1000 - startTimeRef.current;
      const cells = applyEffects(baseGridRef.current, t, effect, purpleBlack);
      sendCells(cells);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [effect, purpleBlack, sendCells]);

  const selectFlag = useCallback((name: string, flag: FlagDef) => {
    setActiveFlag(name);
    const grid = buildBaseGrid(flag);
    baseGridRef.current = grid;
    activeRef.current = true;

    // Send initial frame
    const cells = applyEffects(grid, 0, effect, purpleBlack);
    sendCells(cells);

    // If animated, the effect will kick in via useEffect
    // Force re-trigger by toggling effect dependency
    if (effect !== 'none') {
      setEffect((e) => e); // no-op to keep current, but useEffect already handles it
    }
  }, [effect, purpleBlack, sendCells]);

  const stop = useCallback(() => {
    activeRef.current = false;
    baseGridRef.current = null;
    setActiveFlag(null);
    cancelAnimationFrame(rafRef.current);
  }, []);

  return { activeFlag, effect, setEffect, purpleBlack, setPurpleBlack, selectFlag, stop };
}

export function FlagsTab({
  activeFlag,
  effect,
  purpleBlack,
  onSelectFlag,
  onEffect,
  onPurpleBlack
}: {
  activeFlag: string | null;
  effect: FlagEffect;
  purpleBlack: boolean;
  onSelectFlag: (name: string, flag: FlagDef) => void;
  onEffect: (e: FlagEffect) => void;
  onPurpleBlack: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Flag swatches */}
      <div className="flex gap-2 flex-wrap">
        {FLAGS.map((flag) => (
          <button
            key={flag.name}
            onClick={() => onSelectFlag(flag.name, flag)}
            className="relative overflow-hidden transition-transform active:scale-93"
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: flag.gradient,
              border: activeFlag === flag.name ? '2px solid #fff' : '2px solid transparent'
            }}
          >
            <span
              className="absolute bottom-0.5 left-0 right-0 text-center text-white font-semibold"
              style={{
                fontSize: 7,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                letterSpacing: '0.02em'
              }}
            >
              {flag.name}
            </span>
          </button>
        ))}
      </div>

      {/* Effect toggles */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <span className="text-xs" style={{ color: '#888898', letterSpacing: '0.05em' }}>FX</span>
        {EFFECTS.map((fx) => (
          <button
            key={fx.key}
            onClick={() => onEffect(fx.key)}
            className="transition-all"
            style={{
              padding: '5px 12px',
              borderRadius: 16,
              fontSize: 11,
              fontWeight: 500,
              background: effect === fx.key ? '#1a1a2e' : 'transparent',
              border: effect === fx.key ? '1px solid #333' : '1px solid #1a1a25',
              color: effect === fx.key ? '#e8e8f0' : '#666'
            }}
          >
            {fx.label}
          </button>
        ))}
      </div>

      {/* Dark purple toggle */}
      <button
        onClick={() => onPurpleBlack(!purpleBlack)}
        className="flex items-center gap-2 transition-all"
        style={{
          padding: '5px 12px',
          borderRadius: 16,
          fontSize: 11,
          fontWeight: 500,
          background: purpleBlack ? '#2a1a3e' : 'transparent',
          border: purpleBlack ? '1px solid #5a3a7e' : '1px solid #1a1a25',
          color: purpleBlack ? '#c8a0f0' : '#666'
        }}
      >
        <span style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: purpleBlack ? '#7b2ff7' : '#222',
          border: '1px solid #444'
        }} />
        Black → Purple
      </button>
    </div>
  );
}
