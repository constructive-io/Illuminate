import { scenes } from './scenes';

export function getHTML(): string {
  const sceneNames = Object.keys(scenes);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <title>Illuminate · 7×7 Simulator</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0a0a0a; color: #eee; padding: 1rem;
      min-height: 100vh;
    }
    h1 {
      font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;
      color: #ccc; letter-spacing: 0.03em;
    }
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
    .slider-row {
      display: flex; align-items: center; gap: 10px; margin-bottom: 0.6rem;
    }
    .slider-row label {
      font-size: 0.8rem; color: #777; min-width: 80px;
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
      font-size: 0.8rem; font-weight: 500; min-width: 38px; text-align: right; color: #888;
    }
    .all-off {
      width: 100%; padding: 10px; border-radius: 8px; margin-top: 0.5rem;
      background: #1a0808; border: 1px solid #3a1515; color: #c44;
      font-size: 0.85rem; font-weight: 500; cursor: pointer; text-align: center;
      transition: background 0.2s;
    }
    .all-off:hover { background: #2a1010; }

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
      grid-template-columns: repeat(7, 1fr);
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
      transition: none; /* driven by animation frame */
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

    .status {
      font-size: 0.65rem; color: #444; text-align: center; padding-top: 0.5rem;
    }
  </style>
</head>
<body>

<h1>Illuminate · 7×7 Civic Center</h1>

<div class="master">
  <div class="section-title">Scenes</div>
  <div class="scene-row" id="scene-row">
    ${sceneNames.map((name, i) => `<button class="scene-btn${i === 0 ? ' active' : ''}" data-scene="${name}">${name}</button>`).join('\n    ')}
  </div>
  <div class="section-title" style="margin-top:0.75rem">Master</div>
  <div class="slider-row">
    <label>Brightness</label>
    <input type="range" min="0" max="100" value="80" id="master-bright">
    <span class="val" id="master-bright-val">80%</span>
  </div>
  <div class="all-off" id="all-off">All Off</div>
</div>

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

<div class="status" id="status">Connecting...</div>

<script>
const NUM = 49;
const ws = new WebSocket('ws://' + location.host);
const status = document.getElementById('status');
const selected = new Set();

// Local display state (smoothly updated from server)
const display = Array.from({length: NUM}, () => ({ h: 220, s: 90, b: 80 }));

ws.onopen = () => { status.textContent = 'Connected · 49 cannons · smooth mode'; };
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
for (let r = 0; r < 7; r++) {
  const btn = document.createElement('button');
  btn.className = 'rc-btn';
  btn.textContent = 'R' + (r + 1);
  btn.addEventListener('click', () => {
    for (let c = 0; c < 7; c++) selectOn(r * 7 + c);
    updatePanel();
  });
  rcEl.appendChild(btn);
}
for (let c = 0; c < 7; c++) {
  const btn = document.createElement('button');
  btn.className = 'rc-btn';
  btn.textContent = 'C' + (c + 1);
  btn.addEventListener('click', () => {
    for (let r = 0; r < 7; r++) selectOn(r * 7 + c);
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

// Master brightness
document.getElementById('master-bright').addEventListener('input', function() {
  const v = parseInt(this.value);
  document.getElementById('master-bright-val').textContent = v + '%';
  send({ type: 'master_brightness', value: v / 100 });
});

// All off
document.getElementById('all-off').addEventListener('click', () => {
  document.getElementById('master-bright').value = 0;
  document.getElementById('master-bright-val').textContent = '0%';
  send({ type: 'master_brightness', value: 0 });
});

// Per-cannon controls
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

// Scenes
document.getElementById('scene-row').addEventListener('click', (e) => {
  const btn = e.target.closest('.scene-btn');
  if (!btn) return;
  document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  send({ type: 'scene', name: btn.dataset.scene });
});

// Render loop — updates beams from display state
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
