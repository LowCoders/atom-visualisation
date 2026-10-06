import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * QuarkInterior: Level 3 3D visualization inside a quark.
 * Features:
 * - Rotating Kerr-type ring singularity at the throat (a > 0)
 * - Hyperboloid wormhole throat (Morris-Thorne geometry) connecting to the extra dimension
 * - Calabi-Yau manifold 3D projection (6D compactified geometry wireframe/mesh)
 * - Heisenberg Bounce protective quantum repulsion shield (+1/r^3)
 * - Schwinger/Hawking tidal pair-splitting zone at the horizon
 */
export class QuarkInterior extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'quark-interior', options = {}) {
    super(id, {
      name: 'Kvark Belseje (Féregjárat & Calabi-Yau)',
      ...options,
      parameters: {
        quarkType: options.quarkType || 'up',
        charge: options.charge || '+⅔ e',
        spin: options.spin || '½',
        showCalabiYau: options.showCalabiYau !== undefined ? options.showCalabiYau : true,
        showThroat: options.showThroat !== undefined ? options.showThroat : true,
        showHeisenbergBounce: options.showHeisenbergBounce !== undefined ? options.showHeisenbergBounce : true,
        showHawkingRadiation: options.showHawkingRadiation !== undefined ? options.showHawkingRadiation : true,
        ...options.parameters
      }
    });

    this.throatMesh = null;
    this.throatWire = null;
    this.kerrRing = null;
    this.calabiYauGroup = new THREE.Group();
    this.bounceShield = null;
    this.hawkingParticles = null;
    this.hawkingGeo = null;

    this.group.add(this.calabiYauGroup);

