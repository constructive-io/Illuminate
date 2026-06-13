export function getCanvasHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Illuminate</title>
  <style>
    :root {
      --bg: #050508;
      --surface: #0c0c12;
      --surface2: #12121a;
      --border: #1a1a25;
      --text: #e8e8f0;
      --text2: #888898;
      --accent: #4a7cff;
      --glow: rgba(74, 124, 255, 0.3);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: var(--bg); color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
      touch-action: none; user-select: none; -webkit-user-select: none;
    }

    /* ─── Layout ─── */
    .app {
      display: flex; flex-direction: column;
      height: 100%; width: 100%;
    }
    .top-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; flex-shrink: 0;
      background: var(--surface); border-bottom: 1px solid var(--border);
    }
    .scene-label {
      font-size: 13px; font-weight: 500; color: var(--text2);
      letter-spacing: 0.04em;
    }
    .energy-wrap {
      display: flex; align-items: center; gap: 10px; flex: 1; max-width: 280px;
    }
    .energy-icon { font-size: 16px; opacity: 0.5; }
    .energy-slider {
      flex: 1; height: 4px; -webkit-appearance: none; appearance: none;
      background: linear-gradient(to right, #1a1a2a, var(--accent));
      border-radius: 2px; outline: none;
    }
    .energy-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 22px; height: 22px;
      border-radius: 50%; background: var(--accent);
      box-shadow: 0 0 12px var(--glow); cursor: pointer;
    }
    .energy-val { font-size: 12px; color: var(--text2); min-width: 32px; text-align: right; }
    .smooth-wrap {
      display: flex; align-items: center; gap: 8px;
    }
    .smooth-icon { font-size: 14px; opacity: 0.5; }
    .smooth-slider {
      width: 100px; height: 4px; -webkit-appearance: none; appearance: none;
      background: linear-gradient(to right, var(--accent), #1a1a2a);
      border-radius: 2px; outline: none;
    }
    .smooth-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px;
      border-radius: 50%; background: var(--text);
      box-shadow: 0 0 8px rgba(255,255,255,0.2); cursor: pointer;
    }

    /* ─── Sculpture Canvas ─── */
    .sculpture-wrap {
      flex: 1; display: flex; align-items: center; justify-content: center;
      padding: 16px; position: relative; overflow: hidden;
    }
    #sculpture {
      display: block; touch-action: none;
      border-radius: 16px;
    }

    /* ─── Tool Dock ─── */
    .dock {
      flex-shrink: 0; background: var(--surface);
      border-top: 1px solid var(--border);
      display: flex; flex-direction: column;
    }
    .mode-tabs {
      display: flex; gap: 2px; padding: 8px 12px 4px;
      overflow-x: auto; -webkit-overflow-scrolling: touch;
    }
    .mode-tab {
      padding: 8px 16px; border-radius: 20px; font-size: 12px;
      font-weight: 500; letter-spacing: 0.02em;
      background: transparent; border: 1px solid transparent;
      color: var(--text2); cursor: pointer; white-space: nowrap;
      transition: all 0.2s;
    }
    .mode-tab:hover { color: var(--text); }
    .mode-tab.active {
      background: var(--surface2); border-color: var(--border);
      color: var(--text);
    }

    .tool-area {
      padding: 8px 16px 16px; min-height: 120px;
      display: flex; align-items: center; gap: 16px;
    }

    /* ─── Color Wheel ─── */
    .color-section {
      display: flex; align-items: center; gap: 16px;
    }
    #color-wheel-wrap {
      position: relative; width: 100px; height: 100px; flex-shrink: 0;
    }
    #color-wheel {
      width: 100px; height: 100px; border-radius: 50%;
      cursor: crosshair; touch-action: none;
    }
    #wheel-cursor {
      position: absolute; width: 14px; height: 14px;
      border: 2px solid #fff; border-radius: 50%;
      pointer-events: none; transform: translate(-50%, -50%);
      box-shadow: 0 0 6px rgba(0,0,0,0.5);
    }
    .color-preview {
      width: 44px; height: 44px; border-radius: 12px;
      border: 2px solid var(--border); flex-shrink: 0;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
    }
    .brightness-vert {
      width: 6px; height: 90px; border-radius: 3px;
      background: linear-gradient(to top, #000, var(--accent));
      position: relative; cursor: pointer; touch-action: none;
    }
    .brightness-thumb {
      position: absolute; left: 50%; width: 16px; height: 16px;
      border-radius: 50%; background: #fff; border: 2px solid var(--border);
      transform: translate(-50%, -50%); pointer-events: none;
    }

    /* ─── Brush Controls ─── */
    .brush-controls {
      display: flex; align-items: center; gap: 12px;
    }
    .brush-size-wrap {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
    }
    .brush-preview {
      width: 50px; height: 50px; border-radius: 50%;
      border: 1px solid var(--border); display: flex;
      align-items: center; justify-content: center;
    }
    .brush-dot {
      border-radius: 50%; background: var(--accent); opacity: 0.7;
      transition: width 0.15s, height 0.15s;
    }
    .brush-label { font-size: 10px; color: var(--text2); }
    .brush-slider {
      width: 100px; height: 4px; -webkit-appearance: none; appearance: none;
      background: var(--border); border-radius: 2px;
    }
    .brush-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 16px; height: 16px;
      border-radius: 50%; background: var(--text); cursor: pointer;
    }
    .toggle-pill {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 16px; font-size: 11px;
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text2); cursor: pointer; transition: all 0.2s;
    }
    .toggle-pill.active { border-color: var(--accent); color: var(--accent); }

    /* ─── Scene Palette ─── */
    .scene-palette {
      display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start;
    }
    .scene-swatch {
      width: 56px; height: 56px; border-radius: 14px; cursor: pointer;
      border: 2px solid transparent; position: relative;
      transition: transform 0.15s, border-color 0.2s;
      overflow: hidden;
    }
    .scene-swatch:active { transform: scale(0.93); }
    .scene-swatch.active { border-color: #fff; }
    .scene-swatch-label {
      position: absolute; bottom: 3px; left: 0; right: 0;
      text-align: center; font-size: 8px; font-weight: 600;
      color: rgba(255,255,255,0.85); text-shadow: 0 1px 3px rgba(0,0,0,0.7);
      letter-spacing: 0.03em;
    }

    /* ─── Gradient Editor ─── */
    .gradient-editor {
      display: flex; align-items: center; gap: 12px;
    }
    .gradient-bar-wrap {
      position: relative; width: 200px; height: 32px;
      border-radius: 8px; overflow: hidden; cursor: pointer;
      border: 1px solid var(--border);
    }
    .gradient-bar {
      width: 100%; height: 100%;
    }
    .gradient-stop {
      position: absolute; top: 50%; width: 14px; height: 14px;
      border: 2px solid #fff; border-radius: 50%;
      transform: translate(-50%, -50%); cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    }
    .gradient-hint { font-size: 11px; color: var(--text2); max-width: 100px; }

    /* ─── Motion Painter ─── */
    .motion-controls {
      display: flex; align-items: center; gap: 12px;
    }
    .motion-btn {
      padding: 8px 16px; border-radius: 20px; font-size: 12px;
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text2); cursor: pointer; transition: all 0.2s;
    }
    .motion-btn:hover { border-color: var(--accent); color: var(--accent); }
    .motion-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
    .motion-speed {
      display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text2);
    }

    /* ─── Symmetry Tools ─── */
    .symmetry-tools {
      display: flex; gap: 6px;
    }
    .sym-btn {
      width: 48px; height: 48px; border-radius: 12px; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface2); border: 1px solid var(--border);
      color: var(--text2); cursor: pointer; transition: all 0.2s;
    }
    .sym-btn:hover { border-color: var(--text2); }
    .sym-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(74,124,255,0.1); }

    /* ─── Drops Mode ─── */
    .drops-controls {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    }
    .spectrum-bar-wrap {
      position: relative; width: 180px; height: 28px;
      border-radius: 8px; overflow: hidden;
      border: 1px solid var(--border); cursor: pointer;
    }
    .spectrum-bar {
      width: 100%; height: 100%;
    }
    .spectrum-handle {
      position: absolute; top: 0; bottom: 0; width: 3px;
      background: #fff; pointer-events: none;
      box-shadow: 0 0 4px rgba(0,0,0,0.8);
    }
    .drops-param {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .drops-param label {
      font-size: 10px; color: var(--text2); letter-spacing: 0.04em;
    }
    .drops-slider {
      width: 80px; height: 4px; -webkit-appearance: none; appearance: none;
      background: var(--border); border-radius: 2px;
    }
    .drops-slider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 14px; height: 14px;
      border-radius: 50%; background: var(--text); cursor: pointer;
    }

    /* ─── Hidden tool panels ─── */
    .tool-panel { display: none; }
    .tool-panel.visible { display: flex; align-items: center; gap: 16px; }

    /* ─── Status ─── */
    .status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #333; flex-shrink: 0;
    }
    .status-dot.connected { background: #3a5; }
  </style>
</head>
<body>
<div class="app">

  <!-- ─── Top Bar ─── -->
  <div class="top-bar">
    <div style="display:flex;align-items:center;gap:8px">
      <div class="status-dot" id="status-dot"></div>
      <span class="scene-label" id="scene-label">Civic Blue</span>
    </div>
    <div class="energy-wrap">
      <span class="energy-icon">◐</span>
      <input type="range" class="energy-slider" id="energy" min="0" max="100" value="80">
      <span class="energy-val" id="energy-val">80</span>
    </div>
    <div class="smooth-wrap">
      <span class="smooth-icon">〰</span>
      <input type="range" class="smooth-slider" id="smoothness" min="0" max="100" value="50">
    </div>
  </div>

  <!-- ─── Sculpture Canvas ─── -->
  <div class="sculpture-wrap">
    <canvas id="sculpture" width="600" height="600"></canvas>
  </div>

  <!-- ─── Tool Dock ─── -->
  <div class="dock">
    <div class="mode-tabs" id="mode-tabs">
      <div class="mode-tab active" data-mode="paint">Paint</div>
      <div class="mode-tab" data-mode="gradient">Gradient</div>
      <div class="mode-tab" data-mode="brush">Brush</div>
      <div class="mode-tab" data-mode="energy">Energy</div>
      <div class="mode-tab" data-mode="scenes">Scenes</div>
      <div class="mode-tab" data-mode="motion">Motion</div>
      <div class="mode-tab" data-mode="drops">Drops</div>
      <div class="mode-tab" data-mode="symmetry">Symmetry</div>
    </div>
    <div class="tool-area">

      <!-- Paint Mode -->
      <div class="tool-panel visible" id="panel-paint">
        <div class="color-section">
          <div id="color-wheel-wrap">
            <canvas id="color-wheel" width="100" height="100"></canvas>
            <div id="wheel-cursor" style="left:50px;top:50px"></div>
          </div>
          <div class="brightness-vert" id="bright-bar">
            <div class="brightness-thumb" id="bright-thumb" style="bottom:80%"></div>
          </div>
          <div class="color-preview" id="color-preview" style="background:#4a7cff"></div>
        </div>
      </div>

      <!-- Gradient Mode -->
      <div class="tool-panel" id="panel-gradient">
        <div class="gradient-editor">
          <div class="gradient-bar-wrap" id="gradient-bar-wrap">
            <canvas class="gradient-bar" id="gradient-bar" width="200" height="32"></canvas>
          </div>
          <div class="gradient-hint">Tap bar to add stops. Drag across grid to apply.</div>
        </div>
      </div>

      <!-- Brush Mode -->
      <div class="tool-panel" id="panel-brush">
        <div class="color-section">
          <div id="brush-color-wheel-wrap" style="position:relative;width:80px;height:80px;flex-shrink:0">
            <canvas id="brush-color-wheel" width="80" height="80" style="width:80px;height:80px;border-radius:50%;cursor:crosshair;touch-action:none"></canvas>
            <div id="brush-wheel-cursor" style="position:absolute;width:12px;height:12px;border:2px solid #fff;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 6px rgba(0,0,0,0.5);left:40px;top:40px"></div>
          </div>
          <div class="brush-controls">
            <div class="brush-size-wrap">
              <div class="brush-preview">
                <div class="brush-dot" id="brush-dot" style="width:20px;height:20px"></div>
              </div>
              <span class="brush-label">Size</span>
              <input type="range" class="brush-slider" id="brush-size" min="1" max="5" value="1">
            </div>
            <div class="toggle-pill" id="brush-falloff">Soft edge</div>
          </div>
        </div>
      </div>

      <!-- Energy Mode -->
      <div class="tool-panel" id="panel-energy">
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px">
          <div style="font-size:11px;color:var(--text2);letter-spacing:0.05em">INTENSITY</div>
          <input type="range" class="energy-slider" id="energy-full" min="0" max="100" value="80"
            style="width:100%;max-width:400px;height:8px">
          <div style="font-size:24px;font-weight:300;color:var(--text)" id="energy-full-val">80</div>
        </div>
      </div>

      <!-- Scenes -->
      <div class="tool-panel" id="panel-scenes">
        <div class="scene-palette" id="scene-palette"></div>
      </div>

      <!-- Motion -->
      <div class="tool-panel" id="panel-motion">
        <div class="motion-controls">
          <div class="motion-btn" id="motion-record">Draw path</div>
          <div class="motion-btn" id="motion-play">Play</div>
          <div class="motion-btn" id="motion-clear">Clear</div>
          <div class="motion-speed">
            <span>Speed</span>
            <input type="range" class="brush-slider" id="motion-speed" min="1" max="10" value="5" style="width:80px">
          </div>
        </div>
      </div>

      <!-- Drops -->
      <div class="tool-panel" id="panel-drops">
        <div class="drops-controls">
          <div style="display:flex;flex-direction:column;gap:4px">
            <label style="font-size:10px;color:var(--text2)">SPECTRUM</label>
            <div class="spectrum-bar-wrap" id="spectrum-bar-wrap">
              <canvas class="spectrum-bar" id="spectrum-bar" width="180" height="28"></canvas>
              <div class="spectrum-handle" id="spectrum-start-handle" style="left:0%"></div>
              <div class="spectrum-handle" id="spectrum-end-handle" style="left:50%"></div>
            </div>
          </div>
          <div class="drops-param">
            <label>Speed</label>
            <input type="range" class="drops-slider" id="drops-speed" min="1" max="10" value="5">
          </div>
          <div class="drops-param">
            <label>Decay</label>
            <input type="range" class="drops-slider" id="drops-decay" min="1" max="10" value="5">
          </div>
          <div class="drops-param">
            <label>Width</label>
            <input type="range" class="drops-slider" id="drops-width" min="1" max="5" value="2">
          </div>
        </div>
      </div>

      <!-- Symmetry -->
      <div class="tool-panel" id="panel-symmetry">
        <div class="symmetry-tools">
          <div class="sym-btn" data-sym="h" title="Mirror left/right">↔</div>
          <div class="sym-btn" data-sym="v" title="Mirror top/bottom">↕</div>
          <div class="sym-btn" data-sym="radial" title="Radial symmetry">✦</div>
          <div class="sym-btn" data-sym="kaleidoscope" title="Kaleidoscope">❋</div>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
// ═══════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════
const NUM = 49;
const GRID = 7;
const grid = Array.from({length: NUM}, () => ({ h: 220, s: 90, b: 80 }));

let currentMode = 'paint';
let currentHue = 220;
let currentSat = 90;
let currentBright = 80;
let brushSize = 1;
let brushFalloff = false;
let activeScene = 'civic';
let symmetry = { h: false, v: false, radial: false, kaleidoscope: false };

// Motion painter state
let motionPath = [];
let motionRecording = false;
let motionPlaying = false;
let motionFrame = 0;
let motionTimer = null;

// Drops/Ripple state
let drops = [];
let dropsSpectrumStart = 0;
let dropsSpectrumEnd = 180;
let dropsSpeed = 5;
let dropsDecay = 5;
let dropsWidth = 2;
let dropsTimer = null;

// Gradient state
let gradientStops = [
  { pos: 0, h: 220, s: 90, b: 80 },
  { pos: 1, h: 340, s: 80, b: 75 }
];

// ═══════════════════════════════════════════════════
// WebSocket
// ═══════════════════════════════════════════════════
const ws = new WebSocket('ws://' + location.host);
const statusDot = document.getElementById('status-dot');

ws.onopen = () => { statusDot.classList.add('connected'); };
ws.onclose = () => { statusDot.classList.remove('connected'); };
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'state') {
    for (let i = 0; i < NUM; i++) {
      grid[i].h = msg.grid[i].h;
      grid[i].s = msg.grid[i].s;
      grid[i].b = msg.grid[i].b;
    }
  }
};
function send(data) { if (ws.readyState === 1) ws.send(JSON.stringify(data)); }

