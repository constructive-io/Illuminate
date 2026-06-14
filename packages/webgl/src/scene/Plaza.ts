import * as THREE from 'three';

const FT = 0.3048;

/**
 * Civic Center Plaza: lawns, paved walkways, sidewalks, street edges.
 */
export function createPlaza(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Plaza';

  // Ground plane
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    roughness: 0.9,
    metalness: 0
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200 * FT, 1200 * FT),
    groundMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  group.add(ground);

  // Main plaza paved area
  const pavementMat = new THREE.MeshStandardMaterial({
    color: 0x999990,
    roughness: 0.8,
    metalness: 0
  });
  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(400 * FT, 400 * FT),
    pavementMat
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.01, 120 * FT);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Lawn rectangles (two flanking the civic axis)
  const lawnMat = new THREE.MeshStandardMaterial({
    color: 0x3a6622,
    roughness: 0.95,
    metalness: 0
  });

  const lawnW = 140 * FT;
  const lawnD = 250 * FT;
  for (const side of [-1, 1]) {
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(lawnW, lawnD),
      lawnMat
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(side * 150 * FT, 0.02, 120 * FT);
    lawn.receiveShadow = true;
    group.add(lawn);
  }

  // Central walkway (civic axis)
  const walkwayMat = new THREE.MeshStandardMaterial({
    color: 0xaaa89a,
    roughness: 0.75,
    metalness: 0
  });
  const walkway = new THREE.Mesh(
    new THREE.PlaneGeometry(50 * FT, 500 * FT),
    walkwayMat
  );
  walkway.rotation.x = -Math.PI / 2;
  walkway.position.set(0, 0.03, 120 * FT);
  walkway.receiveShadow = true;
  group.add(walkway);

  // Street curbs (simplified boxes)
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
  for (const zOff of [-180, 420]) {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(500 * FT, 0.5 * FT, 3 * FT),
      curbMat
    );
    curb.position.set(0, 0.25 * FT, zOff * FT);
    group.add(curb);
  }

  // Bollards along walkway
  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.3, roughness: 0.5 });
  for (const side of [-1, 1]) {
    for (let z = -50; z <= 300; z += 40) {
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3 * FT, 0.4 * FT, 3 * FT, 8),
        bollardMat
      );
      bollard.position.set(side * 26 * FT, 1.5 * FT, z * FT);
      bollard.castShadow = true;
      group.add(bollard);
    }
  }

  return group;
}

/**
 * Street lamps along the plaza edges.
 */
export function createStreetLamps(timeOfDay: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StreetLamps';

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.4 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffeedd,
    emissive: timeOfDay === 'day' ? 0x000000 : 0xffeedd,
    emissiveIntensity: timeOfDay === 'day' ? 0 : 0.8
  });

  const positions: [number, number][] = [];
  for (const xSide of [-1, 1]) {
    for (let z = -100; z <= 350; z += 80) {
      positions.push([xSide * 220 * FT, z * FT]);
    }
  }

  for (const [x, z] of positions) {
    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15 * FT, 0.2 * FT, 16 * FT, 6),
      poleMat
    );
    pole.position.set(x, 8 * FT, z);
    pole.castShadow = true;
    group.add(pole);

    // Lamp head
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(1.2 * FT, 8, 6),
      lampMat
    );
    lamp.position.set(x, 16.5 * FT, z);
    group.add(lamp);

    // Point light at night
    if (timeOfDay !== 'day') {
      const light = new THREE.PointLight(0xffeedd, timeOfDay === 'dusk' ? 0.3 : 0.6, 80 * FT);
      light.position.set(x, 16 * FT, z);
      group.add(light);
    }
  }

  return group;
}
