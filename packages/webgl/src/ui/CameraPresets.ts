import * as THREE from 'three';

const FT = 0.3048;

export interface CameraPreset {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
}

/**
 * Camera presets for key viewpoints around the installation.
 */
export function getCameraPresets(footprintFt: number): CameraPreset[] {
  const half = (footprintFt / 2) * FT;

  return [
    {
      name: 'Under the beams',
      position: new THREE.Vector3(0, 1.7, 0),
      target: new THREE.Vector3(0, 100, 0)
    },
    {
      name: 'Civic axis (from City Hall)',
      position: new THREE.Vector3(0, 6 * FT, -80 * FT),
      target: new THREE.Vector3(0, 14 * FT, 0)
    },
    {
      name: 'Reverse (through beams to City Hall)',
      position: new THREE.Vector3(0, 6 * FT, 80 * FT),
      target: new THREE.Vector3(0, 20 * FT, -40 * FT)
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
}
