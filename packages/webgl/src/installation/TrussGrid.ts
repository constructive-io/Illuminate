import * as THREE from 'three';
import type { InstallationConfig } from './BeamState';

const FT = 0.3048;

/**
 * Freestanding aluminum truss grid.
 * Modular lattice segments with cross braces and support legs.
 */
export function createTrussGrid(config: InstallationConfig): THREE.Group {
  const group = new THREE.Group();
  group.name = 'TrussGrid';

  const cols = config.gridColumns;
  const rows = Math.ceil(config.numCannons / cols);
  const spacing = (config.footprintFt / (cols - 1)) * FT;
  const height = config.trussHeightFt * FT;
  const halfW = ((cols - 1) * spacing) / 2;
  const halfD = ((rows - 1) * spacing) / 2;

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.7,
    roughness: 0.3
  });

  const tubeRadius = 0.08; // meters (~3 inches)
  const braceRadius = 0.04;

  // Horizontal top rails (X direction)
  for (let r = 0; r <= rows - 1; r++) {
    const z = -halfD + r * spacing;
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeRadius, tubeRadius, (cols - 1) * spacing, 8),
      trussMat
    );
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, height, z);
    group.add(rail);
  }

  // Horizontal top rails (Z direction)
  for (let c = 0; c <= cols - 1; c++) {
    const x = -halfW + c * spacing;
    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeRadius, tubeRadius, (rows - 1) * spacing, 8),
      trussMat
    );
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, height, 0);
    group.add(rail);
  }

  // Vertical support legs at corners and intermediate points
  const legPositions: [number, number][] = [
    [-halfW, -halfD],
    [-halfW, halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, 0],
    [halfW, 0],
    [0, -halfD],
    [0, halfD],
  ];

  for (const [x, z] of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(tubeRadius, tubeRadius, height, 8),
      trussMat
    );
    leg.position.set(x, height / 2, z);
    leg.castShadow = true;
    group.add(leg);

    // Cross braces on legs (X pattern)
    for (let side = 0; side < 2; side++) {
      const brace = new THREE.Mesh(
        new THREE.CylinderGeometry(braceRadius, braceRadius, Math.sqrt(height * height + spacing * spacing * 0.25), 6),
        trussMat
      );
      const angle = Math.atan2(height, spacing * 0.5);
      brace.rotation.z = side === 0 ? angle : -angle;
      brace.position.set(x, height / 2, z);
      group.add(brace);
    }

    // Base plate
    const basePlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.1, 1.2),
      trussMat
    );
    basePlate.position.set(x, 0.05, z);
    basePlate.receiveShadow = true;
    group.add(basePlate);

    // Ballast block
    const ballast = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.3, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 })
    );
    ballast.position.set(x, 0.15, z);
    group.add(ballast);
  }

  return group;
}
