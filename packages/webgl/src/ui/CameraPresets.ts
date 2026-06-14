import * as THREE from 'three';

const FT = 0.3048;

export interface CameraPreset {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/**
 * Camera presets for key viewpoints around the installation.
 * `benPosition` is optional — when provided, adds Ben-centered presets.
 */
export function getCameraPresets(
  footprintFt: number,
  benPosition?: THREE.Vector3
): CameraPreset[] {
  const half = (footprintFt / 2) * FT;

  const presets: CameraPreset[] = [
    {
      name: 'Under the beams',
      position: new THREE.Vector3(0, 1.7, 0),
      target: new THREE.Vector3(0, 100, 0)
    },
    {
      name: 'Civic axis (from City Hall)',
      position: new THREE.Vector3(0, 6 * FT, -120 * FT),
      target: new THREE.Vector3(0, 14 * FT, 0)
    },
    {
      name: 'Reverse (through beams to City Hall)',
      position: new THREE.Vector3(0, 6 * FT, 80 * FT),
      target: new THREE.Vector3(0, 20 * FT, -60 * FT)
    },
    {
      name: 'Aerial top-down',
      position: new THREE.Vector3(0, 200 * FT, 0),
      target: new THREE.Vector3(0, 0, 0)
    },
    {
      name: 'Drone oblique',
      position: new THREE.Vector3(120 * FT, 100 * FT, 120 * FT),
      target: new THREE.Vector3(0, 14 * FT, 0)
    },
    {
      name: 'Close-up fixtures',
      position: new THREE.Vector3(half * 0.5, 12 * FT, half + 5 * FT),
      target: new THREE.Vector3(0, 14 * FT, 0)
    },
    {
      name: 'Skyline view',
      position: new THREE.Vector3(400 * FT, 50 * FT, 300 * FT),
      target: new THREE.Vector3(0, 50 * FT, 0)
    }
  ];

  if (benPosition) {
    const bx = benPosition.x;
    const bz = benPosition.z;
    const eyeH = 5.3 * FT;

    // Orbit around Ben
    presets.push({
      name: 'Ben (builder)',
      position: new THREE.Vector3(bx + 8 * FT, eyeH + 2 * FT, bz + 6 * FT),
      target: new THREE.Vector3(bx, eyeH, bz)
    });

    // Over-the-shoulder: camera behind Ben, looking past his iPad at the rig
    presets.push({
      name: 'Over Ben\u2019s shoulder',
      position: new THREE.Vector3(bx + 1.5 * FT, eyeH + 0.5 * FT, bz + 3 * FT),
      target: new THREE.Vector3(0, 14 * FT, 0)
    });

    // Close-up of the iPad in Ben's hands
    presets.push({
      name: 'Ben\u2019s iPad',
      position: new THREE.Vector3(bx + 1 * FT, 5 * FT, bz - 1.5 * FT),
      target: new THREE.Vector3(bx, 2.6 * FT, bz - 0.28)
    });
  }

  return presets;
}
