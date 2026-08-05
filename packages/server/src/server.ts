import { type Layout, loadWavegridConfig, type ResolvedConfig } from '@wavegrid/layout';
import * as fs from 'fs';
import http from 'http';
import { resolve } from 'path';
import { URL } from 'url';
import { WebSocket,WebSocketServer } from 'ws';

import { animations } from './animations';
import type { BlendMode, CannonState, Orientation, Rotation } from './grid';
import {compositeLayer, createGrid, DEFAULT_ALPHA, defaultOrientation, mapUiToGrid, remapGridForUi, resetGrid, setAllTargets, setCannonTarget, shiftGrid, tickGrid } from './grid';
import { verifyJwt } from './jwt';
import { ServerPatternEngine } from './pattern-engine';
import { compilePlaylist, type PlaylistDef, type PlaylistStep } from './playlist-compiler';
import { applyScene, scenes } from './scenes';

export interface ServerHandle {
  server: http.Server;
  grid: ReturnType<typeof createGrid>;
  stop: () => void;
}

/**
 * Start the wavegrid server. Accepts an already-resolved config (so an
 * embedding process like the CLI can pass the layout it resolved) and
 * otherwise loads it from cwd/env. Returns a handle with a stop() for
 * clean in-process shutdown.
 */
export function startServer(resolved: ResolvedConfig = loadWavegridConfig()): ServerHandle {
  const layout: Layout = resolved.layout;
  const NUM_CANNONS = layout.count;
  const GRID_COLUMNS = layout.cols;
  const GRID_ROWS = layout.rows;
  const RUN_MODE = resolved.runMode;

  const PORT = resolved.config.server.port;
  const TICK_MS = 1000 / 60; // 60fps interpolation

  const LIGHT_MAP_FILE = process.env.LIGHT_MAP_CONFIG || resolve(process.cwd(), '../../deploy/light-map.json');

  // ── State persistence ─────────────────────────────────────────────
  // The CLI points WG_STATE_DIR at the per-project store; standalone runs
  // fall back to a local .state dir.
  const STATE_DIR = process.env.WG_STATE_DIR || resolve(process.cwd(), '.state');
  const STATE_FILE = resolve(STATE_DIR, `server-${PORT}.json`);

interface PersistedState {
  currentAnimation: string | null;
  animSpeed: number;
  currentAlpha: number;
  currentAttack: number;
  orientation: Orientation;
  shiftVx: number;
  shiftVy: number;
  grid: Array<{ h: number; s: number; b: number }>;
  playlist: PlaylistDef | null;
}

function loadPersistedState(): PersistedState | null {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const state: PersistedState = {
      currentAnimation,
      animSpeed,
      currentAlpha,
      currentAttack,
      orientation,
      shiftVx,
      shiftVy,
      grid: grid.map(c => ({ h: c.targetH, s: c.targetS, b: c.targetB })),
      playlist: activePlaylist
    };
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
    } catch (e) {
      console.error('  ◈ State save error:', e instanceof Error ? e.message : String(e));
    }
  }, 1000);
}

// ── Grid & state variables ────────────────────────────────────────
const grid = createGrid(NUM_CANNONS);
let currentAlpha = DEFAULT_ALPHA;
let currentAttack = 1.0;
let currentAnimation: string | null = null;
let animationTick = 0;
let animSpeed = 1.0;
let audioLayer: CannonState[] | null = null;
let audioBlend: BlendMode = 'replace';
let videoLayer: CannonState[] | null = null;
let videoBlend: BlendMode = 'replace';
let calibrationMode = false;
let previewPhysicalIndex: number | null = null;
let orientation: Orientation = defaultOrientation();
let shiftVx = 0;
let shiftVy = 0;
let shiftAccX = 0;
let shiftAccY = 0;
let activePlaylist: PlaylistDef | null = null;
let playlistCurrentStep = 0;
const patternEngine = new ServerPatternEngine(layout);

// Restore persisted state on boot
const restored = loadPersistedState();
if (restored) {
  currentAnimation = restored.currentAnimation && animations[restored.currentAnimation] ? restored.currentAnimation : null;
  animSpeed = restored.animSpeed ?? animSpeed;
  currentAlpha = restored.currentAlpha ?? currentAlpha;
  currentAttack = restored.currentAttack ?? currentAttack;
  if (restored.orientation) orientation = { ...defaultOrientation(), ...restored.orientation };
  shiftVx = restored.shiftVx ?? 0;
  shiftVy = restored.shiftVy ?? 0;
  if (Array.isArray(restored.grid)) {
    for (let i = 0; i < Math.min(restored.grid.length, grid.length); i++) {
      const c = restored.grid[i];
      grid[i].targetH = c.h ?? 0;
      grid[i].targetS = c.s ?? 0;
      grid[i].targetB = c.b ?? 0;
      grid[i].h = c.h ?? 0;
      grid[i].s = c.s ?? 0;
      grid[i].b = c.b ?? 0;
    }
  }
  activePlaylist = restored.playlist ?? null;
  console.log(`  ◈ Restored state from ${STATE_FILE}`);
}

