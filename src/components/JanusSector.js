import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * JanusSector: Visualizes the Antimatter Mirror Universe (r < 0, dS/dt < 0).
 * Features:
 * - Antiproton nucleus (anti-up & anti-down quarks) with inverted color metrics
 * - Positron orbital clouds & tracks (+1 e positive leptons)
 * - Inverted vacuum sheet (delta g_00 with reversed curvature/entropy gradient)
 * - Mirror wormhole gateway connecting back to our 3D matter world
 */
export class JanusSector extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'janus-sector', options = {}) {
    super(id, {
      name: 'Janus-világ (Antianyag Szektor)',
      ...options,
      parameters: {
        positronCount: options.positronCount || 2,
        showMirrorSheet: options.showMirrorSheet !== undefined ? options.showMirrorSheet : true,
        ...options.parameters
      }
    });

    this.antiNucleus = null;
    this.positronGroup = new THREE.Group();
    this.mirrorSheet = null;
    this.throatGate = null;

    this.group.add(this.positronGroup);

    this.positrons = [];
  }

  build() {
    this.rebuildJanusSector();
  }

  setLayerVisibility(layer, visible) {
    if (layer === 'sheet') {
      if (this.mirrorSheet) this.mirrorSheet.visible = !!visible;
    } else if (layer === 'positrons') {
      this.positronGroup.visible = !!visible;
    } else if (layer === 'antiproton') {
      if (this.antiNucleus) this.antiNucleus.visible = !!visible;
    }
  }

  rebuildJanusSector() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    this.positronGroup = new THREE.Group();
    this.group.add(this.positronGroup);
    this.positrons = [];

    // 1. Antiproton Nucleus (negative charge, anti-quarks)
    const antiNucGeo = new THREE.SphereGeometry(1.2, 28, 28);
    const antiNucMat = new THREE.MeshStandardMaterial({
      color: 0x831843,       // Deep ruby
      emissive: 0xbe185d,    // Crimson glow
      emissiveIntensity: 0.5,
      roughness: 0.25,
      transparent: true,
      opacity: 0.85
    });
    this.antiNucleus = new THREE.Mesh(antiNucGeo, antiNucMat);
    this.group.add(this.antiNucleus);

    // Inner wireframe shell
    const wireGeo = new THREE.SphereGeometry(1.23, 16, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.antiNucleus.add(wireMesh);

    // 2. Positron Orbitals (+1e leptons, counter-rotating)
    const pGeo = new THREE.SphereGeometry(0.24, 16, 16);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e, // Radiant magenta/rose
      transparent: true,
      opacity: 0.95
    });

    const haloGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfb7185,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // 2 positron tracks
    const trackPoints = 72;
    for (let pIdx = 0; pIdx < 2; pIdx++) {
      const radius = 3.6 + pIdx * 1.5;
      const tiltX = (pIdx === 0 ? 0.3 : -0.3);
      const tiltZ = (pIdx === 0 ? -0.2 : 0.2);

      const planeGroup = new THREE.Group();
      planeGroup.rotation.x = tiltX;
      planeGroup.rotation.z = tiltZ;
      this.positronGroup.add(planeGroup);

      // Trajectory ring
      const tGeo = new THREE.BufferGeometry();
      const tPos = new Float32Array((trackPoints + 1) * 3);
      for (let i = 0; i <= trackPoints; i++) {
        const a = (i / trackPoints) * Math.PI * 2;
        tPos[i * 3 + 0] = Math.cos(a) * radius;
        tPos[i * 3 + 1] = 0;
        tPos[i * 3 + 2] = Math.sin(a) * radius;
      }
      tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
      const tMat = new THREE.LineBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.4
      });
      const tLine = new THREE.Line(tGeo, tMat);
      planeGroup.add(tLine);

      // Positron sphere & aura
      const pMesh = new THREE.Mesh(pGeo, pMat);
      const hMesh = new THREE.Mesh(haloGeo, haloMat);
      pMesh.add(hMesh);
      planeGroup.add(pMesh);

      this.positrons.push({
        mesh: pMesh,
        radius,
        speed: (pIdx === 0 ? -1.8 : 1.4), // Counter-rotating
        angle: pIdx * Math.PI
      });
    }

    // 3. Inverted Spacetime Sheet (Mirror sheet with upward deflection)
    if (this.parameters.showMirrorSheet) {
      const sheetGeo = new THREE.PlaneGeometry(36, 36, 48, 48);
      sheetGeo.rotateX(-Math.PI / 2);
      const sPos = sheetGeo.attributes.position;

      for (let i = 0; i < sPos.count; i++) {
        const x = sPos.getX(i);
        const z = sPos.getZ(i);
        const d = Math.sqrt(x * x + z * z);
        // Inverse gravity well (as seen from r < 0 sheet)
        const sag = 2.4 / (1.0 + d * 0.45);
        sPos.setY(i, -3.5 + sag); // Arch upward
      }
      sPos.needsUpdate = true;
      sheetGeo.computeVertexNormals();

      const sheetMat = new THREE.MeshStandardMaterial({
        color: 0xd946ef,
        emissive: 0x86198f,
        emissiveIntensity: 0.35,
        wireframe: true,
        transparent: true,
        opacity: 0.55,
        roughness: 0.3
      });
      this.mirrorSheet = new THREE.Mesh(sheetGeo, sheetMat);
      this.group.add(this.mirrorSheet);
    }

    // 4. Mirror Gateway to Throat
    const gateGeo = new THREE.TorusGeometry(1.8, 0.08, 16, 64);
    const gateMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.throatGate = new THREE.Mesh(gateGeo, gateMat);
    this.throatGate.position.set(0, 3.2, 0);
    this.throatGate.rotation.x = Math.PI / 2;
    this.group.add(this.throatGate);
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (!this.group.visible) return;

    // 1. Antiproton pulsating rotation
    if (this.antiNucleus) {
      this.antiNucleus.rotation.y = -time * 1.2;
      this.antiNucleus.rotation.z = Math.sin(time * 0.8) * 0.15;
    }

    // 2. Positron orbits
    for (let i = 0; i < this.positrons.length; i++) {
      const p = this.positrons[i];
      p.angle += deltaTime * p.speed;
      p.mesh.position.set(
        Math.cos(p.angle) * p.radius,
        0,
        Math.sin(p.angle) * p.radius
      );
    }

    // 3. Mirror throat gate rotation
    if (this.throatGate) {
      this.throatGate.rotation.z = -time * 2.2;
    }
  }

  dispose() {
    super.dispose();
    if (this.antiNucleus) this.antiNucleus.geometry.dispose();
    if (this.mirrorSheet) this.mirrorSheet.geometry.dispose();
  }
}
