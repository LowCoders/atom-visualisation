import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * NucleonInterior: Level 2 3D visualization inside a nucleon (proton or neutron).
 * Features:
 * - 3 Valence Quarks (Proton: uud, Neutron: udd) with SU(3) dynamic color charges (Red, Green, Blue)
 * - Clickable interactive quark targets that trigger Level 3 zoom
 * - Rotating Y-shaped gluon flux tubes connecting quarks at the Steiner/Torricelli junction
 * - Virtual quark-antiquark sea (uū, dđ, sš) popping and annihilating
 * - MIT Bag Model pulsating boundary membrane
 * - Color confinement tension feedback
 */
export class NucleonInterior extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'nucleon-interior', options = {}) {
    super(id, {
      name: 'Nukleon Belseje (Kvarkok & Gluonok)',
      ...options,
      parameters: {
        isProton: options.isProton !== undefined ? options.isProton : true,
        scale: options.scale || 1.0,
        showBag: options.showBag !== undefined ? options.showBag : true,
        showBagWire: options.showBagWire !== undefined ? options.showBagWire : false,
        showFluxTubes: options.showFluxTubes !== undefined ? options.showFluxTubes : true,
        showSea: options.showSea !== undefined ? options.showSea : true,
        ...options.parameters
      }
    });

    this.isProton = this.parameters.isProton;
    this.quarks = []; // [{ mesh, labelMesh, type: 'up'|'down', charge: string, baseAngle, radius, colorIdx }]
    this.gluonTubeGroup = new THREE.Group();
    this.seaGroup = new THREE.Group();
    this.bagMesh = null;
    this.bagWire = null;

    this.group.add(this.gluonTubeGroup);
    this.group.add(this.seaGroup);

    // Dynamic SU(3) colors (RGB cycles)
    this.su3Colors = [
      new THREE.Color(0xef4444), // Red
      new THREE.Color(0x10b981), // Green
      new THREE.Color(0x3b82f6)  // Blue
    ];

