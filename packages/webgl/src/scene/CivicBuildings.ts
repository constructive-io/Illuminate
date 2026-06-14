import * as THREE from 'three';

const FT = 0.3048;

/**
 * Simplified surrounding civic buildings as massing blocks.
 * These provide scale and context without photorealistic detail.
 */
export function createCivicBuildings(timeOfDay: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CivicBuildings';

  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0xbbbbaa,
    roughness: 0.75,
    metalness: 0.1
  });

  const darkBuildingMat = new THREE.MeshStandardMaterial({
    color: 0x888880,
    roughness: 0.7,
    metalness: 0.15
  });

  const windowEmissive = timeOfDay === 'day' ? 0 : timeOfDay === 'dusk' ? 0.15 : 0.3;

  // Buildings data: [x, z, width, depth, height, material]
  const buildings: Array<{
    x: number; z: number;
    w: number; d: number; h: number;
    mat: THREE.MeshStandardMaterial;
  }> = [
    // Asian Art Museum (left of City Hall)
    { x: -350 * FT, z: -30 * FT, w: 200 * FT, d: 120 * FT, h: 50 * FT, mat: buildingMat },
    // SF Public Library (right of City Hall)
    { x: 350 * FT, z: -30 * FT, w: 200 * FT, d: 130 * FT, h: 55 * FT, mat: buildingMat },
    // State Building (left of plaza)
    { x: -350 * FT, z: 250 * FT, w: 180 * FT, d: 100 * FT, h: 70 * FT, mat: darkBuildingMat },
    // Federal Building (right of plaza)
    { x: 350 * FT, z: 250 * FT, w: 180 * FT, d: 100 * FT, h: 80 * FT, mat: darkBuildingMat },
    // Pioneer Monument pedestal (between City Hall and plaza)
    { x: 0, z: -20 * FT, w: 20 * FT, d: 20 * FT, h: 25 * FT, mat: buildingMat },
  ];

  for (const b of buildings) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      b.mat.clone()
    );
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Window strips
    if (b.h > 30 * FT && windowEmissive > 0) {
      const winMat = new THREE.MeshStandardMaterial({
        color: 0xffe8a0,
        emissive: 0xffe8a0,
        emissiveIntensity: windowEmissive
      });
      const rows = Math.floor(b.h / (12 * FT));
      const cols = Math.floor(b.w / (15 * FT));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Add random window darkness for realism
          if (Math.random() > 0.7) continue;
          const win = new THREE.Mesh(
            new THREE.PlaneGeometry(5 * FT, 6 * FT),
            winMat
          );
          win.position.set(
            b.x + (c - (cols - 1) / 2) * (b.w / (cols + 1)),
            4 * FT + r * 12 * FT + 6 * FT,
            b.z + b.d / 2 + 0.1
          );
          group.add(win);
        }
      }
    }

    group.add(mesh);
  }

  return group;
}