// ═══════════════════════════════════════════════════
// Color utilities
// ═══════════════════════════════════════════════════
function hsl(h, s, l) {
  return 'hsl(' + h + ',' + s + '%,' + l + '%)';
}
function hslRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return [f(0), f(8), f(4)];
}

// ═══════════════════════════════════════════════════
// Sculpture Canvas (2D rendered grid with glow)
// ═══════════════════════════════════════════════════
const sculptureCanvas = document.getElementById('sculpture');
const sctx = sculptureCanvas.getContext('2d');
let cellSize, gridOffset, canvasW, canvasH;

function resizeSculpture() {
  const wrap = sculptureCanvas.parentElement;
  const size = Math.min(wrap.clientWidth - 32, wrap.clientHeight - 32, 560);
  canvasW = canvasH = size;
  const dpr = window.devicePixelRatio || 1;
  sculptureCanvas.width = size * dpr;
  sculptureCanvas.height = size * dpr;
  sculptureCanvas.style.width = size + 'px';
  sculptureCanvas.style.height = size + 'px';
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cellSize = (size - 20) / GRID;
  gridOffset = 10;
}

function drawSculpture() {
  sctx.clearRect(0, 0, canvasW, canvasH);
  const r = cellSize * 0.34;

  for (let i = 0; i < NUM; i++) {
    const row = Math.floor(i / GRID);
    const col = i % GRID;
    const cx = gridOffset + col * cellSize + cellSize / 2;
    const cy = gridOffset + row * cellSize + cellSize / 2;
    const c = grid[i];
    const lightness = Math.max(5, c.b * 0.5);

    // Outer glow
    if (c.b > 5) {
      const glowR = r * (1.2 + c.b * 0.012);
      const grad = sctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, glowR);
      const [gr, gg, gb] = hslRgb(c.h, c.s, lightness);
      grad.addColorStop(0, 'rgba(' + Math.round(gr*255) + ',' + Math.round(gg*255) + ',' + Math.round(gb*255) + ',0.5)');
      grad.addColorStop(1, 'rgba(' + Math.round(gr*255) + ',' + Math.round(gg*255) + ',' + Math.round(gb*255) + ',0)');
      sctx.beginPath();
      sctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      sctx.fillStyle = grad;
      sctx.fill();
    }

    // Core orb
    const orbGrad = sctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    if (c.b < 2) {
      orbGrad.addColorStop(0, '#181820');
      orbGrad.addColorStop(1, '#0e0e14');
    } else {
      const bright = Math.min(lightness + 15, 95);
      orbGrad.addColorStop(0, hsl(c.h, c.s, bright));
      orbGrad.addColorStop(1, hsl(c.h, c.s, lightness * 0.6));
    }
    sctx.beginPath();
    sctx.arc(cx, cy, r, 0, Math.PI * 2);
    sctx.fillStyle = orbGrad;
    sctx.fill();

    // Specular highlight
    if (c.b > 20) {
      sctx.beginPath();
      sctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.2, 0, Math.PI * 2);
      sctx.fillStyle = 'rgba(255,255,255,' + (c.b * 0.002) + ')';
      sctx.fill();
    }
  }

  // Draw motion path if recording or has path
  if (motionPath.length > 1) {
    sctx.strokeStyle = 'rgba(255,255,255,0.15)';
    sctx.lineWidth = 2;
    sctx.setLineDash([4, 4]);
    sctx.beginPath();
    for (let i = 0; i < motionPath.length; i++) {
      const idx = motionPath[i];
      const row = Math.floor(idx / GRID);
      const col = idx % GRID;
      const cx = gridOffset + col * cellSize + cellSize / 2;
      const cy = gridOffset + row * cellSize + cellSize / 2;
      if (i === 0) sctx.moveTo(cx, cy);
      else sctx.lineTo(cx, cy);
    }
    sctx.stroke();
    sctx.setLineDash([]);
  }

  requestAnimationFrame(drawSculpture);
}