const server = http.createServer((req, res) => {
  // No HTML UI served — only WebSocket connections are accepted on this port.
  res.writeHead(204);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

const RECEIVER_KEY = process.env.WG_RECEIVER_KEY || '';

server.on('upgrade', (req, socket, head) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const token = reqUrl.searchParams.get('token');
  const key = reqUrl.searchParams.get('key');

  // Require either a valid JWT token or a valid receiver key.
  // Connections with neither are rejected.
  if (token) {
    const payload = verifyJwt(token);
    if (!payload) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
  } else if (key && RECEIVER_KEY && key === RECEIVER_KEY) {
    // valid receiver key — allow
  } else {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// Broadcast the current grid snapshot to all UI clients.
// Used for calibration, orientation changes, and paint/clear — so the
// browser UI preview stays up-to-date.  Receivers ignore these messages
// (they only act on {type:"command"} packets).
function broadcastState() {
  const output = calibrationMode
    ? getCalibrationOutput()
    : remapGridForUi(
      (() => {
        let base = grid.map(c => ({ h: c.h, s: c.s, b: c.b }));
        if (audioLayer) base = compositeLayer(base, audioLayer, audioBlend);
        if (videoLayer) base = compositeLayer(base, videoLayer, videoBlend);
        return base;
      })(),
      GRID_COLUMNS, GRID_ROWS, orientation
    );
  const payload = JSON.stringify({ type: 'state', grid: output });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function getCalibrationOutput(): CannonState[] {
  const output = Array.from({ length: NUM_CANNONS }, () => ({ h: 0, s: 0, b: 0 }));
  if (previewPhysicalIndex === null) return output;

  const map = loadPhysicalLightMap();
  const logicalIndex = map.indexOf(previewPhysicalIndex);
  const index = logicalIndex >= 0 ? logicalIndex : previewPhysicalIndex;
  if (index >= 0 && index < output.length) {
    output[index] = { h: 45, s: 0, b: 100 };
  }
  return output;
}

function loadPhysicalLightMap(): number[] {
  const identity = Array.from({ length: NUM_CANNONS }, (_, index) => index);
  try {
    const raw = fs.readFileSync(LIGHT_MAP_FILE, 'utf8');
    const config = JSON.parse(raw);
    if (!Array.isArray(config.physicalLights)) return identity;
    const used = new Set<number>();
    return identity.map((fallback, index) => {
      const value = Number(config.physicalLights[index]);
      if (!Number.isInteger(value) || value < 0 || value >= NUM_CANNONS || used.has(value)) {
        used.add(fallback);
        return fallback;
      }
      used.add(value);
      return value;
    });
  } catch {
    return identity;
  }
}

function broadcastOrientation() {
  const payload = JSON.stringify({ type: 'orientation', ...orientation });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastCommand(cmd: Record<string, unknown>) {
  const payload = JSON.stringify({ type: 'command', ...cmd });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastPlaylistState() {
  const payload = JSON.stringify({
    type: 'playlist_state',
    active: activePlaylist !== null,
    playlist: activePlaylist,
    currentStep: playlistCurrentStep
  });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

/** Cancel any active playlist when another visual command arrives. */
function cancelPlaylistIfActive() {
  if (activePlaylist) {
    activePlaylist = null;
    broadcastPlaylistState();
    scheduleSave();
  }
}

wss.on('connection', (ws) => {
  // Send the resolved layout first — the single source of truth for geometry —
  // so UI and receiver render/route from the same fixtures the server uses.
  ws.send(JSON.stringify({ type: 'layout', layout, runMode: RUN_MODE }));
  // Send initial state + orientation
  const initGrid = remapGridForUi(
    grid.map(c => ({ h: c.h, s: c.s, b: c.b })),
    GRID_COLUMNS, GRID_ROWS, orientation
  );
  ws.send(JSON.stringify({ type: 'state', grid: initGrid }));
  ws.send(JSON.stringify({ type: 'orientation', ...orientation }));
  ws.send(JSON.stringify({ type: 'command', action: 'setOrientation', rotation: orientation.rotation, flipH: orientation.flipH, flipV: orientation.flipV }));
  ws.send(JSON.stringify({ type: 'command', action: 'setSmoothness', value: currentAlpha }));
  ws.send(JSON.stringify({ type: 'command', action: 'setAttack', value: currentAttack }));
  ws.send(JSON.stringify({ type: 'command', action: 'setSpeed', value: animSpeed }));
  ws.send(JSON.stringify({
    type: 'settings',
    alpha: currentAlpha,
    attack: currentAttack,
    speed: animSpeed,
    animation: currentAnimation
  }));
  if (currentAnimation) {
    ws.send(JSON.stringify({ type: 'command', action: 'setAnimation', name: currentAnimation, speed: animSpeed }));
  }
  if (activePlaylist) {
    ws.send(JSON.stringify({ type: 'playlist_state', active: true, playlist: activePlaylist }));
    // Re-send compiled playlist to receiver on reconnect
    const compiled = compilePlaylist(activePlaylist);
    ws.send(JSON.stringify({ type: 'command', action: 'evalPattern', code: compiled, params: {} }));
  }
  if (shiftVx !== 0 || shiftVy !== 0) {
    ws.send(JSON.stringify({ type: 'command', action: 'setShift', vx: shiftVx, vy: shiftVy }));
  }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(msg);
    } catch {
      // ignore malformed messages
    }
  });
});

function handleMessage(msg: any) {
  switch (msg.type) {
  case 'cannon': {
    currentAnimation = null;
    const gi = mapUiToGrid(msg.index, GRID_COLUMNS, GRID_ROWS, orientation);
    setCannonTarget(
      grid,
      gi,
      msg.h ?? undefined,
      msg.s ?? undefined,
      msg.b ?? undefined,
      currentAttack
    );
    broadcastCommand({ action: 'paint', cells: [{ idx: gi, h: msg.h ?? 0, s: msg.s ?? 0, b: msg.b ?? 0 }] });
    scheduleSave();
    break;
  }
  case 'master_brightness':
    setAllTargets(grid, undefined, undefined, msg.value * 100, currentAttack);
    broadcastCommand({ action: 'setBrightness', value: msg.value * 100 });
    scheduleSave();
    break;
  case 'scene':
    if (msg.name && scenes[msg.name]) {
      currentAnimation = null;
      cancelPlaylistIfActive();
      patternEngine.stop();
      applyScene(grid, msg.name, layout);
      broadcastCommand({ action: 'setScene', name: msg.name });
      scheduleSave();
    }
    break;
  case 'animation':
    if (msg.name && animations[msg.name]) {
      currentAnimation = msg.name;
      animationTick = 0;
      cancelPlaylistIfActive();
      patternEngine.stop();
      broadcastCommand({ action: 'setAnimation', name: msg.name, speed: animSpeed });
      scheduleSave();
    } else if (msg.name === 'stop') {
      currentAnimation = null;
      cancelPlaylistIfActive();
      patternEngine.stop();
      broadcastCommand({ action: 'stop' });
      scheduleSave();
    }
    break;
  case 'calibration_mode':
    calibrationMode = !!msg.enabled;
    if (!calibrationMode) previewPhysicalIndex = null;
    broadcastState();
    break;
  case 'physical_preview':
    if (typeof msg.physicalIndex === 'number') {
      calibrationMode = true;
      previewPhysicalIndex = Math.max(0, Math.min(NUM_CANNONS - 1, Math.round(msg.physicalIndex)));
      broadcastState();
    }
    break;
  case 'physical_preview_clear':
    previewPhysicalIndex = null;
    if (calibrationMode) broadcastState();
    break;
  case 'selection':
    if (Array.isArray(msg.indices)) {
      currentAnimation = null;
      cancelPlaylistIfActive();
      patternEngine.stop();
      const cells: Array<{ idx: number; h: number; s: number; b: number }> = [];
      for (const uiIdx of msg.indices) {
        const gi = mapUiToGrid(uiIdx, GRID_COLUMNS, GRID_ROWS, orientation);
        if (gi >= 0 && gi < grid.length) {
          setCannonTarget(
            grid,
            gi,
            msg.h ?? undefined,
            msg.s ?? undefined,
            msg.b ?? undefined,
            currentAttack
          );
          cells.push({ idx: gi, h: msg.h ?? 0, s: msg.s ?? 0, b: msg.b ?? 0 });
        }
      }
      if (cells.length > 0) {
        broadcastCommand({ action: 'paint', cells });
      }
      scheduleSave();
    }
    break;
  case 'audio_layer':
    if (Array.isArray(msg.grid)) {
      // Remap audio layer from UI coordinate space to grid space
      const remapped = new Array<CannonState>(msg.grid.length);
      for (let ui = 0; ui < msg.grid.length; ui++) {
        const gi = mapUiToGrid(ui, GRID_COLUMNS, GRID_ROWS, orientation);
        remapped[gi] = msg.grid[ui];
      }
      audioLayer = remapped;
      audioBlend = msg.blend || 'replace';
      broadcastState();
    }
    break;
  case 'audio_layer_clear':
    audioLayer = null;
    broadcastState();
    break;
  case 'video_layer':
    if (Array.isArray(msg.grid)) {
      const remapped = new Array<CannonState>(msg.grid.length);
      for (let ui = 0; ui < msg.grid.length; ui++) {
        const gi = mapUiToGrid(ui, GRID_COLUMNS, GRID_ROWS, orientation);
        remapped[gi] = msg.grid[ui];
      }
      videoLayer = remapped;
      videoBlend = msg.blend || 'replace';
      broadcastState();
    }
    break;
  case 'video_layer_clear':
    videoLayer = null;
    broadcastState();
    break;
  case 'smoothness':
    if (typeof msg.value === 'number') {
      currentAlpha = msg.value;
      broadcastCommand({ action: 'setSmoothness', value: msg.value });
      scheduleSave();
    }
    break;
  case 'attack':
    if (typeof msg.value === 'number') {
      currentAttack = msg.value;
      broadcastCommand({ action: 'setAttack', value: msg.value });
      scheduleSave();
    }
    break;
  case 'clear':
    currentAnimation = null;
    cancelPlaylistIfActive();
    patternEngine.stop();
    resetGrid(grid);
    broadcastCommand({ action: 'clear' });
    broadcastState();
    scheduleSave();
    break;
  case 'rotate': {
    const delta = msg.direction === 'ccw' ? 270 : 90;
    orientation = {
      ...orientation,
      rotation: ((orientation.rotation + delta) % 360) as Rotation
    };
    broadcastOrientation();
    broadcastCommand({ action: 'setOrientation', rotation: orientation.rotation, flipH: orientation.flipH, flipV: orientation.flipV });
    broadcastState();
    scheduleSave();
    break;
  }
  case 'mirror':
    if (msg.axis === 'vertical') {
      orientation = { ...orientation, flipV: !orientation.flipV };
    } else {
      orientation = { ...orientation, flipH: !orientation.flipH };
    }
    broadcastOrientation();
    broadcastCommand({ action: 'setOrientation', rotation: orientation.rotation, flipH: orientation.flipH, flipV: orientation.flipV });
    broadcastState();
    scheduleSave();
    break;
  case 'shift':
    shiftVx = typeof msg.vx === 'number' ? msg.vx : 0;
    shiftVy = typeof msg.vy === 'number' ? msg.vy : 0;
    if (shiftVx === 0 && shiftVy === 0) {
      shiftAccX = 0;
      shiftAccY = 0;
    }
    broadcastCommand({ action: 'setShift', vx: shiftVx, vy: shiftVy });
    scheduleSave();
    break;
  case 'anim_speed':
    if (typeof msg.value === 'number') {
      animSpeed = Math.max(0.001, Math.min(5.0, msg.value));
      patternEngine.speed = animSpeed;
      broadcastCommand({ action: 'setSpeed', value: animSpeed });
      scheduleSave();
    }
    break;
  case 'evalPattern':
    if (typeof msg.code === 'string') {
      currentAnimation = null;
      cancelPlaylistIfActive();
      patternEngine.load(msg.code);
      broadcastCommand({
        action: 'evalPattern',
        code: msg.code,
        params: msg.params || {}
      });
    }
    break;
  case 'setPatternParam':
    if (typeof msg.name === 'string') {
      broadcastCommand({
        action: 'setPatternParam',
        name: msg.name,
        value: msg.value
      });
    }
    break;
  case 'stopPattern':
    patternEngine.stop();
    broadcastCommand({ action: 'stopPattern' });
    break;
  case 'playlist':
    if (Array.isArray(msg.steps) && msg.steps.length > 0) {
      const playlistDef: PlaylistDef = {
        steps: msg.steps as PlaylistStep[],
        loop: msg.loop !== false,
        transition: msg.transition === 'fade' ? 'fade' : 'cut',
        transitionDuration: typeof msg.transitionDuration === 'number' ? msg.transitionDuration : 2
      };
      activePlaylist = playlistDef;
      playlistCurrentStep = typeof msg.startAt === 'number' ? msg.startAt : 0;
      currentAnimation = null;
      const compiled = compilePlaylist(playlistDef, playlistCurrentStep);
      patternEngine.load(compiled);
      broadcastCommand({ action: 'evalPattern', code: compiled, params: {} });
      broadcastPlaylistState();
      scheduleSave();
    }
    break;
  case 'playlist_stop':
    activePlaylist = null;
    playlistCurrentStep = 0;
    patternEngine.stop();
    broadcastCommand({ action: 'stopPattern' });
    broadcastPlaylistState();
    scheduleSave();
    break;
  case 'playlist_skip':
    if (activePlaylist) {
      const stepCount = activePlaylist.steps.length;
      const direction = msg.direction === 'back' ? -1 : 1;
      playlistCurrentStep = ((playlistCurrentStep + direction) % stepCount + stepCount) % stepCount;
      const recompiled = compilePlaylist(activePlaylist, playlistCurrentStep);
      patternEngine.load(recompiled);
      broadcastCommand({ action: 'evalPattern', code: recompiled, params: {} });
      broadcastPlaylistState();
      scheduleSave();
    }
    break;
  case 'playlist_get':
    // Respond with current playlist state (handled per-client below)
    break;
  }
}

// Animation loop: tick the local grid interpolation (for UI preview)
// and send periodic keepalive commands so receivers don't fallback.
const COMMAND_KEEPALIVE_FRAMES = 120; // ~2 seconds at 60fps
let framesSinceLastCommand = 0;

const tickTimer = setInterval(() => {
  if (!calibrationMode && currentAnimation && animations[currentAnimation]) {
    animations[currentAnimation](grid, animationTick, currentAttack, layout);
    animationTick += animSpeed;
  } else if (!calibrationMode && patternEngine.active) {
    // Render evalPattern locally for UI preview — write to targets so tickGrid lerps smoothly
    const previewGrid = grid.map(c => ({ h: c.targetH, s: c.targetS, b: c.targetB }));
    if (patternEngine.render(previewGrid)) {
      for (let i = 0; i < previewGrid.length && i < grid.length; i++) {
        grid[i].targetH = previewGrid[i].h;
        grid[i].targetS = previewGrid[i].s;
        grid[i].targetB = previewGrid[i].b;
      }
    }
  }
  if (shiftVx !== 0 || shiftVy !== 0) {
    shiftAccX += shiftVx / 60;
    shiftAccY += shiftVy / 60;
    const stepsX = Math.trunc(shiftAccX);
    const stepsY = Math.trunc(shiftAccY);
    if (stepsX !== 0 || stepsY !== 0) {
      shiftGrid(grid, GRID_COLUMNS, GRID_ROWS, stepsX, stepsY);
      shiftAccX -= stepsX;
      shiftAccY -= stepsY;
    }
  }
  tickGrid(grid, currentAlpha);

  // When audio/video layers are active, composite them with the base grid and
  // send paint commands to receivers so the lasers reflect the visuals.
  if (audioLayer || videoLayer) {
    let base = grid.map(c => ({ h: c.h, s: c.s, b: c.b }));
    if (audioLayer) base = compositeLayer(base, audioLayer, audioBlend);
    if (videoLayer) base = compositeLayer(base, videoLayer, videoBlend);
    const cells = base.map((c, i) => ({ idx: i, h: c.h, s: c.s, b: c.b }));
    broadcastCommand({ action: 'paint', cells });
    framesSinceLastCommand = 0;
  }

  // Send grid state to UI clients so the preview stays in sync
  broadcastState();

  // Periodic keepalive so receivers don't enter fallback
  framesSinceLastCommand++;
  if (framesSinceLastCommand >= COMMAND_KEEPALIVE_FRAMES) {
    broadcastCommand({ action: 'keepalive' });
    framesSinceLastCommand = 0;
  }
}, TICK_MS);

server.listen(PORT, resolved.config.server.host, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Wavegrid Server                         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → Layout: ${layout.name} (${layout.topology}, ${NUM_CANNONS} cannons)`);
  console.log(`  → Run mode: ${RUN_MODE}`);
  console.log('  → Mode: command relay');
  console.log('');
});

const stop = () => {
  clearInterval(tickTimer);
  if (saveTimer) clearTimeout(saveTimer);
  wss.close();
  server.close();
};

return { server, grid, stop };
}

// Run directly (dev script / node bin). The CLI imports startServer instead.
if (typeof require !== 'undefined' && require.main === module) {
  startServer();
}
