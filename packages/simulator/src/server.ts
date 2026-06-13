import http from 'http';
import { WebSocket,WebSocketServer } from 'ws';

import { animations } from './animations';
import {createGrid, DEFAULT_ALPHA, setAllTargets, setCannonTarget, tickGrid } from './grid';
import { applyScene, scenes } from './scenes';
import { getHTML } from './ui';

const PORT = parseInt(process.env.PORT || '3000', 10);
const TICK_MS = 1000 / 60; // 60fps interpolation

const grid = createGrid();
let currentAlpha = DEFAULT_ALPHA;
let currentAttack = 1.0;
let currentAnimation: string | null = null;
let animationTick = 0;

// constructive.io brand mark — served as the favicon
const FAVICON_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M23.3315 21.7046V28.9348L26.2354 27.2232L29.8206 25.1157L36.9909 29.3307V37.761L30.1657 41.7731V41.785L22.9955 46L19.4102 43.8925L15.8343 41.7848V41.7749L12.5759 39.8595L9 37.7518V21.2924L12.5759 19.1847L15.8343 17.2694V9.25722L19.4102 7.14956L22.6685 5.23418V5.21521L26.2445 3.10755L29.8297 1L37 5.21499V13.6453L30.1657 17.6628V17.6873L23.3315 21.7046ZM16.16 17.8789L12.9168 19.7854L10.0443 21.4784L16.0542 25.0113L22.2948 21.4903L19.4101 19.7945L16.16 17.8789ZM23.6598 5.43249L29.7813 9.0309L35.955 5.40169L33.0743 3.70829L29.8297 1.80095L26.5853 3.70818L23.6598 5.43249ZM22.5139 38.2327L16.8333 41.5721L19.7511 43.2918L22.5185 44.9187L22.5196 38.2427L22.5139 38.2327ZM29.0399 33.6349L29.0153 33.5916L29.1105 33.5357L26.24 31.8482L23.3405 30.1438V33.546V36.9854L29.0399 33.6349ZM29.0998 9.43154L26.24 7.75041L22.9953 5.84307L19.7509 7.7503L16.8486 9.461L22.97 13.0595L29.0348 9.49437L29.0244 9.47595L29.0998 9.43154ZM16.5153 10.0661V13.4722V17.2854L22.5224 20.8167L22.5236 13.598L16.5153 10.0661ZM35.9458 29.5176L33.0651 27.8242L29.8205 25.9168L26.5761 27.8241L23.6705 29.5367L29.7919 33.1352L35.9458 29.5176ZM15.794 33.7218L12.5758 31.8299L9.68105 30.1237V33.5369V37.3517L12.9167 39.2589L15.7928 40.9496L15.794 33.7218ZM15.7954 25.7332L9.68116 22.1389V25.5074V29.3222L12.9168 31.2293L15.7943 32.9208L15.7954 25.7332Z" fill="#01A1FF"/>
</svg>`;

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.svg' || req.url === '/favicon.ico') {
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
    res.end(FAVICON_SVG);
    return;
  }
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
      currentAnimation = null;
      applyScene(grid, msg.name);
    }
    break;
  case 'animation':
    if (msg.name && animations[msg.name]) {
      currentAnimation = msg.name;
      animationTick = 0;
    } else if (msg.name === 'stop') {
      currentAnimation = null;
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
  if (currentAnimation && animations[currentAnimation]) {
    animations[currentAnimation](grid, animationTick, currentAttack);
    animationTick++;
  }
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