// ═══════════════════════════════════════════════════
// Touch → Grid mapping
// ═══════════════════════════════════════════════════
function cannonAtXY(x, y) {
  const col = Math.floor((x - gridOffset) / cellSize);
  const row = Math.floor((y - gridOffset) / cellSize);
  if (col < 0 || col >= GRID || row < 0 || row >= GRID) return -1;
  return row * GRID + col;
}

function getCanvasXY(e) {
  const rect = sculptureCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: (touch.clientX - rect.left) * (canvasW / rect.width),
    y: (touch.clientY - rect.top) * (canvasH / rect.height)
  };
}

function getAffectedCannons(centerIdx) {
  if (centerIdx < 0) return [];
  const cRow = Math.floor(centerIdx / GRID);
  const cCol = centerIdx % GRID;
  const result = [{ idx: centerIdx, falloff: 1 }];

  // Brush size > 1: include neighbors
  if (brushSize > 1 && (currentMode === 'brush' || currentMode === 'paint')) {
    const reach = brushSize - 1;
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = cRow + dr, nc = cCol + dc;
        if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
        const dist = Math.sqrt(dr * dr + dc * dc);
        if (dist > reach + 0.5) continue;
        const fo = brushFalloff ? Math.max(0, 1 - dist / (reach + 1)) : 1;
        result.push({ idx: nr * GRID + nc, falloff: fo });
      }
    }
  }

  // Symmetry: mirror all affected cannons
  const mirrored = [];
  for (const { idx, falloff } of result) {
    mirrored.push({ idx, falloff });
    const r = Math.floor(idx / GRID), c = idx % GRID;
    if (symmetry.h) mirrored.push({ idx: r * GRID + (GRID - 1 - c), falloff });
    if (symmetry.v) mirrored.push({ idx: (GRID - 1 - r) * GRID + c, falloff });
    if (symmetry.h && symmetry.v) mirrored.push({ idx: (GRID - 1 - r) * GRID + (GRID - 1 - c), falloff });
    if (symmetry.radial) {
      // 4-fold rotational
      mirrored.push({ idx: c * GRID + (GRID - 1 - r), falloff });
      mirrored.push({ idx: (GRID - 1 - c) * GRID + r, falloff });
    }
    if (symmetry.kaleidoscope) {
      // 8-fold
      mirrored.push({ idx: r * GRID + (GRID - 1 - c), falloff });
      mirrored.push({ idx: (GRID - 1 - r) * GRID + c, falloff });
      mirrored.push({ idx: (GRID - 1 - r) * GRID + (GRID - 1 - c), falloff });
      mirrored.push({ idx: c * GRID + r, falloff });
      mirrored.push({ idx: c * GRID + (GRID - 1 - r), falloff });
      mirrored.push({ idx: (GRID - 1 - c) * GRID + r, falloff });
      mirrored.push({ idx: (GRID - 1 - c) * GRID + (GRID - 1 - r), falloff });
    }
  }

  // Deduplicate
  const seen = new Set();
  return mirrored.filter(m => {
    if (m.idx < 0 || m.idx >= NUM || seen.has(m.idx)) return false;
    seen.add(m.idx);
    return true;
  });
}

