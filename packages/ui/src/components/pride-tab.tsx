import { useCallback, useState } from 'react';

import { ControlGrid, ControlGroup } from './control-grid';
import { MiniGridPreview } from './mini-grid-preview';

// ── Pattern source code (sent as strings via evalPattern) ──────────────

const PRIDE_COLORS_CODE = `
var COLORS = [
  [0, 100, 100],
  [30, 100, 100],
  [55, 100, 100],
  [120, 100, 100],
  [210, 100, 100],
  [290, 100, 100]
];
`;

const TRANS_COLORS_CODE = `
var COLORS = [
  [197, 100, 100],
  [340, 100, 100],
  [0, 0, 100],
  [340, 100, 100],
  [197, 100, 100]
];
`;

const LESBIAN_COLORS_CODE = `
var COLORS = [
  [14, 100, 84],
  [24, 68, 94],
  [0, 0, 100],
  [322, 52, 82],
  [330, 97, 64]
];
`;

function lerpColorCode(): string {
  return `
function lerpColor(a, b, t) {
  var dh = b[0] - a[0];
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return [
    ((a[0] + dh * t) % 360 + 360) % 360,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}
function colorAt(pos) {
  var p = ((pos % 1) + 1) % 1;
  var scaled = p * COLORS.length;
  var idx = Math.floor(scaled);
  var mix = scaled - idx;
  var a = COLORS[idx % COLORS.length];
  var b = COLORS[(idx + 1) % COLORS.length];
  return lerpColor(a, b, mix);
}
`;
}

interface PatternDef {
  name: string;
  gradient: string;
  code: string;
}

function makeFlowPattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var speed = ctx.t * 0.012;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var c = colorAt(uv[1] + speed);\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'flow' }\n};\n})()`;
}

function makeBreathePattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var speed = ctx.t * 0.008;\n  var brightness = 90 + Math.sin(ctx.t * 0.6) * 10;\n  var c = colorAt(speed);\n  for (var i = 0; i < ctx.count; i++) {\n    ctx.set(i, c[0], c[1], brightness);\n  }\n},\nmeta: { name: 'breathe' }\n};\n})()`;
}

function makeRotatePattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var offset = ctx.t * 0.5;\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var c = colorAt(uv[0] + offset);\n    ctx.set(i, c[0], c[1], 100);\n  }\n},\nmeta: { name: 'rotate' }\n};\n})()`;
}

function makeRingPattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  var speed = ctx.t * 0.15;\n  for (var i = 0; i < ctx.count; i++) {\n    var polar = ctx.polar(i);\n    var c = colorAt(polar[1] / (Math.PI * 2) + speed);\n    ctx.set(i, c[0], c[1], 100);\n  }\n},\nmeta: { name: 'ring' }\n};\n})()`;
}

function makeWavePattern(colorsCode: string): string {
  return `(function(){\n${colorsCode}\n${lerpColorCode()}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var phase = Math.sin(uv[0] * Math.PI * 2 - ctx.t * 2);\n    var c = colorAt(uv[1] + ctx.t * 0.02);\n    var b = 60 + 40 * (0.5 + 0.5 * phase);\n    ctx.set(i, c[0], c[1], b);\n  }\n},\nmeta: { name: 'wave' }\n};\n})()`;
}


