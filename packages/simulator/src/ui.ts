import { animations } from './animations';
import { scenes } from './scenes';

export function getHTML(numCannons: number = 49, gridColumns: number = 7): string {
  const sceneNames = Object.keys(scenes);
  const animationNames = Object.keys(animations);
  const gridRows = Math.ceil(numCannons / gridColumns);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>Wavegrid · Master Controller</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', 'Fira Code', monospace;
      background: #0a0a0a; color: #eee; padding: 1rem;
      min-height: 100vh;
    }
    h1 {
      font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;
      color: #ccc; letter-spacing: 0.03em;
    }
    .subtitle { font-size: 0.7rem; color: #555; margin-bottom: 1rem; }

    .master {
      background: #141414; border: 1px solid #2a2a2a; border-radius: 12px;
      padding: 1rem; margin-bottom: 1.25rem;
    }
    .section-title {
      font-size: 0.7rem; color: #666; text-transform: uppercase;
      letter-spacing: 0.08em; margin-bottom: 0.75rem;
    }
    .scene-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .scene-btn {
      padding: 6px 14px; border-radius: 20px; font-size: 0.75rem;
      cursor: pointer; border: 1px solid #333; background: #1a1a1a;
      color: #aaa; transition: all 0.2s;
    }
    .scene-btn:hover { border-color: #555; color: #ddd; }
    .scene-btn.active { background: #1a3a6a; border-color: #3a6acc; color: #fff; }

    .anim-btn {
      padding: 6px 14px; border-radius: 20px; font-size: 0.75rem;
      cursor: pointer; border: 1px solid #333; background: #1a1a1a;
      color: #aaa; transition: all 0.2s;
    }
    .anim-btn:hover { border-color: #555; color: #ddd; }
    .anim-btn.active { background: #1a4a2a; border-color: #3acc5a; color: #fff; }
    .anim-btn.stop { border-color: #5a2222; color: #c44; }
    .anim-btn.stop:hover { border-color: #8a3333; color: #e66; }

    .slider-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 0.6rem;
    }
    .slider-row label {
      font-size: 0.75rem; color: #777; min-width: 90px;
    }
    .slider-row input[type=range] {
      flex: 1; height: 6px; -webkit-appearance: none; appearance: none;
      background: #333; border-radius: 3px; outline: none;
    }
    .slider-row input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px;
      border-radius: 50%; background: #4a8cde; cursor: pointer;
    }
    .slider-row .val {
      font-size: 0.75rem; font-weight: 500; min-width: 50px; text-align: right; color: #888;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .all-off {
      width: 100%; padding: 10px; border-radius: 8px; margin-top: 0.5rem;
      background: #1a0808; border: 1px solid #3a1515; color: #c44;
      font-size: 0.85rem; font-weight: 500; cursor: pointer; text-align: center;
      transition: background 0.2s;
    }
    .all-off:hover { background: #2a1010; }

    .columns { display: flex; gap: 1.25rem; flex-wrap: wrap; }
    .col-left { flex: 1; min-width: 300px; }
    .col-right { flex: 1; min-width: 300px; }

    .grid-section { margin-bottom: 1.25rem; }
    .sel-actions { display: flex; gap: 6px; margin-bottom: 0.5rem; }
    .sel-btn {
      font-size: 0.7rem; padding: 5px 10px;
      border: 1px solid #333; border-radius: 6px;
      background: #1a1a1a; color: #aaa; cursor: pointer;
      transition: all 0.15s;
    }
    .sel-btn:hover { border-color: #555; color: #ddd; }
    .rc-btns { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .rc-btn {
      font-size: 0.65rem; padding: 4px 8px;
      border: 1px solid #1a2a4a; border-radius: 5px;
      background: #0e1520; color: #5a8abb; cursor: pointer;
      transition: all 0.15s;
    }
    .rc-btn:hover { background: #152030; border-color: #2a4a7a; }

    .grid {
      display: grid;
      grid-template-columns: repeat(${gridColumns}, 1fr);
      gap: 4px;
      max-width: 420px;
    }
    .cell {
      aspect-ratio: 1; border-radius: 8px;
      border: 1.5px solid #222; background: #111;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      cursor: pointer; transition: border-color 0.15s, transform 0.1s;
      position: relative;
    }
    .cell:active { transform: scale(0.95); }
    .cell.selected { border-color: #4a8cde; }
    .cell-beam {
      width: 60%; height: 60%; border-radius: 50%;
      transition: none;
    }
    .cell-num {
      font-size: 7px; color: #444; margin-top: 2px;
      position: absolute; bottom: 3px;
    }

    .panel {
      background: #141414; border: 1px solid #2a2a2a; border-radius: 12px;
      padding: 1rem; display: none; margin-bottom: 1rem;
    }
    .panel.visible { display: block; }
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .panel-title { font-size: 0.9rem; font-weight: 500; }
    .done-btn {
      font-size: 0.7rem; padding: 4px 10px;
      border: 1px solid #333; border-radius: 6px;
      background: #1a1a1a; color: #aaa; cursor: pointer;
    }

    .telemetry {
      background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 8px;
      padding: 0.75rem; font-size: 0.65rem; color: #555;
      font-family: 'SF Mono', 'Fira Code', monospace;
      line-height: 1.6;
    }
    .telemetry .val-live { color: #4a8cde; }
    .telemetry .val-anim { color: #3acc5a; }

    .ambient-section {
      background: #141414; border: 1px solid #2a2a2a; border-radius: 12px;
      padding: 1rem; margin-bottom: 1.25rem;
    }
    .preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 0.75rem; }
    .preset-btn {
      padding: 8px 16px; border-radius: 20px; font-size: 0.75rem;
      cursor: pointer; border: 1px solid #2a3a2a; background: #0d1a0d;
      color: #7aaa7a; transition: all 0.2s;
    }
    .preset-btn:hover { border-color: #3a5a3a; color: #aad; }
    .preset-btn.active { background: #1a3a1a; border-color: #3acc5a; color: #fff; }

    .status {
      font-size: 0.65rem; color: #444; text-align: center; padding-top: 0.5rem;
    }
  </style>
</head>
<body>

<h1>Wavegrid · Master Controller</h1>
<div class="subtitle">${gridColumns}×${gridRows} Grid · ${numCannons} cannons</div>

<div class="columns">
<div class="col-left">

<div class="master">
  <div class="section-title">Scenes</div>
  <div class="scene-row" id="scene-row">
    ${sceneNames.map((name, i) => `<button class="scene-btn${i === 0 ? ' active' : ''}" data-scene="${name}">${name}</button>`).join('\n    ')}
  </div>

  <div class="section-title" style="margin-top:0.75rem">Animations</div>
  <div class="scene-row" id="anim-row">
    ${animationNames.map(name => `<button class="anim-btn" data-anim="${name}">${name}</button>`).join('\n    ')}
    <button class="anim-btn stop" id="anim-stop">stop</button>
  </div>

  <div class="section-title" style="margin-top:0.75rem">Envelope</div>
  <div class="slider-row">
    <label>Brightness</label>
    <input type="range" min="0" max="100" value="80" id="master-bright">
    <span class="val" id="master-bright-val">80%</span>
  </div>
  <div class="slider-row">
    <label>Smoothness</label>
    <input type="range" min="0" max="100" value="50" id="master-smooth">
    <span class="val" id="master-smooth-val">α 0.08</span>
  </div>
  <div class="slider-row">
    <label>Attack</label>
    <input type="range" min="0" max="100" value="100" id="master-attack">
    <span class="val" id="master-attack-val">1.00</span>
  </div>
  <div class="slider-row">
    <label>Idle timeout</label>
    <input type="range" min="0" max="30" value="0" id="idle-timeout">
    <span class="val" id="idle-timeout-val">off</span>
  </div>
  <div class="all-off" id="all-off">All Off</div>
</div>

<div class="ambient-section">
  <div class="section-title">Ambient Presets — walk away mode</div>
  <div class="preset-row" id="preset-row">
    <button class="preset-btn" data-preset="civic-breathe">Civic Breathe</button>
    <button class="preset-btn" data-preset="ocean-wave">Ocean Wave</button>
    <button class="preset-btn" data-preset="sunset-spiral">Sunset Spiral</button>
    <button class="preset-btn" data-preset="pride-rainbow">Pride Rainbow</button>
    <button class="preset-btn" data-preset="night-rain">Night Rain</button>
    <button class="preset-btn" data-preset="heartbeat">Heartbeat</button>
  </div>
  <div style="font-size:0.65rem;color:#555">Tap a preset → scene + animation + envelope are all set. Safe to walk away.</div>
</div>

</div>
<div class="col-right">

<div class="grid-section">
  <div class="section-title">Cannon Grid — tap to select</div>
  <div class="sel-actions">
    <button class="sel-btn" id="sel-all">Select All</button>
    <button class="sel-btn" id="sel-none">Clear</button>
  </div>
  <div class="rc-btns" id="rc-btns"></div>
  <div class="grid" id="cannon-grid"></div>
</div>

<div class="panel" id="panel">
  <div class="panel-header">
    <span class="panel-title" id="panel-title">Cannon 1</span>
    <button class="done-btn" id="done-btn">Done</button>
  </div>
  <div class="slider-row">
    <label>Brightness</label>
    <input type="range" min="0" max="100" value="80" id="panel-bright">
    <span class="val" id="panel-bright-val">80%</span>
  </div>
  <div class="slider-row">
    <label>Hue</label>
    <input type="range" min="0" max="360" value="220" id="panel-hue">
    <span class="val" id="panel-hue-val">220°</span>
  </div>
  <div class="slider-row">
    <label>Saturation</label>
    <input type="range" min="0" max="100" value="90" id="panel-sat">
    <span class="val" id="panel-sat-val">90%</span>
  </div>
</div>

<div class="telemetry" id="telemetry">
  <div>state: <span class="val-live" id="t-state">idle</span></div>
  <div>animation: <span class="val-anim" id="t-anim">none</span></div>
  <div>alpha (smooth): <span class="val-live" id="t-alpha">0.080</span></div>
  <div>attack: <span class="val-live" id="t-attack">1.000</span></div>
  <div>idle: <span class="val-live" id="t-idle">0s</span> / timeout: <span class="val-live" id="t-idle-max">off</span></div>
  <div>clients: <span class="val-live" id="t-clients">1</span></div>
</div>

</div>
</div>

<div class="status" id="status">Connecting...</div>

<script>
const NUM = ${numCannons};
const COLS = ${gridColumns};
const ws = new WebSocket('ws://' + location.host);
const status = document.getElementById('status');
const selected = new Set();

const display = Array.from({length: NUM}, () => ({ h: 220, s: 90, b: 80 }));

let currentAlpha = 0.08;
let currentAttack = 1.0;
let currentAnim = null;
let idleTimeout = 0;
let idleSeconds = 0;
let lastInputTime = Date.now();

ws.onopen = () => { status.textContent = 'Connected · ' + NUM + ' cannons · master controller'; };
ws.onclose = () => { status.textContent = 'Disconnected — reload page'; };

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'state') {
    for (let i = 0; i < NUM; i++) {
      display[i].h = msg.grid[i].h;
      display[i].s = msg.grid[i].s;
      display[i].b = msg.grid[i].b;
    }
  }
};

function send(data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
  lastInputTime = Date.now();
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Build grid
const gridEl = document.getElementById('cannon-grid');
for (let i = 0; i < NUM; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.id = 'cell-' + i;
  cell.innerHTML = '<div class="cell-beam" id="beam-' + i + '"></div><span class="cell-num">' + (i + 1) + '</span>';
  cell.addEventListener('click', () => toggleSelect(i));
  gridEl.appendChild(cell);
}

// Build row/col buttons
const rcEl = document.getElementById('rc-btns');
const ROWS = Math.ceil(NUM / COLS);
for (let r = 0; r < ROWS; r++) {
  const btn = document.createElement('button');
  btn.className = 'rc-btn';
  btn.textContent = 'R' + (r + 1);
  btn.addEventListener('click', () => {
    for (let c = 0; c < COLS; c++) { const idx = r * COLS + c; if (idx < NUM) selectOn(idx); }
    updatePanel();
  });
  rcEl.appendChild(btn);
}
for (let c = 0; c < COLS; c++) {
  const btn = document.createElement('button');
  btn.className = 'rc-btn';
  btn.textContent = 'C' + (c + 1);
  btn.addEventListener('click', () => {
    for (let r = 0; r < ROWS; r++) { const idx = r * COLS + c; if (idx < NUM) selectOn(idx); }
    updatePanel();
  });
  rcEl.appendChild(btn);
}

function selectOn(idx) {
  selected.add(idx);
  document.getElementById('cell-' + idx).classList.add('selected');
}

function toggleSelect(idx) {
  if (selected.has(idx)) {
    selected.delete(idx);
    document.getElementById('cell-' + idx).classList.remove('selected');
  } else {
    selected.add(idx);
    document.getElementById('cell-' + idx).classList.add('selected');
  }
  updatePanel();
}

function updatePanel() {
  const panel = document.getElementById('panel');
  const title = document.getElementById('panel-title');
  if (selected.size === 0) {
    panel.classList.remove('visible');
  } else {
    panel.classList.add('visible');
    title.textContent = selected.size === 1
      ? 'Cannon ' + ([...selected][0] + 1)
      : selected.size + ' cannons selected';
  }
}

// Selection controls
document.getElementById('sel-all').addEventListener('click', () => {
  for (let i = 0; i < NUM; i++) selectOn(i);
  updatePanel();
});
document.getElementById('sel-none').addEventListener('click', () => {
  selected.forEach(idx => document.getElementById('cell-' + idx).classList.remove('selected'));
  selected.clear();
  updatePanel();
});
document.getElementById('done-btn').addEventListener('click', () => {
  selected.forEach(idx => document.getElementById('cell-' + idx).classList.remove('selected'));
  selected.clear();
  updatePanel();
});

// ═══════════════════════════════════════════════════
// Master controls
// ═══════════════════════════════════════════════════
document.getElementById('master-bright').addEventListener('input', function() {
  const v = parseInt(this.value);
  document.getElementById('master-bright-val').textContent = v + '%';
  send({ type: 'master_brightness', value: v / 100 });
});

document.getElementById('master-smooth').addEventListener('input', function() {
  const pct = parseInt(this.value) / 100;
  const alpha = Math.pow(10, -2.7 * pct);
  currentAlpha = Math.max(0.002, Math.min(1.0, alpha));
  document.getElementById('master-smooth-val').textContent = 'α ' + currentAlpha.toFixed(3);
  send({ type: 'smoothness', value: currentAlpha });
});

document.getElementById('master-attack').addEventListener('input', function() {
  const pct = parseInt(this.value) / 100;
  currentAttack = 0.05 + pct * 0.95;
  document.getElementById('master-attack-val').textContent = currentAttack.toFixed(2);
  send({ type: 'attack', value: currentAttack });
});

document.getElementById('idle-timeout').addEventListener('input', function() {
  idleTimeout = parseInt(this.value);
  document.getElementById('idle-timeout-val').textContent = idleTimeout === 0 ? 'off' : idleTimeout + 'min';
  document.getElementById('t-idle-max').textContent = idleTimeout === 0 ? 'off' : idleTimeout + 'min';
});

// All off
document.getElementById('all-off').addEventListener('click', () => {
  document.getElementById('master-bright').value = 0;
  document.getElementById('master-bright-val').textContent = '0%';
  send({ type: 'master_brightness', value: 0 });
  currentAnim = null;
  document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
  send({ type: 'animation', name: 'stop' });
});

// ═══════════════════════════════════════════════════
// Scenes
// ═══════════════════════════════════════════════════
document.getElementById('scene-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.scene-btn');
  if (!btn) return;
  document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  send({ type: 'scene', name: btn.dataset.scene });
});

// ═══════════════════════════════════════════════════
// Animations
// ═══════════════════════════════════════════════════
document.getElementById('anim-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.anim-btn');
  if (!btn) return;

  if (btn.id === 'anim-stop' || btn.dataset.anim === currentAnim) {
    // Stop
    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    currentAnim = null;
    send({ type: 'animation', name: 'stop' });
    document.getElementById('t-anim').textContent = 'none';
    document.getElementById('t-state').textContent = 'idle';
  } else {
    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentAnim = btn.dataset.anim;
    send({ type: 'animation', name: currentAnim });
    document.getElementById('t-anim').textContent = currentAnim;
    document.getElementById('t-state').textContent = 'animating';
  }
});

// ═══════════════════════════════════════════════════
// Ambient Presets
// ═══════════════════════════════════════════════════
const PRESETS = {
  'civic-breathe':  { scene: 'civic',    anim: 'breathe',  smooth: 75, attack: 30 },
  'ocean-wave':     { scene: 'ocean',    anim: 'wave',     smooth: 70, attack: 40 },
  'sunset-spiral':  { scene: 'sunset',   anim: 'spiral',   smooth: 60, attack: 50 },
  'pride-rainbow':  { scene: 'pride',    anim: 'rainbow',  smooth: 55, attack: 60 },
  'night-rain':     { scene: 'ocean',    anim: 'rain',     smooth: 80, attack: 25 },
  'heartbeat':      { scene: 'off',      anim: 'heartbeat', smooth: 40, attack: 80 },
};

let activePreset = null;
document.getElementById('preset-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.preset-btn');
  if (!btn) return;
  const key = btn.dataset.preset;
  const preset = PRESETS[key];
  if (!preset) return;

  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activePreset = key;

  // Apply scene
  send({ type: 'scene', name: preset.scene });
  document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
  const sceneBtn = document.querySelector('[data-scene="' + preset.scene + '"]');
  if (sceneBtn) sceneBtn.classList.add('active');

  // Apply smoothness
  const smoothSlider = document.getElementById('master-smooth');
  smoothSlider.value = preset.smooth;
  smoothSlider.dispatchEvent(new Event('input'));

  // Apply attack
  const attackSlider = document.getElementById('master-attack');
  attackSlider.value = preset.attack;
  attackSlider.dispatchEvent(new Event('input'));

  // Start animation (slight delay so scene applies first)
  setTimeout(() => {
    send({ type: 'animation', name: preset.anim });
    currentAnim = preset.anim;
    document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
    const animBtn = document.querySelector('[data-anim="' + preset.anim + '"]');
    if (animBtn) animBtn.classList.add('active');
    document.getElementById('t-anim').textContent = preset.anim;
    document.getElementById('t-state').textContent = 'ambient: ' + key;
  }, 100);
});

// ═══════════════════════════════════════════════════
// Per-cannon controls
// ═══════════════════════════════════════════════════
document.getElementById('panel-bright').addEventListener('input', function() {
  const v = parseInt(this.value);
  document.getElementById('panel-bright-val').textContent = v + '%';
  send({ type: 'selection', indices: [...selected], b: v });
});
document.getElementById('panel-hue').addEventListener('input', function() {
  const v = parseInt(this.value);
  document.getElementById('panel-hue-val').textContent = v + '°';
  send({ type: 'selection', indices: [...selected], h: v });
});
document.getElementById('panel-sat').addEventListener('input', function() {
  const v = parseInt(this.value);
  document.getElementById('panel-sat-val').textContent = v + '%';
  send({ type: 'selection', indices: [...selected], s: v });
});

// ═══════════════════════════════════════════════════
// Idle timeout — auto-switch to ambient
// ═══════════════════════════════════════════════════
setInterval(() => {
  if (idleTimeout <= 0) {
    idleSeconds = 0;
    document.getElementById('t-idle').textContent = '0s';
    return;
  }
  idleSeconds = Math.floor((Date.now() - lastInputTime) / 1000);
  document.getElementById('t-idle').textContent = idleSeconds + 's';

  if (idleSeconds >= idleTimeout * 60 && activePreset === null) {
    // Auto-activate first preset on timeout
    const firstBtn = document.querySelector('.preset-btn');
    if (firstBtn) firstBtn.click();
  }
}, 1000);

// ═══════════════════════════════════════════════════
// Render loop
// ═══════════════════════════════════════════════════
function render() {
  for (let i = 0; i < NUM; i++) {
    const c = display[i];
    const beam = document.getElementById('beam-' + i);
    if (beam) {
      const lightness = Math.max(5, c.b * 0.5);
      beam.style.background = c.b < 1
        ? '#111'
        : hslToHex(c.h, c.s, lightness);
      beam.style.boxShadow = c.b > 20
        ? '0 0 ' + (c.b * 0.15) + 'px ' + hslToHex(c.h, c.s, lightness)
        : 'none';
    }
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
</script>
</body>
</html>`;
}