function paintCannon(idx, falloff) {
  const h = currentHue;
  const s = currentSat;
  const b = currentBright * falloff;
  send({ type: 'cannon', index: idx, h, s, b });
}

// Gradient helpers
function gradientColorAt(t) {
  // Find the two surrounding stops
  const sorted = [...gradientStops].sort((a, b) => a.pos - b.pos);
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
}

let gradientDragStart = -1;

// ═══════════════════════════════════════════════════
// Sculpture interaction
// ═══════════════════════════════════════════════════
let painting = false;
let lastPaintedIdx = -1;

function handleSculptureStart(e) {
  e.preventDefault();
  painting = true;
  const { x, y } = getCanvasXY(e);
  const idx = cannonAtXY(x, y);

  if (currentMode === 'drops') {
    if (idx >= 0) {
      drops.push({ origin: idx, tick: 0 });
      if (!dropsTimer) startDropsAnimation();
    }
    return;
  }

  if (currentMode === 'motion' && motionRecording) {
    if (idx >= 0 && (motionPath.length === 0 || motionPath[motionPath.length - 1] !== idx)) {
      motionPath.push(idx);
    }
    lastPaintedIdx = idx;
    return;
  }

  if (currentMode === 'gradient') {
    gradientDragStart = idx;
    return;
  }

  if (idx >= 0 && (currentMode === 'paint' || currentMode === 'brush')) {
    const affected = getAffectedCannons(idx);
    affected.forEach(a => paintCannon(a.idx, a.falloff));
    lastPaintedIdx = idx;
  }
}