const PRIDE_STATIC: PatternDef[] = [
  {
    name: 'Rainbow',
    gradient: 'linear-gradient(180deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `(function(){\n${PRIDE_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[1] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'pride-rainbow' }\n};\n})()`
  },
  {
    name: 'Columns',
    gradient: 'linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `(function(){\n${PRIDE_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[0] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'pride-columns' }\n};\n})()`
  },
  {
    name: 'ROYGBIV',
    gradient: 'linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #0047ff, #4b0082, #750787)',
    code: `(function(){
var ROYGBIV = [
  [0, 100, 100],
  [30, 100, 100],
  [55, 100, 100],
  [120, 100, 100],
  [210, 100, 100],
  [260, 100, 100],
  [290, 100, 100]
];
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var c = ROYGBIV[col % ROYGBIV.length];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'pride-roygbiv' }
};
})()`
  },
  {
    name: 'Mirror',
    gradient: 'linear-gradient(90deg, #750787, #004dff, #008026, #ffed00, #008026, #004dff, #750787)',
    code: `(function(){
var HALF = [
  [0, 100, 100],
  [30, 100, 100],
  [55, 100, 100],
  [120, 100, 100],
  [210, 100, 100],
  [260, 100, 100],
  [290, 100, 100]
];
return {
render: function(ctx) {
  var mid = (ctx.cols - 1) / 2;
  for (var i = 0; i < ctx.count; i++) {
    var col = i % ctx.cols;
    var dist = Math.abs(col - mid);
    var idx = Math.floor(dist / mid * (HALF.length - 1));
    if (idx >= HALF.length) idx = HALF.length - 1;
    var c = HALF[idx];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'pride-mirror' }
};
})()`
  },
  {
    name: 'Double',
    gradient: 'linear-gradient(180deg, #e40303, #008026, #750787, #e40303, #008026, #750787)',
    code: `(function(){
${PRIDE_COLORS_CODE}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var row = Math.floor(i / ctx.cols);
    var col = i % ctx.cols;
    var pos = col / ctx.cols;
    var bandIdx = Math.floor(pos * COLORS.length);
    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;
    var c = COLORS[bandIdx];
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'pride-double' }
};
})()`
  },
  {
    name: 'Gradient',
    gradient: 'linear-gradient(90deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `(function(){
${PRIDE_COLORS_CODE}\n${lerpColorCode()}
return {
render: function(ctx) {
  for (var i = 0; i < ctx.count; i++) {
    var uv = ctx.uv(i);
    var c = colorAt(uv[0]);
    ctx.set(i, c[0], c[1], c[2]);
  }
},
meta: { name: 'pride-gradient' }
};
})()`
  },
  {
    name: 'Diagonal',
    gradient: 'linear-gradient(135deg, #e40303, #ff8c00, #ffed00, #008026, #004dff, #750787)',
    code: `(function(){\n${PRIDE_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var d = (uv[0] + uv[1]) / 2;\n    var bandIdx = Math.floor(d * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'pride-diagonal' }\n};\n})()`
  },
  {
    name: 'Solid Red',
    gradient: 'linear-gradient(135deg, #e40303, #cc0000)',
    code: `({ render: function(ctx) { ctx.fill(0, 100, 100); }, meta: { name: 'pride-red' } })`
  },
  {
    name: 'Solid Gold',
    gradient: 'linear-gradient(135deg, #ffed00, #ccb800)',
    code: `({ render: function(ctx) { ctx.fill(55, 100, 100); }, meta: { name: 'pride-gold' } })`
  },
  {
    name: 'Solid Purple',
    gradient: 'linear-gradient(135deg, #750787, #5a0566)',
    code: `({ render: function(ctx) { ctx.fill(290, 100, 100); }, meta: { name: 'pride-purple' } })`
  }
];

const PRIDE_PATTERNS: PatternDef[] = [
  {
    name: 'Rainbow',
    gradient: 'linear-gradient(90deg, #e33, #ee0, #3a5, #35e, #e33)',
    code: `({
  render: function(ctx) {
    for (var i = 0; i < ctx.count; i++) {
      var row = Math.floor(i / ctx.cols);
      var col = i % ctx.cols;
      var hue = (ctx.t * 30 + (row + col) * 25) % 360;
      ctx.set(i, hue, 100, 100);
    }
  },
  meta: { name: 'pride-rainbow-anim' }
})`
  },
  {
    name: 'Flow',
    gradient: 'linear-gradient(180deg, #e40303 0%, #ff8c00 20%, #ffed00 40%, #008026 60%, #004dff 80%, #750787 100%)',
    code: makeFlowPattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Breathe',
    gradient: 'radial-gradient(circle, #ff8c00, #e40303, #750787)',
    code: makeBreathePattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Rotate',
    gradient: 'linear-gradient(90deg, #e40303, #ffed00, #008026, #004dff, #750787, #e40303)',
    code: makeRotatePattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Ring',
    gradient: 'conic-gradient(#e40303, #ff8c00, #ffed00, #008026, #004dff, #750787, #e40303)',
    code: makeRingPattern(PRIDE_COLORS_CODE)
  },
  {
    name: 'Wave',
    gradient: 'linear-gradient(135deg, #e40303 0%, #008026 50%, #750787 100%)',
    code: makeWavePattern(PRIDE_COLORS_CODE)
  }
];

const TRANS_PRESETS: PatternDef[] = [
  {
    name: 'Flag',
    gradient: 'linear-gradient(180deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: `(function(){\n${TRANS_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[1] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'trans-flag' }\n};\n})()`
  },
  {
    name: 'Columns',
    gradient: 'linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: `(function(){\n${TRANS_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[0] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'trans-columns' }\n};\n})()`
  },
  {
    name: 'Flow',
    gradient: 'linear-gradient(180deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeFlowPattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Rotate',
    gradient: 'linear-gradient(90deg, #5BCEFA, #F5A9B8, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeRotatePattern(TRANS_COLORS_CODE)
  },
  {
    name: 'Breathe',
    gradient: 'radial-gradient(circle, #FFFFFF, #F5A9B8, #5BCEFA)',
    code: makeBreathePattern(TRANS_COLORS_CODE)
  }
];

const LESBIAN_STATIC: PatternDef[] = [
  {
    name: 'Flag',
    gradient: 'linear-gradient(180deg, #D52D00, #EF7627, #FFFFFF, #D162A4, #A30262)',
    code: `(function(){\n${LESBIAN_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[1] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'lesbian-flag' }\n};\n})()`
  },
  {
    name: 'Columns',
    gradient: 'linear-gradient(90deg, #D52D00, #EF7627, #FFFFFF, #D162A4, #A30262)',
    code: `(function(){\n${LESBIAN_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var bandIdx = Math.floor(uv[0] * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'lesbian-columns' }\n};\n})()`
  },
  {
    name: 'Diagonal',
    gradient: 'linear-gradient(135deg, #D52D00, #EF7627, #FFFFFF, #D162A4, #A30262)',
    code: `(function(){\n${LESBIAN_COLORS_CODE}\nreturn {\nrender: function(ctx) {\n  for (var i = 0; i < ctx.count; i++) {\n    var uv = ctx.uv(i);\n    var d = (uv[0] + uv[1]) / 2;\n    var bandIdx = Math.floor(d * COLORS.length);\n    if (bandIdx >= COLORS.length) bandIdx = COLORS.length - 1;\n    var c = COLORS[bandIdx];\n    ctx.set(i, c[0], c[1], c[2]);\n  }\n},\nmeta: { name: 'lesbian-diagonal' }\n};\n})()`
  }
];

const LESBIAN_PATTERNS: PatternDef[] = [
  {
    name: 'Flow',
    gradient: 'linear-gradient(180deg, #D52D00, #EF7627, #FFFFFF, #D162A4, #A30262)',
    code: makeFlowPattern(LESBIAN_COLORS_CODE)
  },
  {
    name: 'Rotate',
    gradient: 'linear-gradient(90deg, #D52D00, #EF7627, #FFFFFF, #D162A4, #A30262)',
    code: makeRotatePattern(LESBIAN_COLORS_CODE)
  },
  {
    name: 'Ring',
    gradient: 'conic-gradient(#D52D00, #EF7627, #FFFFFF, #D162A4, #A30262, #D52D00)',
    code: makeRingPattern(LESBIAN_COLORS_CODE)
  },
  {
    name: 'Breathe',
    gradient: 'radial-gradient(circle, #FFFFFF, #D162A4, #D52D00)',
    code: makeBreathePattern(LESBIAN_COLORS_CODE)
  },
  {
    name: 'Wave',
    gradient: 'linear-gradient(135deg, #D52D00, #FFFFFF, #A30262)',
    code: makeWavePattern(LESBIAN_COLORS_CODE)
  }
];

function PatternTile({
  pattern,
  active,
  onClick,
  showPreview,
  speed
}: {
  pattern: PatternDef;
  active: boolean;
  onClick: () => void;
  showPreview?: boolean;
  speed?: number;
}) {
  const tileSize = showPreview ? 96 : 72;
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden transition-all active:scale-93"
      style={{
        width: tileSize,
        height: tileSize,
        borderRadius: 16,
        background: showPreview ? '#0a0a12' : pattern.gradient,
        border: active ? '2.5px solid #fff' : '2.5px solid transparent'
      }}
    >
      {showPreview ? (
        <MiniGridPreview
          source={pattern.code}
          speed={speed}
          size={tileSize}
          isPattern
        />
      ) : null}
      <span
        className="absolute bottom-1 left-0 right-0 text-center text-white font-semibold"
        style={{
          fontSize: 9,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          letterSpacing: '0.02em'
        }}
      >
        {pattern.name}
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

export function PrideTab({
  send,
  activePattern,
  onPatternSelect,
  animSpeed,
  onAnimSpeed
}: {
  send: (msg: Record<string, unknown>) => void;
  activePattern: string | null;
  onPatternSelect: (id: string) => void;
  animSpeed: number;
  onAnimSpeed: (v: number) => void;
}) {
  const [showPreview, setShowPreview] = useState(true);

  const handleSelect = useCallback((groupPrefix: string, pattern: PatternDef) => {
    const id = `${groupPrefix}-${pattern.name}`;
    onPatternSelect(id);
    send({ type: 'evalPattern', code: pattern.code, params: {} });
  }, [send, onPatternSelect]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 px-2">
        <span className="text-xs font-medium shrink-0" style={{ color: '#888898', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
          Speed
        </span>
        <input
          type="range"
          className="flex-1"
          style={{ minWidth: 120, height: 28 }}
          min={0}
          max={1000}
          value={Math.round(Math.log(animSpeed / 0.001) / Math.log(5.0 / 0.001) * 1000)}
          onChange={(e) => {
            const t = parseInt(e.target.value, 10) / 1000;
            onAnimSpeed(0.001 * Math.pow(5.0 / 0.001, t));
          }}
        />
        <span className="text-xs font-mono shrink-0" style={{ color: '#888898', minWidth: 36, textAlign: 'right' }}>
          {animSpeed < 0.1 ? animSpeed.toFixed(3) : animSpeed < 1 ? animSpeed.toFixed(2) : animSpeed.toFixed(1)}x
        </span>
        <button
          onClick={() => onAnimSpeed(1.0)}
          title="Reset to 1.0x"
          style={{
            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: Math.abs(animSpeed - 1.0) < 0.01 ? 'transparent' : 'rgba(59,130,246,0.15)',
            border: 'none', cursor: 'pointer', opacity: Math.abs(animSpeed - 1.0) < 0.01 ? 0.3 : 1
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888898" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
        </button>
        <PreviewToggle enabled={showPreview} onToggle={() => setShowPreview(!showPreview)} />
      </div>
      <ControlGrid minCellWidth={200}>
        <ControlGroup label="Pride — Static">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {PRIDE_STATIC.map((p) => (
              <PatternTile
                key={`pride-s-${p.name}`}
                pattern={p}
                active={activePattern === `pride-s-${p.name}`}
                onClick={() => handleSelect('pride-s', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Pride — Animated">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {PRIDE_PATTERNS.map((p) => (
              <PatternTile
                key={`pride-${p.name}`}
                pattern={p}
                active={activePattern === `pride-${p.name}`}
                onClick={() => handleSelect('pride', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Trans">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {TRANS_PRESETS.map((p) => (
              <PatternTile
                key={`trans-${p.name}`}
                pattern={p}
                active={activePattern === `trans-${p.name}`}
                onClick={() => handleSelect('trans', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Lesbian — Static">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {LESBIAN_STATIC.map((p) => (
              <PatternTile
                key={`lesbian-s-${p.name}`}
                pattern={p}
                active={activePattern === `lesbian-s-${p.name}`}
                onClick={() => handleSelect('lesbian-s', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>

        <ControlGroup label="Lesbian — Animated">
          <div className="flex gap-2.5 flex-wrap overflow-y-auto" style={{ maxHeight: showPreview ? 320 : undefined }}>
            {LESBIAN_PATTERNS.map((p) => (
              <PatternTile
                key={`lesbian-${p.name}`}
                pattern={p}
                active={activePattern === `lesbian-${p.name}`}
                onClick={() => handleSelect('lesbian', p)}
                showPreview={showPreview}
                speed={animSpeed}
              />
            ))}
          </div>
        </ControlGroup>
      </ControlGrid>
    </div>
  );
}
