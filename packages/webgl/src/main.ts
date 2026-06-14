import * as THREE from 'three';
import { CivicCenterScene } from './scene/CivicCenterScene';
import { StateController } from './control/StateController';
import { MessageReceiver } from './control/MessageReceiver';
import { DEFAULT_CONFIG, type TimeOfDay } from './installation/BeamState';
import { getCameraPresets } from './ui/CameraPresets';

const SIMULATOR_URL = 'ws://localhost:3000';

// ── State ──
const config = { ...DEFAULT_CONFIG };
const controller = new StateController(config);
const container = document.getElementById('viewer')!;
const scene = new CivicCenterScene({ container, config });

// ── WebSocket receiver ──
const receiver = new MessageReceiver(SIMULATOR_URL, controller);
receiver.connect();

// ── State → render ──
controller.onChange(state => scene.updateState(state));

// ── Render loop ──
scene.start();

// ── UI ──
const presets = getCameraPresets(config.footprintFt);

// Connection status
const statusDot = document.getElementById('status-dot')!;
setInterval(() => {
  statusDot.style.background = receiver.connected ? '#4f4' : '#f44';
  statusDot.title = receiver.connected ? 'Connected to Simulator' : 'Disconnected — reconnecting...';
}, 500);

// Camera presets
const presetContainer = document.getElementById('presets')!;
presets.forEach((p, i) => {
  const btn = document.createElement('button');
  btn.className = 'btn';
  btn.textContent = p.name;
  btn.onclick = () => scene.goToPreset(i);
  presetContainer.appendChild(btn);
});

// Time of day
const todBtns = document.querySelectorAll<HTMLButtonElement>('[data-tod]');
todBtns.forEach(btn => {
  btn.onclick = () => {
    const tod = btn.dataset.tod as TimeOfDay;
    controller.setTimeOfDay(tod);
    scene.setTimeOfDay(tod);
    todBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  };
});

// Sliders
function bindSlider(id: string, cb: (v: number) => void) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  const valEl = document.getElementById(id + '-val');
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    cb(v);
    if (valEl) valEl.textContent = v.toFixed(2);
  });
}

bindSlider('brightness', v => controller.setGlobalBrightness(v));
bindSlider('haze', v => controller.setHaze(v));
bindSlider('beam-height', v => scene.laserArray.setBeamHeight(v));
bindSlider('beam-width', v => scene.laserArray.setBeamWidth(v));

// Debug toggle
const debugBtn = document.getElementById('debug-btn');
if (debugBtn) {
  debugBtn.onclick = () => {
    scene.toggleDebug();
    debugBtn.classList.toggle('active');
  };
}

// Beam info on hover
const infoEl = document.getElementById('beam-info')!;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

container.addEventListener('mousemove', (e) => {
  const rect = container.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, scene.camera);
  const intersects = raycaster.intersectObjects(scene.laserArray.group.children, false);

  if (intersects.length > 0) {
    const mesh = intersects[0].object;
    const idx = scene.laserArray.group.children.indexOf(mesh);
    // Each beam has 4 meshes: beam, core, glow, fixture
    const beamIdx = Math.floor(idx / 4);
    if (beamIdx >= 0 && beamIdx < config.numCannons) {
      const beam = controller.state.beams[beamIdx];
      const r = Math.floor(beam.color[0] * 255);
      const g = Math.floor(beam.color[1] * 255);
      const b = Math.floor(beam.color[2] * 255);
      infoEl.textContent = `Beam #${beam.id} [${beam.row},${beam.col}] rgb(${r},${g},${b}) intensity:${beam.intensity.toFixed(2)}`;
      infoEl.style.display = 'block';
    }
  } else {
    infoEl.style.display = 'none';
  }
});