function handleSculptureMove(e) {
  e.preventDefault();
  if (!painting) return;
  const { x, y } = getCanvasXY(e);
  const idx = cannonAtXY(x, y);
  if (idx < 0 || idx === lastPaintedIdx) return;

  if (currentMode === 'drops') {
    if (idx >= 0) {
      drops.push({ origin: idx, tick: 0 });
    }
    lastPaintedIdx = idx;
    return;
  }

  if (currentMode === 'motion' && motionRecording) {
    if (motionPath.length === 0 || motionPath[motionPath.length - 1] !== idx) {
      motionPath.push(idx);
    }
    lastPaintedIdx = idx;
    return;
  }

  if (currentMode === 'gradient' && gradientDragStart >= 0) {
    // Apply gradient from start to current position
    const startRow = Math.floor(gradientDragStart / GRID);
    const startCol = gradientDragStart % GRID;
    const endRow = Math.floor(idx / GRID);
    const endCol = idx % GRID;
    const dist = Math.sqrt((endRow - startRow) ** 2 + (endCol - startCol) ** 2);
    if (dist < 0.5) return;

    for (let i = 0; i < NUM; i++) {
      const r = Math.floor(i / GRID), c = i % GRID;
      const proj = ((r - startRow) * (endRow - startRow) + (c - startCol) * (endCol - startCol)) / (dist * dist);
      const t = Math.max(0, Math.min(1, proj));
      const gc = gradientColorAt(t);
      send({ type: 'cannon', index: i, h: gc.h, s: gc.s, b: gc.b });
    }
    lastPaintedIdx = idx;
    return;
  }

  if (currentMode === 'paint' || currentMode === 'brush') {
    const affected = getAffectedCannons(idx);
    affected.forEach(a => paintCannon(a.idx, a.falloff));
    lastPaintedIdx = idx;
  }
}

