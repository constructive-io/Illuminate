import http from 'http';
import { WebSocket,WebSocketServer } from 'ws';

import {createGrid, DEFAULT_ALPHA, setAllTargets, setCannonTarget, tickGrid } from './grid';
import { applyScene, scenes } from './scenes';
import { getHTML } from './ui';

const PORT = parseInt(process.env.PORT || '3000', 10);
const TICK_MS = 1000 / 60; // 60fps interpolation

const grid = createGrid();
let currentAlpha = DEFAULT_ALPHA;
let currentAttack = 1.0;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(getHTML());
});

const wss = new WebSocketServer({ server });

function broadcastState() {
  const payload = JSON.stringify({
    type: 'state',
    grid: grid.map(c => ({ h: c.h, s: c.s, b: c.b }))
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  // Send initial state
  ws.send(JSON.stringify({
    type: 'state',
    grid: grid.map(c => ({ h: c.h, s: c.s, b: c.b }))
  }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(msg);
    } catch (_e) {
      // ignore malformed messages
    }
  });
});

function handleMessage(msg: any) {
  switch (msg.type) {
  case 'cannon':
    setCannonTarget(
      grid,
      msg.index,
      msg.h ?? undefined,
      msg.s ?? undefined,
      msg.b ?? undefined,
      currentAttack
    );
    break;
  case 'master_brightness':
    setAllTargets(grid, undefined, undefined, msg.value * 100, currentAttack);
    break;
  case 'scene':
    if (msg.name && scenes[msg.name]) {
      applyScene(grid, msg.name);
    }
    break;
  case 'selection':
    if (Array.isArray(msg.indices)) {
      for (const idx of msg.indices) {
        if (idx >= 0 && idx < grid.length) {
          setCannonTarget(
            grid,
            idx,
            msg.h ?? undefined,
            msg.s ?? undefined,
            msg.b ?? undefined,
            currentAttack
          );
        }
      }
    }
    break;
  case 'smoothness':
    if (typeof msg.value === 'number') {
      currentAlpha = msg.value;
    }
    break;
  case 'attack':
    if (typeof msg.value === 'number') {
      currentAttack = msg.value;
    }
    break;
  }
}

// Animation loop: tick interpolation and broadcast
setInterval(() => {
  const changed = tickGrid(grid, currentAlpha);
  if (changed) {
    broadcastState();
  }
}, TICK_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Illuminate · 7×7 Grid Simulator       ║');
  console.log('║   49 virtual cannons ready               ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  → http://localhost:${PORT}`);
  console.log('');
});

export { grid,server };