    this.hawkingData = [];
  }

  build() {
    this.rebuildQuarkInterior();
  }

  setQuarkConfig(config = {}) {
    if (config.type) this.parameters.quarkType = config.type;
    if (config.charge) this.parameters.charge = config.charge;
    this.rebuildQuarkInterior();
  }

  setLayerVisibility(layer, visible) {
    if (layer === 'throat') {
      this.parameters.showThroat = !!visible;
      if (this.throatMesh) this.throatMesh.visible = !!visible;
      if (this.throatWire) this.throatWire.visible = !!visible;
    } else if (layer === 'kerr') {
      if (this.kerrRing) this.kerrRing.visible = !!visible;
    } else if (layer === 'calabiYau') {
      this.parameters.showCalabiYau = !!visible;
      this.calabiYauGroup.visible = !!visible;
    } else if (layer === 'bounce') {
      this.parameters.showHeisenbergBounce = !!visible;
      if (this.bounceShield) this.bounceShield.visible = !!visible;
    } else if (layer === 'hawking') {
      this.parameters.showHawkingRadiation = !!visible;
      if (this.hawkingParticles) this.hawkingParticles.visible = !!visible;
    }
  }

  rebuildQuarkInterior() {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    this.calabiYauGroup = new THREE.Group();
    this.group.add(this.calabiYauGroup);

    // 1. Wormhole Throat (Hyperboloid of one sheet: x^2 + z^2 - c*y^2 = r_0^2)
    if (this.parameters.showThroat) {
      const throatGeo = new THREE.CylinderGeometry(3.5, 3.5, 7.0, 48, 36, true);
      const pos = throatGeo.attributes.position;
      const r0 = 1.1; // Throat radius at equator y = 0
      const flare = 0.35;

      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const x = pos.getX(i);
        const z = pos.getZ(i);

        // Hyperbolic radius at height y: r(y) = sqrt(r0^2 + flare * y^2)
        const curR = Math.sqrt(x * x + z * z);
        const targetR = Math.sqrt(r0 * r0 + flare * y * y);
        const scale = curR > 0.0001 ? targetR / curR : 1.0;

        pos.setX(i, x * scale);
        pos.setZ(i, z * scale);
      }
      pos.needsUpdate = true;
      throatGeo.computeVertexNormals();

      const throatMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        emissive: 0x4338ca,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        transparent: true,
        opacity: 0.70,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.throatMesh = new THREE.Mesh(throatGeo, throatMat);
      this.group.add(this.throatMesh);

      // Throat wireframe grid
      const throatWireMat = new THREE.MeshBasicMaterial({
        color: 0x818cf8,
        wireframe: true,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide
      });
      this.throatWire = new THREE.Mesh(throatGeo, throatWireMat);
      this.group.add(this.throatWire);

      // Kerr Ring Singularity in equatorial plane (y = 0)
      const ringGeo = new THREE.TorusGeometry(r0 * 0.95, 0.06, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      });
      this.kerrRing = new THREE.Mesh(ringGeo, ringMat);
      this.kerrRing.rotation.x = Math.PI / 2;
      this.group.add(this.kerrRing);
    }

    // 2. Calabi-Yau 6D Compactified Manifold (3D cross-section projection)
    if (this.parameters.showCalabiYau) {
      this.buildCalabiYauManifold();
    }

    // 3. Heisenberg Bounce Protective Shield (+1/r^3 repulsive quantum potential barrier)
    if (this.parameters.showHeisenbergBounce) {
      const shieldGeo = new THREE.SphereGeometry(2.2, 32, 32);
      const shieldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        transparent: true,
        opacity: 0.28,
        wireframe: false,
        depthWrite: false
      });
      this.bounceShield = new THREE.Mesh(shieldGeo, shieldMat);
      this.group.add(this.bounceShield);

      const shieldRingGeo = new THREE.RingGeometry(2.1, 2.25, 48);
      const shieldRingMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const shieldRing = new THREE.Mesh(shieldRingGeo, shieldRingMat);
      shieldRing.rotation.x = Math.PI / 2;
      this.bounceShield.add(shieldRing);
    }

    // 4. Schwinger & Hawking Pair-Splitting Radiation
    if (this.parameters.showHawkingRadiation) {
      this.initHawkingRadiation();
    }
  }

  buildCalabiYauManifold() {
    // Generate complex cross-section of a 2D slice of Calabi-Yau quintic threefold:
    // Parametric surface: z1^n + z2^n = 1 projected into 3D
    const uSegments = 40;
    const vSegments = 40;
    const n = 5; // Quintic threefold power

    const cyGeo = new THREE.BufferGeometry();
    const pos = [];
    const colors = [];

    const colA = new THREE.Color(0xa855f7); // Purple
    const colB = new THREE.Color(0xec4899); // Pink

    for (let i = 0; i <= uSegments; i++) {
      const u = (i / uSegments) * Math.PI * 2;
      for (let j = 0; j <= vSegments; j++) {
        const v = (j / vSegments) * Math.PI;

        // Modulated Calabi-Yau radius
        const rMod = 1.6 + 0.4 * Math.cos(n * u) * Math.sin(n * v);
        const x = rMod * Math.sin(v) * Math.cos(u) * 0.75;
        const y = (rMod * Math.cos(v) * 0.5) + (Math.sin(3 * u) * 0.3);
        const z = rMod * Math.sin(v) * Math.sin(u) * 0.75;

        pos.push(x, y, z);

        const mixCol = colA.clone().lerp(colB, (Math.sin(u * 2) + 1) * 0.5);
        colors.push(mixCol.r, mixCol.g, mixCol.b);
      }
    }

    // Wireframe indices
    const indices = [];
    for (let i = 0; i < uSegments; i++) {
      for (let j = 0; j < vSegments; j++) {
        const a = i * (vSegments + 1) + j;
        const b = (i + 1) * (vSegments + 1) + j;
        const c = (i + 1) * (vSegments + 1) + (j + 1);
        const d = i * (vSegments + 1) + (j + 1);

        indices.push(a, b, c);
        indices.push(a, c, d);
      }
    }

    cyGeo.setIndex(indices);
    cyGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    cyGeo.computeVertexNormals();

    const cyMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      metalness: 0.5
    });

    this.calabiYauMesh = new THREE.Mesh(cyGeo, cyMat);
    this.calabiYauGroup.add(this.calabiYauMesh);
  }

  initHawkingRadiation() {
    const count = 30;
    this.hawkingGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    this.hawkingData = [];

    const colEscaping = new THREE.Color(0x38bdf8); // Escapes as Hawking radiation
    const colFalling = new THREE.Color(0xf43f5e);  // Falls into wormhole throat

    for (let i = 0; i < count; i++) {
      const isEscaping = (i % 2 === 0);
      const angle = (i / count) * Math.PI * 2;

      this.hawkingData.push({
        angle,
        y: (Math.random() - 0.5) * 0.4,
        dist: 1.15 + Math.random() * 0.2,
        speed: 0.6 + Math.random() * 0.8,
        isEscaping,
        life: Math.random()
      });

      positions[i * 3 + 0] = Math.cos(angle) * 1.2;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(angle) * 1.2;

      const col = isEscaping ? colEscaping : colFalling;
      col.toArray(colors, i * 3);
    }

    this.hawkingGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.hawkingGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.24,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.hawkingParticles = new THREE.Points(this.hawkingGeo, pMat);
    this.group.add(this.hawkingParticles);
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (!this.group.visible) return;

    // 1. Rotate Kerr ring & Calabi-Yau geometry
    if (this.kerrRing) {
      this.kerrRing.rotation.z = time * 2.8;
    }
    if (this.calabiYauMesh) {
      this.calabiYauMesh.rotation.y = time * 0.45;
      this.calabiYauMesh.rotation.x = Math.sin(time * 0.3) * 0.2;
    }

    // 2. Heisenberg Bounce shield pulsation (quantum repulsion oscillation)
    if (this.bounceShield) {
      const bouncePulse = 1.0 + Math.sin(time * 6.0) * 0.06;
      this.bounceShield.scale.setScalar(bouncePulse);
    }

    // 3. Wormhole throat subtle contraction / breathing
    if (this.throatMesh) {
      this.throatMesh.rotation.y = time * 0.2;
      if (this.throatWire) this.throatWire.rotation.y = time * 0.2;
    }

    // 4. Update Hawking & Schwinger split particles
    if (this.hawkingGeo) {
      const pos = this.hawkingGeo.getAttribute('position');
      for (let i = 0; i < this.hawkingData.length; i++) {
        const h = this.hawkingData[i];
        h.life += deltaTime * h.speed;

        if (h.life > 1.0) {
          h.life = 0;
          h.dist = 1.15;
          h.y = (Math.random() - 0.5) * 0.3;
        }

        if (h.isEscaping) {
          // Spirals outward and upward/away
          const r = 1.15 + h.life * 3.4;
          const curY = h.y + h.life * 2.5;
          const curA = h.angle + h.life * 4.0;
          pos.setXYZ(i, Math.cos(curA) * r, curY, Math.sin(curA) * r);
        } else {
          // Falls inward down the throat towards negative sheet (Janus)
          const r = Math.max(0.1, 1.15 * (1.0 - h.life * 0.8));
          const curY = h.y - h.life * 3.2;
          const curA = h.angle + h.life * 5.0;
          pos.setXYZ(i, Math.cos(curA) * r, curY, Math.sin(curA) * r);
        }
      }
      pos.needsUpdate = true;
    }
  }

  dispose() {
    super.dispose();
    if (this.throatMesh) this.throatMesh.geometry.dispose();
    if (this.kerrRing) this.kerrRing.geometry.dispose();
    if (this.hawkingGeo) this.hawkingGeo.dispose();
  }
}