function handleSculptureEnd(e) {
  e.preventDefault();
  painting = false;
  lastPaintedIdx = -1;
  gradientDragStart = -1;
}

sculptureCanvas.addEventListener('pointerdown', handleSculptureStart);
sculptureCanvas.addEventListener('pointermove', handleSculptureMove);
sculptureCanvas.addEventListener('pointerup', handleSculptureEnd);
sculptureCanvas.addEventListener('pointercancel', handleSculptureEnd);

// ═══════════════════════════════════════════════════
// Color Wheel
// ═══════════════════════════════════════════════════
function drawColorWheel(canvas, size) {
  const ctx = canvas.getContext('2d');
  const cx = size / 2, cy = size / 2, radius = size / 2 - 2;
  const imgData = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
      const sat = (dist / radius) * 100;
      const [r, g, b] = hslRgb(angle, sat, 50);
      const idx = (y * size + x) * 4;
      imgData.data[idx] = r * 255;
      imgData.data[idx + 1] = g * 255;
      imgData.data[idx + 2] = b * 255;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function setupColorWheel(wheelId, cursorId, onPick) {
  const wheel = document.getElementById(wheelId);
  const cursor = document.getElementById(cursorId);
  const size = parseInt(wheel.width);
  drawColorWheel(wheel, size);

  function pick(e) {
    const rect = wheel.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const scale = size / rect.width;
    const px = x * scale, py = y * scale;
    const cx = size / 2, cy = size / 2;
    const dx = px - cx, dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = size / 2 - 2;
    if (dist > radius) return;
    const hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
    const sat = (dist / radius) * 100;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    onPick(hue, sat);
  }

  let dragging = false;
  wheel.addEventListener('pointerdown', (e) => { dragging = true; pick(e); });
  window.addEventListener('pointermove', (e) => { if (dragging) pick(e); });
  window.addEventListener('pointerup', () => { dragging = false; });
}

function updateColorPreview() {
  const preview = document.getElementById('color-preview');
  preview.style.background = hsl(currentHue, currentSat, Math.max(10, currentBright * 0.5));
  preview.style.boxShadow = '0 0 20px ' + hsl(currentHue, currentSat, currentBright * 0.3);
}

setupColorWheel('color-wheel', 'wheel-cursor', (h, s) => {
  currentHue = h;
  currentSat = s;
  updateColorPreview();
});

setupColorWheel('brush-color-wheel', 'brush-wheel-cursor', (h, s) => {
  currentHue = h;
  currentSat = s;
  updateColorPreview();
  const dot = document.getElementById('brush-dot');
  dot.style.background = hsl(h, s, 50);
});

// Brightness bar
function setupBrightnessBar() {
  const bar = document.getElementById('bright-bar');
  const thumb = document.getElementById('bright-thumb');

  function pick(e) {
    const rect = bar.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const y = touch.clientY - rect.top;
    const pct = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100));
    currentBright = pct;
    thumb.style.bottom = pct + '%';
    updateColorPreview();
  }

  let dragging = false;
  bar.addEventListener('pointerdown', (e) => { dragging = true; pick(e); });
  window.addEventListener('pointermove', (e) => { if (dragging) pick(e); });
  window.addEventListener('pointerup', () => { dragging = false; });
}
setupBrightnessBar();

// ═══════════════════════════════════════════════════
// Mode switching
// ═══════════════════════════════════════════════════
document.getElementById('mode-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.mode-tab');
  if (!tab) return;
  document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentMode = tab.dataset.mode;
  document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('visible'));
  const panel = document.getElementById('panel-' + currentMode);
  if (panel) panel.classList.add('visible');
});

// ═══════════════════════════════════════════════════
// Energy controls
// ═══════════════════════════════════════════════════
document.getElementById('energy').addEventListener('input', function() {
  document.getElementById('energy-val').textContent = this.value;
  send({ type: 'master_brightness', value: parseInt(this.value) / 100 });
});
document.getElementById('energy-full').addEventListener('input', function() {
  document.getElementById('energy-full-val').textContent = this.value;
  document.getElementById('energy').value = this.value;
  document.getElementById('energy-val').textContent = this.value;
  send({ type: 'master_brightness', value: parseInt(this.value) / 100 });
});

