/**
 * Receiver debug UI — a tiny HTTP server that shows the receiver's
 * 7×7 grid BEFORE routing / orientation remap.
 *
 * Enable by setting DEBUG_UI_PORT (e.g. DEBUG_UI_PORT=9999).
 * Open http://localhost:9999 in a browser on the same machine.
 *
 * This lets you verify that the receiver's pattern engine is producing
 * the correct grid values independently of BEYOND / routing config.
 */

import * as http from 'http';

import { FilteredCannon } from './filter';

export interface DebugUIConfig {
  port: number;
  gridColumns: number;
  /** Called each request to get the current grid snapshot. */
  getGrid: () => FilteredCannon[] | null;
}

export function startDebugUI(config: DebugUIConfig): http.Server {
  const { port, gridColumns, getGrid } = config;

  const server = http.createServer((req, res) => {
    if (req.url === '/grid') {
      const grid = getGrid();
      if (!grid) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end('[]');
        return;
      }
      // Return raw filtered values (h/s/b) — BEFORE orientation remap
      const data = grid.map(c => ({
        h: Math.round(c.h * 10) / 10,
        s: Math.round(c.s * 10) / 10,
        b: Math.round(c.b * 10) / 10
      }));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ cols: gridColumns, grid: data }));
      return;
    }

    // Serve the debug HTML page
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getDebugHTML(gridColumns));
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`  ◈ Debug UI: http://localhost:${port}`);
  });

  return server;
}

function getDebugHTML(cols: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Receiver Debug Grid</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #111; color: #eee; font-family: system-ui, sans-serif;
    display: flex; flex-direction: column; align-items: center;
    padding: 20px; min-height: 100vh;
  }
  h1 { font-size: 16px; margin-bottom: 8px; color: #888; }
  .info { font-size: 12px; color: #666; margin-bottom: 16px; }
  canvas {
    border: 1px solid #333; border-radius: 4px;
    image-rendering: pixelated;
  }
  .status {
    margin-top: 12px; font-size: 12px; color: #666;
  }
  .cell-info {
    margin-top: 8px; font-size: 13px; font-family: monospace;
    color: #aaa; min-height: 20px;
  }
  .legend {
    margin-top: 16px; font-size: 11px; color: #555;
    max-width: 500px; text-align: center; line-height: 1.5;
  }
</style>
</head>
<body>
<h1>Receiver Debug Grid</h1>
<div class="info">Raw filtered values — BEFORE orientation remap &amp; routing</div>
<canvas id="grid" width="490" height="490"></canvas>
<div class="cell-info" id="cellInfo">Hover a cell to inspect</div>
<div class="status" id="status">Connecting...</div>
<div class="legend">
  If this grid looks correct but BEYOND output is scrambled →
  the bug is in routing config, light-map, or BEYOND zone mapping.<br>
  If this grid is ALSO scrambled → the bug is in the pattern engine or receiver logic.
</div>
<script>
const COLS = ${cols};
const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const cellInfoEl = document.getElementById('cellInfo');
const CELL = Math.floor(canvas.width / COLS);
let lastGrid = null;
let frames = 0;
let lastFps = 0;
let fpsT = Date.now();

function hslToCSS(h, s, b) {
  // Convert HSB to HSL for CSS
  const l = b * (1 - s / 200);
  const sl = l === 0 || l === 100 ? 0 : ((b - l) / Math.min(l, 100 - l)) * 100;
  return 'hsl(' + h + ',' + Math.round(sl) + '%,' + Math.round(l) + '%)';
}

function draw(data) {
  const cols = data.cols || COLS;
  const grid = data.grid;
  const rows = Math.ceil(grid.length / cols);

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < grid.length; i++) {
    const c = grid[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * CELL;
    const y = row * CELL;

    if (c.b < 0.5) {
      ctx.fillStyle = '#1a1a1a';
    } else {
      ctx.fillStyle = hslToCSS(c.h, c.s, c.b);
    }
    ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);

    // Draw index number
    ctx.fillStyle = c.b > 50 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.3)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(i), x + CELL / 2, y + CELL / 2 + 4);
  }
  lastGrid = grid;
}

canvas.addEventListener('mousemove', (e) => {
  if (!lastGrid) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const col = Math.floor(x / CELL);
  const row = Math.floor(y / CELL);
  const idx = row * COLS + col;
  if (idx >= 0 && idx < lastGrid.length) {
    const c = lastGrid[idx];
    cellInfoEl.textContent =
      'Cell ' + idx + ' [r' + row + ' c' + col + ']: ' +
      'H=' + c.h + ' S=' + c.s + ' B=' + c.b;
  }
});

async function poll() {
  try {
    const res = await fetch('/grid');
    const data = await res.json();
    if (data.grid && data.grid.length > 0) {
      draw(data);
      frames++;
      const now = Date.now();
      if (now - fpsT >= 1000) {
        lastFps = frames;
        frames = 0;
        fpsT = now;
      }
      statusEl.textContent = 'Connected — ' + data.grid.length + ' cells, ' + lastFps + ' fps';
    } else {
      statusEl.textContent = 'Waiting for first command...';
    }
  } catch (e) {
    statusEl.textContent = 'Error: ' + e.message;
  }
  setTimeout(poll, 50); // ~20fps polling
}

poll();
</script>
</body>
</html>`;
}