    // Sea particle buffers
    this.seaQuarks = [];
  }

  build() {
    this.rebuildInterior();
  }

  setNucleonConfig(isProton) {
    this.isProton = isProton;
    this.parameters.isProton = isProton;
    this.rebuildInterior();
  }

  setLayerVisibility(layer, visible) {
    if (layer === 'showBag') {
      this.parameters.showBag = !!visible;
      if (this.bagMesh) this.bagMesh.visible = !!visible;
    } else if (layer === 'showWire' || layer === 'showBagWire') {
      this.parameters.showBagWire = !!visible;
      if (this.bagWire) this.bagWire.visible = !!visible;
    } else if (layer === 'showFluxTubes') {
      this.parameters.showFluxTubes = !!visible;
      this.gluonTubeGroup.visible = !!visible;
    } else if (layer === 'showSea') {
      this.parameters.showSea = !!visible;
      this.seaGroup.visible = !!visible;
    }
  }

  rebuildInterior() {
    // Clear previous children
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    this.quarks = [];
    this.gluonTubeGroup = new THREE.Group();
    this.seaGroup = new THREE.Group();
    this.group.add(this.gluonTubeGroup);
    this.group.add(this.seaGroup);

    const R_bag = 3.6;

    // 1. MIT Bag Model Boundary Membrane
    if (this.parameters.showBag) {
      const bagGeo = new THREE.SphereGeometry(R_bag, 36, 36);
      const bagMat = new THREE.MeshStandardMaterial({
        color: this.isProton ? 0xf59e0b : 0x06b6d4,
        transparent: true,
        opacity: 0.22,
        roughness: 0.2,
        depthWrite: false
      });
      this.bagMesh = new THREE.Mesh(bagGeo, bagMat);
      this.group.add(this.bagMesh);

      const wireGeo = new THREE.SphereGeometry(R_bag * 1.01, 24, 24);
      const wireMat = new THREE.MeshBasicMaterial({
        color: this.isProton ? 0xfbbf24 : 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
        depthWrite: false
      });
      this.bagWire = new THREE.Mesh(wireGeo, wireMat);
      this.bagWire.visible = this.parameters.showBagWire !== undefined ? !!this.parameters.showBagWire : false;
      this.group.add(this.bagWire);
    }

    // 2. Three Valence Quarks
    // Proton: [u, u, d], Neutron: [u, d, d]
    const quarkTypes = this.isProton
      ? [{ type: 'up', charge: '+⅔ e' }, { type: 'up', charge: '+⅔ e' }, { type: 'down', charge: '-⅓ e' }]
      : [{ type: 'up', charge: '+⅔ e' }, { type: 'down', charge: '-⅓ e' }, { type: 'down', charge: '-⅓ e' }];

    const qGeo = new THREE.SphereGeometry(0.58, 24, 24);
    const glowGeo = new THREE.SphereGeometry(0.85, 16, 16);

    for (let i = 0; i < 3; i++) {
      const qData = quarkTypes[i];
      const qGroup = new THREE.Group();

      const mat = new THREE.MeshStandardMaterial({
        color: this.su3Colors[i],
        emissive: this.su3Colors[i],
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.3
      });

      const mesh = new THREE.Mesh(qGeo, mat);
      mesh.userData = {
        interactiveType: 'quark',
        interactiveData: {
          index: i,
          type: qData.type,
          charge: qData.charge,
          isProton: this.isProton
        }
      };
      qGroup.add(mesh);

      // Outer glow aura
      const glowMat = new THREE.MeshBasicMaterial({
        color: this.su3Colors[i],
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      qGroup.add(glowMesh);

      const baseAngle = (i / 3) * Math.PI * 2;
      const radius = 1.9;
      qGroup.position.set(
        Math.cos(baseAngle) * radius,
        0,
        Math.sin(baseAngle) * radius
      );

      this.group.add(qGroup);

      this.quarks.push({
        group: qGroup,
        mesh,
        glowMesh,
        mat,
        glowMat,
        type: qData.type,
        charge: qData.charge,
        baseAngle,
        radius,
        phase: i * 2.1
      });
    }

    // 3. Gluon Flux Tubes (Y-shape junction)
    this.initGluonFluxTubes();

    // 4. Virtual Quark-Antiquark Sea
    if (this.parameters.showSea) {
      this.initQuarkSea();
    }
  }

  initGluonFluxTubes() {
    // 3 tubes from central Fermat-Torricelli junction (0,0,0) to each of the 3 quarks
    this.fluxTubes = [];
    const tubeSegments = 24;

    for (let i = 0; i < 3; i++) {
      const curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
      const tubeGeo = new THREE.TubeGeometry(curve, tubeSegments, 0.12, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        transparent: true,
        opacity: 0.85
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      this.gluonTubeGroup.add(tubeMesh);
      this.fluxTubes.push({ mesh: tubeMesh, mat: tubeMat, index: i });
    }

    // Central triple junction node
    const junctionGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const junctionMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.junctionMesh = new THREE.Mesh(junctionGeo, junctionMat);
    this.gluonTubeGroup.add(this.junctionMesh);
  }

  initQuarkSea() {
    this.seaQuarks = [];
    const count = 18;
    const miniGeo = new THREE.SphereGeometry(0.14, 10, 10);

    const seaColA = new THREE.Color(0x38bdf8);
    const seaColB = new THREE.Color(0xf43f5e);

    for (let i = 0; i < count; i++) {
      const pairGroup = new THREE.Group();

      const matA = new THREE.MeshBasicMaterial({ color: seaColA, transparent: true, opacity: 0.7 });
      const matB = new THREE.MeshBasicMaterial({ color: seaColB, transparent: true, opacity: 0.7 });

      const meshA = new THREE.Mesh(miniGeo, matA);
      const meshB = new THREE.Mesh(miniGeo, matB);
      pairGroup.add(meshA);
      pairGroup.add(meshB);

      const r = 0.8 + Math.random() * 2.2;
      const th = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      pairGroup.position.set(
        r * Math.cos(phi) * Math.cos(th),
        r * Math.sin(phi),
        r * Math.cos(phi) * Math.sin(th)
      );

      this.seaGroup.add(pairGroup);

      this.seaQuarks.push({
        group: pairGroup,
        meshA,
        meshB,
        life: Math.random(),
        speed: 0.8 + Math.random() * 1.2,
        dist: 0.4 + Math.random() * 0.3
      });
    }
  }

  getInteractiveQuarks() {
    return this.quarks.map(q => q.mesh);
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (!this.group.visible) return;

    // 1. MIT Bag breathing animation
    if (this.bagMesh) {
      const breathe = 1.0 + Math.sin(time * 3.2) * 0.04;
      this.bagMesh.scale.setScalar(breathe);
      if (this.bagWire) this.bagWire.scale.setScalar(breathe);
    }

    // 2. Valence Quarks orbit + SU(3) color rotation
    const junctionPos = new THREE.Vector3(
      Math.sin(time * 2.0) * 0.15,
      Math.cos(time * 2.5) * 0.12,
      Math.sin(time * 1.8) * 0.15
    );
    if (this.junctionMesh) {
      this.junctionMesh.position.copy(junctionPos);
    }

    const currentPositions = [];

    for (let i = 0; i < this.quarks.length; i++) {
      const q = this.quarks[i];
      // Quark vibration around base angle
      const angle = q.baseAngle + time * 1.4 + Math.sin(time * 3.8 + q.phase) * 0.25;
      const r = q.radius + Math.sin(time * 4.2 + q.phase) * 0.35;
      const y = Math.cos(time * 3.5 + q.phase) * 0.45;

      const qPos = new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
      q.group.position.copy(qPos);
      currentPositions.push(qPos);

      // SU(3) Color cycling (continuous hue rotation representing dynamic gluon exchange)
      const colorPhase = (time * 0.8 + (i * 0.333)) % 1.0;
      const hsl = { h: colorPhase, s: 0.9, l: 0.55 };
      q.mat.color.setHSL(hsl.h, hsl.s, hsl.l);
      q.mat.emissive.setHSL(hsl.h, hsl.s, hsl.l);
      q.glowMat.color.setHSL(hsl.h, hsl.s, hsl.l);
    }

    // 3. Update Gluon Flux Tubes geometry connecting junction to quarks
    if (this.fluxTubes && currentPositions.length === 3) {
      for (let i = 0; i < 3; i++) {
        const ft = this.fluxTubes[i];
        // Rebuild tube geometry along line from junction to quark
        ft.mesh.geometry.dispose();

        // Add middle spline point that sags/ripples dynamically
        const midPoint = new THREE.Vector3()
          .addVectors(junctionPos, currentPositions[i])
          .multiplyScalar(0.5);
        midPoint.y += Math.sin(time * 5.0 + i * 2.0) * 0.2;

        const curve = new THREE.QuadraticBezierCurve3(junctionPos, midPoint, currentPositions[i]);
        ft.mesh.geometry = new THREE.TubeGeometry(curve, 18, 0.11, 8, false);

        // Color matches intermediate color of exchanging quarks
        const tubePhase = (time * 0.8 + (i * 0.333) + 0.16) % 1.0;
        ft.mat.color.setHSL(tubePhase, 0.95, 0.5);
        ft.mat.emissive.setHSL(tubePhase, 0.95, 0.5);
      }
    }

    // 4. Update Sea Quarks (popping & annihilating)
    for (let i = 0; i < this.seaQuarks.length; i++) {
      const sq = this.seaQuarks[i];
      sq.life += deltaTime * sq.speed;
      if (sq.life > 1.0) {
        sq.life = 0;
        const r = 0.8 + Math.random() * 2.2;
        const th = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        sq.group.position.set(
          r * Math.cos(phi) * Math.cos(th),
          r * Math.sin(phi),
          r * Math.cos(phi) * Math.sin(th)
        );
      }

      const sep = Math.sin(Math.PI * sq.life) * sq.dist;
      const s = Math.sin(Math.PI * sq.life);
      sq.meshA.position.set(sep * 0.5, 0, 0);
      sq.meshB.position.set(-sep * 0.5, 0, 0);
      sq.meshA.scale.setScalar(s);
      sq.meshB.scale.setScalar(s);
    }
  }

  dispose() {
    super.dispose();
    if (this.bagMesh) this.bagMesh.geometry.dispose();
    if (this.bagWire) this.bagWire.geometry.dispose();
  }
}