// ═══════════════════════════════════════════════════
// Smoothness control (global low-pass filter amount)
// ═══════════════════════════════════════════════════
document.getElementById('smoothness').addEventListener('input', function() {
  // Slider 0–100 maps to alpha 1.0 (instant) → 0.01 (ultra-smooth)
  // Exponential curve so the middle range (40–60%) feels like the sweet spot
  const pct = parseInt(this.value) / 100;
  const alpha = Math.pow(10, -2 * pct) * (1 - 0.01) + 0.01;
  // Clamp: pct=0 → alpha≈1.0 (no filter), pct=1 → alpha≈0.01 (very smooth)
  send({ type: 'smoothness', value: Math.max(0.01, Math.min(1.0, alpha)) });
});

// ═══════════════════════════════════════════════════
// Scene Palette
// ═══════════════════════════════════════════════════
const SCENES = {
  civic:    { label: 'Civic Blue',  colors: ['#1a3a7a', '#2a5aaa'] },
  pride:    { label: 'Pride',       colors: ['#e33', '#f90', '#ee0', '#3a5', '#35e', '#a3e'] },
  gold:     { label: 'Golden Gate', colors: ['#b8860b', '#daa520'] },
  white:    { label: 'White',       colors: ['#aaa', '#fff'] },
  solstice: { label: 'Solstice',    colors: ['#c63', '#da5', '#ac5'] },
  ocean:    { label: 'Ocean',       colors: ['#0a5a6a', '#1aaabb'] },
  sunset:   { label: 'Sunset',      colors: ['#c33', '#d85', '#da5'] },
  off:      { label: 'Blackout',    colors: ['#111', '#000'] }
};

const scenePalette = document.getElementById('scene-palette');
for (const [key, scene] of Object.entries(SCENES)) {
  const swatch = document.createElement('div');
  swatch.className = 'scene-swatch' + (key === activeScene ? ' active' : '');
  const gradient = scene.colors.length > 1
    ? 'linear-gradient(135deg, ' + scene.colors.join(', ') + ')'
    : scene.colors[0];
  swatch.style.background = gradient;
  swatch.innerHTML = '<div class="scene-swatch-label">' + scene.label + '</div>';
  swatch.addEventListener('click', () => {
    document.querySelectorAll('.scene-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    activeScene = key;
    document.getElementById('scene-label').textContent = scene.label;
    send({ type: 'scene', name: key });
  });
  scenePalette.appendChild(swatch);
}

// ═══════════════════════════════════════════════════
// Brush controls
// ═══════════════════════════════════════════════════
document.getElementById('brush-size').addEventListener('input', function() {
  brushSize = parseInt(this.value);
  const dot = document.getElementById('brush-dot');
  const px = 10 + brushSize * 8;
  dot.style.width = px + 'px';
  dot.style.height = px + 'px';
});
document.getElementById('brush-falloff').addEventListener('click', function() {
  brushFalloff = !brushFalloff;
  this.classList.toggle('active', brushFalloff);
});

// ═══════════════════════════════════════════════════
// Motion Painter
// ═══════════════════════════════════════════════════
document.getElementById('motion-record').addEventListener('click', function() {
  motionRecording = !motionRecording;
  this.classList.toggle('active', motionRecording);
  if (motionRecording) {
    motionPath = [];
    stopMotion();
  }
});
document.getElementById('motion-play').addEventListener('click', function() {
  if (motionPath.length < 2) return;
  if (motionPlaying) { stopMotion(); return; }
  motionPlaying = true;
  this.classList.add('active');
  motionRecording = false;
  document.getElementById('motion-record').classList.remove('active');
  motionFrame = 0;
  playMotionStep();
});
document.getElementById('motion-clear').addEventListener('click', () => {
  motionPath = [];
  stopMotion();
});

function stopMotion() {
  motionPlaying = false;
  document.getElementById('motion-play').classList.remove('active');
  if (motionTimer) { clearTimeout(motionTimer); motionTimer = null; }
}

function playMotionStep() {
  if (!motionPlaying || motionPath.length < 2) { stopMotion(); return; }
  const idx = motionPath[motionFrame % motionPath.length];
  // Light up current, dim previous
  for (let i = 0; i < motionPath.length; i++) {
    const dist = Math.min(
      Math.abs(i - (motionFrame % motionPath.length)),
      motionPath.length - Math.abs(i - (motionFrame % motionPath.length))
    );
    const falloff = Math.max(0, 1 - dist * 0.3);
    send({
      type: 'cannon', index: motionPath[i],
      h: currentHue, s: currentSat, b: currentBright * falloff
    });
  }
  motionFrame++;
  const speed = parseInt(document.getElementById('motion-speed').value);
  motionTimer = setTimeout(playMotionStep, 300 - speed * 25);
}

// ═══════════════════════════════════════════════════
// Symmetry
// ═══════════════════════════════════════════════════
document.querySelectorAll('.sym-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const key = this.dataset.sym;
    symmetry[key] = !symmetry[key];
    this.classList.toggle('active', symmetry[key]);
  });
});

