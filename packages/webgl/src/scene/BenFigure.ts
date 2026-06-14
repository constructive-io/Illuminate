import * as THREE from 'three';
import type { InstallationConfig } from '../installation/BeamState';

const FT = 0.3048;

/**
 * "Ben" — a figure standing in front of the rig holding an iPad
 * with a tiny 7×7 grid on the screen. An easter egg: he's "controlling" it.
 *
 * Returns { group, ipadScreen } so the scene can update the iPad grid colors
 * in sync with the actual laser beams.
 */
export function createBenFigure(config: InstallationConfig): {
  group: THREE.Group;
  ipadScreen: THREE.Mesh;
  /** Position of Ben in world space (for camera presets) */
  position: THREE.Vector3;
} {
  const group = new THREE.Group();
  group.name = 'Ben';

  const half = (config.footprintFt / 2) * FT;
  // Ben stands in front of the rig (positive Z side), facing it
  const benX = half * 0.3;
  const benZ = half + 12 * FT;

  const height = 5.8 * FT;

  // Yellow outfit — inspired by the real Ben
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xe8b800,
    roughness: 0.7,
    metalness: 0.05
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xd4a574,
    roughness: 0.7,
    metalness: 0
  });
  const blondHairMat = new THREE.MeshStandardMaterial({
    color: 0xc8a86e,
    roughness: 0.9,
    metalness: 0
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    roughness: 0.6,
    metalness: 0
  });

  // Legs (yellow pants)
  for (const side of [-0.09, 0.09]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, height * 0.42, 6),
      yellowMat
    );
    leg.position.set(benX + side, height * 0.21, benZ);
    leg.castShadow = true;
    group.add(leg);
  }

  // Torso (yellow shirt)
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.16, height * 0.35, 8),
    yellowMat
  );
  torso.position.set(benX, height * 0.6, benZ);
  torso.castShadow = true;
  group.add(torso);

  // Yellow scarf around neck
  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.035, 6, 12),
    scarfMat
  );
  scarf.position.set(benX, height * 0.76, benZ);
  scarf.rotation.x = Math.PI / 2;
  group.add(scarf);

  // Scarf tail hanging down
  const scarfTail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.02, height * 0.12, 5),
    scarfMat
  );
  scarfTail.position.set(benX + 0.08, height * 0.7, benZ + 0.05);
  scarfTail.rotation.z = 0.2;
  group.add(scarfTail);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(height * 0.085, 8, 6),
    skinMat
  );
  head.position.set(benX, height * 0.88, benZ);
  head.castShadow = true;
  group.add(head);

  // Blond hair — flowing, slightly longer
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(height * 0.09, 8, 6),
    blondHairMat
  );
  hair.position.set(benX, height * 0.91, benZ + 0.01);
  hair.scale.set(1, 0.85, 1.15);
  group.add(hair);

  // Hair sides (longer blond hair flowing down)
  for (const side of [-1, 1]) {
    const hairSide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.015, height * 0.08, 5),
      blondHairMat
    );
    hairSide.position.set(benX + side * 0.06, height * 0.84, benZ + 0.02);
    hairSide.rotation.z = side * 0.15;
    group.add(hairSide);
  }

  // Arms — angled forward to hold the iPad (yellow sleeves)
  const armMat = yellowMat;
  // Right arm
  const rightArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.035, height * 0.3, 5),
    armMat
  );
  rightArm.position.set(benX + 0.2, height * 0.55, benZ - 0.15);
  rightArm.rotation.x = -0.6;
  rightArm.rotation.z = -0.3;
  group.add(rightArm);

  // Left arm
  const leftArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.035, height * 0.3, 5),
    armMat
  );
  leftArm.position.set(benX - 0.2, height * 0.55, benZ - 0.15);
  leftArm.rotation.x = -0.6;
  leftArm.rotation.z = 0.3;
  group.add(leftArm);

  // iPad body
  const ipadWidth = 0.24;
  const ipadHeight = 0.18;
  const ipadDepth = 0.008;

  const ipadBody = new THREE.Mesh(
    new THREE.BoxGeometry(ipadWidth, ipadHeight, ipadDepth),
    new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.2
    })
  );
  // iPad held in front of chest, tilted slightly toward the viewer
  const ipadY = height * 0.52;
  const ipadZ = benZ - 0.28;
  ipadBody.position.set(benX, ipadY, ipadZ);
  ipadBody.rotation.x = -0.3; // tilted back slightly
  group.add(ipadBody);

  // iPad screen — a small plane with a canvas texture showing the 7×7 grid
  const screenWidth = ipadWidth * 0.88;
  const screenHeight = ipadHeight * 0.88;
  const screenGeo = new THREE.PlaneGeometry(screenWidth, screenHeight);

  // Create a canvas texture for the 7×7 grid
  const canvas = document.createElement('canvas');
  canvas.width = 140;
  canvas.height = 140;
  const ctx = canvas.getContext('2d')!;

  // Draw initial grid (dark with faint default pattern)
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, 140, 140);
  const cellSize = 140 / 7;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const cx = c * cellSize + cellSize / 2;
      const cy = r * cellSize + cellSize / 2;
      const radius = cellSize * 0.35;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, 'rgba(100, 140, 255, 0.8)');
      grad.addColorStop(0.6, 'rgba(60, 100, 200, 0.3)');
      grad.addColorStop(1, 'rgba(20, 30, 60, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const screenMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide
  });
  const ipadScreen = new THREE.Mesh(screenGeo, screenMat);
  ipadScreen.position.set(benX, ipadY, ipadZ - ipadDepth / 2 - 0.001);
  ipadScreen.rotation.x = -0.3; // match iPad tilt
  // Store canvas reference for live updates
  ipadScreen.userData.canvas = canvas;
  ipadScreen.userData.ctx = ctx;
  ipadScreen.userData.texture = texture;
  group.add(ipadScreen);

  // Small emissive glow from the iPad screen
  const screenGlow = new THREE.PointLight(0x4488ff, 0.3, 2);
  screenGlow.position.set(benX, ipadY, ipadZ - 0.05);
  group.add(screenGlow);

  return {
    group,
    ipadScreen,
    position: new THREE.Vector3(benX, 0, benZ)
  };
}

/**
 * Update the iPad screen to mirror the current beam colors.
 */
export function updateBenIPad(
  ipadScreen: THREE.Mesh,
  beamColors: Array<{ color: [number, number, number]; intensity: number; enabled: boolean }>
): void {
  const canvas = ipadScreen.userData.canvas as HTMLCanvasElement;
  const ctx = ipadScreen.userData.ctx as CanvasRenderingContext2D;
  const texture = ipadScreen.userData.texture as THREE.CanvasTexture;
  if (!canvas || !ctx || !texture) return;

  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, 140, 140);

  const cellSize = 140 / 7;
  for (let i = 0; i < Math.min(49, beamColors.length); i++) {
    const beam = beamColors[i];
    const r = Math.floor(i / 7);
    const c = i % 7;
    const cx = c * cellSize + cellSize / 2;
    const cy = r * cellSize + cellSize / 2;
    const radius = cellSize * 0.38;

    if (!beam.enabled || beam.intensity < 0.01) continue;

    const red = Math.round(beam.color[0] * 255);
    const green = Math.round(beam.color[1] * 255);
    const blue = Math.round(beam.color[2] * 255);
    const alpha = beam.intensity;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`);
    grad.addColorStop(0.5, `rgba(${red}, ${green}, ${blue}, ${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(${red * 0.3}, ${green * 0.3}, ${blue * 0.3}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  texture.needsUpdate = true;
}
