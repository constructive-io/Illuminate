import * as THREE from 'three';
import type { InstallationConfig } from '../installation/BeamState';

const FT = 0.3048;

/**
 * Simple human silhouettes for scale reference.
 * Placed around the installation so viewers can judge beam height.
 */
export function createHumanSilhouettes(config: InstallationConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Silhouettes';

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x222233,
    roughness: 0.9,
    metalness: 0
  });

  const half = (config.footprintFt / 2) * FT;

  // Place silhouettes around the installation
  const positions: [number, number, number][] = [
    // Visitors near the installation
    [-half - 5 * FT, 0, -half + 5 * FT],
    [half + 5 * FT, 0, 0],
    [0, 0, half + 8 * FT],
    [-half * 0.5, 0, half + 6 * FT],
    [half * 0.3, 0, -half - 4 * FT],
    // People under the truss
    [-3 * FT, 0, -2 * FT],
    [5 * FT, 0, 3 * FT],
    // People further away
    [half + 30 * FT, 0, 10 * FT],
    [-half - 25 * FT, 0, -15 * FT],
  ];

  for (const [x, _, z] of positions) {
    const height = (5.5 + Math.random() * 0.5) * FT;

    // Body cylinder
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.15, height * 0.65, 6),
      bodyMat
    );
    body.position.set(x, height * 0.35, z);
    body.castShadow = true;
    group.add(body);

    // Head sphere
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(height * 0.08, 6, 5),
      bodyMat
    );
    head.position.set(x, height * 0.75, z);
    head.castShadow = true;
    group.add(head);

    // Legs (two thin cylinders)
    for (const side of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, height * 0.4, 4),
        bodyMat
      );
      leg.position.set(x + side, height * 0.2, z);
      group.add(leg);
    }
  }

  return group;
}
