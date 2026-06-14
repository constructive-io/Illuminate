import * as THREE from 'three';

const FT = 0.3048; // feet to meters

/**
 * Simplified but recognizable SF City Hall:
 * - Classical rectangular base
 * - Central dome
 * - Front steps / portico
 * - Warm window glow at night
 */
export function createCityHall(timeOfDay: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CityHall';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd4c8a8,
    roughness: 0.7,
    metalness: 0.1
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: timeOfDay === 'day' ? 0x8899aa : 0xffe8a0,
    emissive: timeOfDay === 'day' ? 0x000000 : 0xffe8a0,
    emissiveIntensity: timeOfDay === 'day' ? 0 : 0.4,
    roughness: 0.3,
    metalness: 0.2
  });

  // Main rectangular base: ~307ft wide × 133ft deep × 60ft tall (simplified)
  const baseW = 307 * FT;
  const baseD = 133 * FT;
  const baseH = 60 * FT;
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(baseW, baseH, baseD),
    stoneMat
  );
  base.position.set(0, baseH / 2, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  // Window strips on the front face
  const windowRows = 3;
  const windowCols = 12;
  const ww = baseW * 0.06;
  const wh = baseH * 0.15;
  for (let r = 0; r < windowRows; r++) {
    for (let c = 0; c < windowCols; c++) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(ww, wh),
        windowMat
      );
      win.position.set(
        (c - (windowCols - 1) / 2) * (baseW * 0.07),
        baseH * 0.25 + r * (baseH * 0.25),
        baseD / 2 + 0.1
      );
      group.add(win);
    }
  }

  // Central dome: ~42ft radius, rising ~50ft above base
  const domeRadius = 42 * FT;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(domeRadius, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    stoneMat
  );
  dome.position.set(0, baseH, 0);
  dome.castShadow = true;
  group.add(dome);

  // Dome drum (cylindrical base under dome)
  const drumH = 20 * FT;
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(domeRadius * 0.95, domeRadius * 0.95, drumH, 32),
    stoneMat
  );
  drum.position.set(0, baseH + drumH / 2, 0);
  group.add(drum);

  // Lantern on top of dome
  const lanternH = 15 * FT;
  const lantern = new THREE.Mesh(
    new THREE.CylinderGeometry(4 * FT, 6 * FT, lanternH, 16),
    stoneMat
  );
  lantern.position.set(0, baseH + domeRadius + lanternH / 2, 0);
  group.add(lantern);

  // Front portico (columns suggestion)
  const porticoW = 80 * FT;
  const porticoD = 20 * FT;
  const porticoH = baseH * 0.85;
  const portico = new THREE.Mesh(
    new THREE.BoxGeometry(porticoW, porticoH, porticoD),
    stoneMat.clone()
  );
  (portico.material as THREE.MeshStandardMaterial).color.set(0xcfc3a3);
  portico.position.set(0, porticoH / 2, baseD / 2 + porticoD / 2);
  portico.castShadow = true;
  group.add(portico);

  // Front steps
  const stepsW = porticoW * 1.2;
  const stepsD = 25 * FT;
  const stepsH = 8 * FT;
  for (let s = 0; s < 5; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(stepsW - s * 3 * FT, stepsH / 5, stepsD - s * 4 * FT),
      stoneMat
    );
    step.position.set(0, s * (stepsH / 5) + stepsH / 10, baseD / 2 + porticoD + (stepsD - s * 4 * FT) / 2);
    step.receiveShadow = true;
    group.add(step);
  }

  return group;
}

export function updateCityHallLighting(group: THREE.Group, timeOfDay: string): void {
  const emissiveIntensity = timeOfDay === 'day' ? 0 : timeOfDay === 'dusk' ? 0.2 : 0.4;
  const emissiveColor = timeOfDay === 'day' ? 0x000000 : 0xffe8a0;

  group.traverse(child => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
      if (child.geometry instanceof THREE.PlaneGeometry) {
        child.material.emissive.set(emissiveColor);
        child.material.emissiveIntensity = emissiveIntensity;
        child.material.color.set(timeOfDay === 'day' ? 0x8899aa : 0xffe8a0);
      }
    }
  });
}
