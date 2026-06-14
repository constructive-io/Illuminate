import * as THREE from 'three';

const FT = 0.3048;

/**
 * Procedural tree rows lining the plaza.
 * Simple cone-on-cylinder geometry for performance.
 */
export function createTrees(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Trees';

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1a, roughness: 0.85 });

  const treePositions: [number, number][] = [];
  // Rows flanking the lawns
  for (const xSide of [-1, 1]) {
    for (let z = -60; z <= 300; z += 35) {
      treePositions.push([xSide * 85 * FT, z * FT]);
      treePositions.push([xSide * 230 * FT, z * FT]);
    }
  }

  for (const [x, z] of treePositions) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5 * FT, 0.7 * FT, 12 * FT, 6),
      trunkMat
    );
    trunk.position.set(x, 6 * FT, z);
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(
      new THREE.SphereGeometry(8 * FT, 8, 6),
      foliageMat
    );
    foliage.position.set(x, 18 * FT, z);
    foliage.castShadow = true;
    group.add(foliage);
  }

  return group;
}
