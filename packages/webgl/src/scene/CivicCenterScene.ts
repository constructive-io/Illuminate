import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer, RenderPass, BloomEffect, EffectPass } from 'postprocessing';
import type { InstallationConfig, InstallationState, TimeOfDay } from '../installation/BeamState';
import { DEFAULT_CONFIG } from '../installation/BeamState';
import { LaserArray } from '../installation/LaserArray';
import { createTrussGrid } from '../installation/TrussGrid';
import { createCityHall, updateCityHallLighting } from './CityHall';
import { createPlaza, createStreetLamps } from './Plaza';
import { createTrees } from './Trees';
import { createCivicBuildings } from './CivicBuildings';
import { getCameraPresets, type CameraPreset } from '../ui/CameraPresets';
import { createHumanSilhouettes } from './Silhouettes';
import { createBenFigure, updateBenIPad } from './BenFigure';

const FT = 0.3048;

export interface SceneOptions {
  container: HTMLElement;
  config?: InstallationConfig;
  simulatorUrl?: string;
}

/**
 * Main 3D scene: Civic Center Plaza with the laser installation.
 */
export class CivicCenterScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly composer: EffectComposer;
  readonly laserArray: LaserArray;
  readonly presets: CameraPreset[];

  private config: InstallationConfig;
  private cityHall: THREE.Group;
  private streetLamps: THREE.Group;
  private civicBuildings: THREE.Group;
  private fog: THREE.FogExp2;
  private ambientLight: THREE.AmbientLight;
  private sunLight: THREE.DirectionalLight;
  private animFrameId = 0;
  private debugGroup: THREE.Group | null = null;
  private benIpadScreen: THREE.Mesh | null = null;
  /** Ben's world-space position (for camera presets) */
  readonly benPosition: THREE.Vector3;

  constructor(options: SceneOptions) {
    this.config = options.config || DEFAULT_CONFIG;
    // presets are finalized after Ben is placed (see below)
    this.presets = [];
    this.benPosition = new THREE.Vector3();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(options.container.clientWidth, options.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    options.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Fog
    this.fog = new THREE.FogExp2(0x050510, 0.003);
    this.scene.fog = this.fog;

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      options.container.clientWidth / options.container.clientHeight,
      0.1,
      2000
    );
    // Camera position set after presets are built (see below)

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.95;

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0x334466, 0.3);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffeedd, 0.5);
    this.sunLight.position.set(100, 200, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);

    // Build scene elements
    // City Hall — positioned behind (negative Z) the installation, ~150 ft back
    this.cityHall = createCityHall('night');
    this.cityHall.position.set(0, 0, -150 * FT);
    this.scene.add(this.cityHall);

    // Plaza
    const plaza = createPlaza();
    this.scene.add(plaza);

    // Trees
    const trees = createTrees();
    this.scene.add(trees);

    // Street lamps
    this.streetLamps = createStreetLamps('night');
    this.scene.add(this.streetLamps);

    // Surrounding buildings
    this.civicBuildings = createCivicBuildings('night');
    this.scene.add(this.civicBuildings);

    // Human silhouettes for scale
    const humans = createHumanSilhouettes(this.config);
    this.scene.add(humans);

    // Ben — figure holding iPad with 7×7 grid easter egg
    const ben = createBenFigure(this.config);
    this.scene.add(ben.group);
    this.benIpadScreen = ben.ipadScreen;
    this.benPosition.copy(ben.position);

    // Now build camera presets with Ben's position
    this.presets = getCameraPresets(this.config.footprintFt, this.benPosition);
    // Set default camera: drone oblique (index 4)
    const defaultPreset = this.presets[4];
    this.camera.position.copy(defaultPreset.position);
    this.controls.target.copy(defaultPreset.target);
    this.controls.update();

    // Truss
    const truss = createTrussGrid(this.config);
    this.scene.add(truss);

    // Laser beams
    this.laserArray = new LaserArray(this.config);
    this.scene.add(this.laserArray.group);

    // Post-processing (bloom for laser glow)
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloom = new BloomEffect({
      intensity: 1.5,
      luminanceThreshold: 0.2,
      luminanceSmoothing: 0.3,
      mipmapBlur: true
    });
    this.composer.addPass(new EffectPass(this.camera, bloom));

    // Set initial night scene
    this.setTimeOfDay('night');

    // Handle resize
    const onResize = () => {
      const w = options.container.clientWidth;
      const h = options.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.composer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
  }

  /**
   * Update beam visuals from installation state.
   */
  updateState(state: InstallationState): void {
    this.laserArray.update(state.beams, state.globalBrightness);
    if (this.fog.density !== state.haze * 0.008) {
      this.fog.density = state.haze * 0.008;
    }
    // Update Ben's iPad screen to mirror the beam colors
    if (this.benIpadScreen) {
      updateBenIPad(this.benIpadScreen, state.beams);
    }
  }

  /**
   * Switch time of day: adjusts sky, lighting, fog, building windows.
   */
  setTimeOfDay(tod: TimeOfDay): void {
    switch (tod) {
    case 'day':
      this.scene.background = new THREE.Color(0x87ceeb);
      this.ambientLight.intensity = 1.0;
      this.ambientLight.color.set(0xeeeeff);
      this.sunLight.intensity = 1.5;
      this.fog.density = 0.001;
      this.renderer.toneMappingExposure = 1.2;
      break;
    case 'dusk':
      this.scene.background = new THREE.Color(0x3a2a50);
      this.ambientLight.intensity = 0.4;
      this.ambientLight.color.set(0x886644);
      this.sunLight.intensity = 0.6;
      this.sunLight.color.set(0xff8844);
      this.sunLight.position.set(200, 30, 0);
      this.fog.density = 0.003;
      this.renderer.toneMappingExposure = 0.9;
      break;
    case 'night':
      this.scene.background = new THREE.Color(0x050510);
      this.ambientLight.intensity = 0.15;
      this.ambientLight.color.set(0x334466);
      this.sunLight.intensity = 0.1;
      this.sunLight.color.set(0x8888cc);
      this.sunLight.position.set(100, 200, 50);
      this.fog.density = 0.004;
      this.renderer.toneMappingExposure = 0.8;
      break;
    }

    // Update building windows
    updateCityHallLighting(this.cityHall, tod);

    // Rebuild street lamps and civic buildings with new lighting
    // (simpler than updating materials in place)
    this.scene.remove(this.streetLamps);
    this.streetLamps = createStreetLamps(tod);
    this.scene.add(this.streetLamps);

    this.scene.remove(this.civicBuildings);
    this.civicBuildings = createCivicBuildings(tod);
    this.scene.add(this.civicBuildings);

  }

  /**
   * Animate to a camera preset.
   */
  goToPreset(index: number): void {
    const preset = this.presets[index];
    if (!preset) return;
    this.camera.position.copy(preset.position);
    this.controls.target.copy(preset.target);
    this.controls.update();
  }

  /**
   * Toggle debug overlay: beam IDs, row/col labels, footprint dimensions.
   */
  toggleDebug(): void {
    if (this.debugGroup) {
      this.scene.remove(this.debugGroup);
      this.debugGroup = null;
      return;
    }

    this.debugGroup = new THREE.Group();
    this.debugGroup.name = 'DebugOverlay';

    const cols = this.config.gridColumns;
    const rows = Math.ceil(this.config.numCannons / cols);
    const spacing = (this.config.footprintFt / (cols - 1)) * FT;
    const halfW = ((cols - 1) * spacing) / 2;
    const halfD = ((rows - 1) * spacing) / 2;
    const trussH = this.config.trussHeightFt * FT;

    // Footprint outline
    const footprintGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW - 1, 0.1, -halfD - 1),
      new THREE.Vector3(halfW + 1, 0.1, -halfD - 1),
      new THREE.Vector3(halfW + 1, 0.1, halfD + 1),
      new THREE.Vector3(-halfW - 1, 0.1, halfD + 1),
      new THREE.Vector3(-halfW - 1, 0.1, -halfD - 1),
    ]);
    const footprintLine = new THREE.Line(
      footprintGeo,
      new THREE.LineBasicMaterial({ color: 0xff4444 })
    );
    this.debugGroup.add(footprintLine);

    // Beam position markers
    for (let i = 0; i < this.config.numCannons; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = -halfW + col * spacing;
      const z = -halfD + row * spacing;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.4, 16),
        new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, trussH + 0.2, z);
      this.debugGroup.add(ring);
    }

    this.scene.add(this.debugGroup);
  }

  /**
   * Start the render loop.
   */
  start(): void {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);
      this.controls.update();
      this.composer.render();
    };
    animate();
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  dispose(): void {
    this.stop();
    this.laserArray.dispose();
    this.renderer.dispose();
    this.composer.dispose();
  }
}