// ═══════════════════════════════════════════════════
// Gradient bar rendering
// ═══════════════════════════════════════════════════
function drawGradientBar() {
  const canvas = document.getElementById('gradient-bar');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const sorted = [...gradientStops].sort((a, b) => a.pos - b.pos);
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (const stop of sorted) {
    grad.addColorStop(stop.pos, hsl(stop.h, stop.s, Math.max(10, stop.b * 0.5)));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Draw stop markers
  const wrap = document.getElementById('gradient-bar-wrap');
  wrap.querySelectorAll('.gradient-stop').forEach(el => el.remove());
  for (const stop of sorted) {
    const marker = document.createElement('div');
    marker.className = 'gradient-stop';
    marker.style.left = (stop.pos * 100) + '%';
    marker.style.background = hsl(stop.h, stop.s, Math.max(10, stop.b * 0.5));
    wrap.appendChild(marker);
  }
}

document.getElementById('gradient-bar-wrap').addEventListener('click', (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  gradientStops.push({ pos, h: currentHue, s: currentSat, b: currentBright });
  drawGradientBar();
});

// ═══════════════════════════════════════════════════
// Drops / Ripple Engine
// ═══════════════════════════════════════════════════
function drawSpectrumBar() {
  const canvas = document.getElementById('spectrum-bar');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  for (let x = 0; x < w; x++) {
    const hue = (x / w) * 360;
    ctx.fillStyle = hsl(hue, 90, 50);
    ctx.fillRect(x, 0, 1, h);
  }
  // Update handle positions
  document.getElementById('spectrum-start-handle').style.left = (dropsSpectrumStart / 360 * 100) + '%';
  document.getElementById('spectrum-end-handle').style.left = (dropsSpectrumEnd / 360 * 100) + '%';
}

(function setupSpectrumBar() {
  const wrap = document.getElementById('spectrum-bar-wrap');
  let dragging = null; // 'start' or 'end'
  wrap.addEventListener('pointerdown', (e) => {
    const rect = wrap.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const hue = pos * 360;
    // Determine which handle is closer
    const dStart = Math.abs(hue - dropsSpectrumStart);
    const dEnd = Math.abs(hue - dropsSpectrumEnd);
    dragging = dStart < dEnd ? 'start' : 'end';
    if (dragging === 'start') dropsSpectrumStart = Math.max(0, Math.min(360, hue));
    else dropsSpectrumEnd = Math.max(0, Math.min(360, hue));
    drawSpectrumBar();
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = wrap.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const hue = pos * 360;
    if (dragging === 'start') dropsSpectrumStart = hue;
    else dropsSpectrumEnd = hue;
    drawSpectrumBar();
  });
  window.addEventListener('pointerup', () => { dragging = null; });
})();

document.getElementById('drops-speed').addEventListener('input', function() { dropsSpeed = parseInt(this.value); });
document.getElementById('drops-decay').addEventListener('input', function() { dropsDecay = parseInt(this.value); });
document.getElementById('drops-width').addEventListener('input', function() { dropsWidth = parseInt(this.value); });

function startDropsAnimation() {
  if (dropsTimer) return;
  dropsTimer = setInterval(tickDrops, 80);
}

function stopDropsAnimation() {
  if (dropsTimer) { clearInterval(dropsTimer); dropsTimer = null; }
}

function tickDrops() {
  if (drops.length === 0) { stopDropsAnimation(); return; }

  // Accumulate brightness contributions per cannon
  const contrib = new Float32Array(NUM);
  const hues = new Float32Array(NUM);
  const sats = new Float32Array(NUM);
  const counts = new Float32Array(NUM);

  const maxRadius = GRID * 1.5; // max distance before drop dies
  const decayRate = 0.6 + (10 - dropsDecay) * 0.06; // higher decay slider = slower decay
  const speedMult = 0.3 + dropsSpeed * 0.15;
  const ringWidth = dropsWidth;

  for (let d = drops.length - 1; d >= 0; d--) {
    const drop = drops[d];
    const radius = drop.tick * speedMult;
    if (radius > maxRadius + ringWidth) {
      drops.splice(d, 1);
      continue;
    }

    const oRow = Math.floor(drop.origin / GRID);
    const oCol = drop.origin % GRID;

    for (let i = 0; i < NUM; i++) {
      const r = Math.floor(i / GRID);
      const c = i % GRID;
      const dist = Math.sqrt((r - oRow) * (r - oRow) + (c - oCol) * (c - oCol));

      // How close is this cannon to the current wavefront?
      const delta = Math.abs(dist - radius);
      if (delta > ringWidth) continue;

      // Intensity: peaks at wavefront center, fades with ring width and age
      const ringFalloff = 1 - (delta / ringWidth);
      const ageFalloff = Math.pow(decayRate, drop.tick * 0.3);
      const intensity = ringFalloff * ageFalloff * currentBright;

      if (intensity < 1) continue;

      // Hue: cycles through spectrum based on distance from origin
      const specRange = dropsSpectrumEnd - dropsSpectrumStart;
      const hue = (dropsSpectrumStart + (dist / maxRadius) * specRange + 360) % 360;

      contrib[i] += intensity;
      hues[i] += hue * intensity;
      sats[i] += 90 * intensity;
      counts[i] += intensity;
    }

    drop.tick++;
  }

  // Send updates for affected cannons
  for (let i = 0; i < NUM; i++) {
    if (counts[i] > 0) {
      const h = (hues[i] / counts[i] + 360) % 360;
      const s = sats[i] / counts[i];
      const b = Math.min(100, contrib[i]);
      send({ type: 'cannon', index: i, h, s, b });
    }
  }

  if (drops.length === 0) stopDropsAnimation();
}

// ═══════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════
resizeSculpture();
updateColorPreview();
drawGradientBar();
drawSpectrumBar();
drawSculpture();
window.addEventListener('resize', resizeSculpture);
</script>
</body>
</html>`;
}
