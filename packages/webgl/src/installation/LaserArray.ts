import * as THREE from 'three';
import type { BeamState, InstallationConfig } from './BeamState';

const FT = 0.3048;

/**
 * 7×7 laser beam array rendered as glowing cylinders with additive blending.
 * Each beam has:
 *  - A volumetric cylinder (additive, transparent)
 *  - A core bright line (higher intensity)
 *  - A source glow sphere at the fixture
 *  - A small fixture box on the truss
 */
export class LaserArray {
  readonly group = new THREE.Group();
  private beamMeshes: THREE.Mesh[] = [];
  private coreMeshes: THREE.Mesh[] = [];
  private glowMeshes: THREE.Mesh[] = [];
  private fixtureMeshes: THREE.Mesh[] = [];
  private config: InstallationConfig;
  private beamHeight: number;

  constructor(config: InstallationConfig) {
    this.config = config;
    this.group.name = 'LaserArray';
    this.beamHeight = config.beamHeightFt * FT;
    this.buildBeams();
  }

  private buildBeams(): void {
    const cols = this.config.gridColumns;
    const rows = Math.ceil(this.config.numCannons / cols);
    const spacing = (this.config.footprintFt / (cols - 1)) * FT;
    const halfW = ((cols - 1) * spacing) / 2;
    const halfD = ((rows - 1) * spacing) / 2;
    const trussH = this.config.trussHeightFt * FT;

    // Shared geometries (instanced later if perf needed)
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.06, this.beamHeight, 8, 1, true);
    const coreGeo = new THREE.CylinderGeometry(0.015, 0.015, this.beamHeight, 4, 1, true);
    const glowGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const fixtureGeo = new THREE.BoxGeometry(0.2, 0.12, 0.2);

    const fixtureMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.3
    });

    for (let i = 0; i < this.config.numCannons; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = -halfW + col * spacing;
      const z = -halfD + row * spacing;

      // Volumetric beam (outer glow)
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.set(x, trussH + this.beamHeight / 2, z);
      this.group.add(beam);
      this.beamMeshes.push(beam);

      // Core beam (bright center line)
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(x, trussH + this.beamHeight / 2, z);
      this.group.add(core);
      this.coreMeshes.push(core);

      // Source glow at fixture
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x, trussH + 0.1, z);
      this.group.add(glow);
      this.glowMeshes.push(glow);

      // Fixture box
      const fixture = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixture.position.set(x, trussH - 0.06, z);
      fixture.castShadow = true;
      this.group.add(fixture);
      this.fixtureMeshes.push(fixture);
    }
  }

  /**
   * Update beam visuals from current beam state.
   */
  update(beams: BeamState[], globalBrightness: number): void {
    for (let i = 0; i < beams.length && i < this.beamMeshes.length; i++) {
      const b = beams[i];
      const brightness = b.intensity * globalBrightness;
      const color = new THREE.Color(b.color[0], b.color[1], b.color[2]);

      const beamMat = this.beamMeshes[i].material as THREE.MeshBasicMaterial;
      beamMat.color.copy(color);
      beamMat.opacity = b.enabled ? 0.08 + brightness * 0.15 : 0;

      const coreMat = this.coreMeshes[i].material as THREE.MeshBasicMaterial;
      coreMat.color.copy(color);
      coreMat.opacity = b.enabled ? 0.3 + brightness * 0.5 : 0;

      const glowMat = this.glowMeshes[i].material as THREE.MeshBasicMaterial;
      glowMat.color.copy(color);
      glowMat.opacity = b.enabled ? 0.4 + brightness * 0.4 : 0;

      // Scale beam width
      const s = b.width * (0.5 + brightness * 0.5);
      this.beamMeshes[i].scale.set(s, 1, s);
      this.coreMeshes[i].scale.set(s, 1, s);
      this.glowMeshes[i].scale.set(s * 2, s * 2, s * 2);
    }
  }

  /**
   * Update beam height (visual length).
   */
  setBeamHeight(heightFt: number): void {
    this.beamHeight = heightFt * FT;
    const trussH = this.config.trussHeightFt * FT;

    for (let i = 0; i < this.beamMeshes.length; i++) {
      this.beamMeshes[i].scale.y = this.beamHeight / (this.config.beamHeightFt * FT);
      this.beamMeshes[i].position.y = trussH + this.beamHeight / 2;
      this.coreMeshes[i].scale.y = this.beamHeight / (this.config.beamHeightFt * FT);
      this.coreMeshes[i].position.y = trussH + this.beamHeight / 2;
    }
  }

  /**
   * Update beam width globally.
   */
  setBeamWidth(width: number): void {
    for (let i = 0; i < this.beamMeshes.length; i++) {
      this.beamMeshes[i].scale.set(width, this.beamMeshes[i].scale.y, width);
    }
  }

  dispose(): void {
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
  }
}
