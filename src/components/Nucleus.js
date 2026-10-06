import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import { getElement, ELEMENTS, calculateThroatCurvature } from '../core/QuantumPhysics.js';

/**
 * Nucleus: Modular, reusable 3D atomic nucleus component with embedded LOD interior:
 * - Liquid Drop Model cluster scaling (R ~ R0 * A^(1/3))
 * - Protons and Neutrons with dynamic SU(3) valence quarks (uud / udd)
 * - Level 1 Embedded: MIT Bag Model boundary shell, Y-shaped gluon flux tubes, virtual quark sea
 * - Level 2 Embedded: Micro-wormhole throat, Kerr ring singularity, Calabi-Yau 6D projection, Heisenberg bounce
 * - Zoom-based Dynamic LOD (Level of Detail) with smooth fading & manual layer overrides
 * - Raycast-interactive nucleons, valence quarks, and micro-wormhole
 */
export class Nucleus extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   * @param {number} [options.Z=2] - Atomic number (proton count)
   * @param {number} [options.A=4] - Mass number (protons + neutrons)
   * @param {number} [options.rotationSpeed=1.4] - Rotation speed in rad/s
   */
  constructor(id = 'nucleus', options = {}) {
    super(id, {
      name: 'Atommag & Nukleonok',
      ...options,
      parameters: {
        Z: options.Z || 2,
        A: options.A || 4,
        rotationSpeed: options.rotationSpeed !== undefined ? options.rotationSpeed : 1.4,
        showShell: options.showShell !== undefined ? options.showShell : false,
        showNucleons: options.showNucleons !== undefined ? options.showNucleons : true,
        showNucleusWire: options.showNucleusWire !== undefined ? options.showNucleusWire : false,
        showNucleonWire: options.showNucleonWire !== undefined ? options.showNucleonWire : false,
        showQuarks: options.showQuarks !== undefined ? options.showQuarks : true,
        showMesons: options.showMesons !== undefined ? options.showMesons : true,
        showBag: options.showBag !== undefined ? options.showBag : false,
        showFluxTubes: options.showFluxTubes !== undefined ? options.showFluxTubes : false,
        showSea: options.showSea !== undefined ? options.showSea : false,
        showThroat: options.showThroat !== undefined ? options.showThroat : false,
        autoLOD: options.autoLOD !== undefined ? options.autoLOD : true,
        scale: options.scale || 1.0,
        ...options.parameters
      }
    });

    this.nucleonData = [];
    this.filamentLines = [];
    this.currentAngle = 0;
    this.shellMesh = null;
    this.wireMesh = null;

    // Embedded Micro-Wormhole Throat & Calabi-Yau at primary quark/core
    this.throatGroup = new THREE.Group();
    this.throatMesh = null;
    this.throatWire = null;
    this.kerrRing = null;
    this.calabiYauGroup = new THREE.Group();
    this.bounceShield = null;
    this.topIntakeRing = null;
    this.bottomDockingRing = null;
    this.throatVortexPoints = null;
    this.throatVortexData = [];
    this.throatWaveRings = [];
    this.wormholeExcitation = 0.0;
    this.targetWormholeExcitation = 0.0;
    this.throatGeometryCache = null;
    this.group.add(this.throatGroup);

    // Dynamic LOD State: 0 = Macro (far), 1 = Nucleon interior (mid), 2 = Quark & Throat (near)
    this.lodLevel = 0;
    this.cameraDistance = 22.0;

    // Nuclear recoil and Yukawa pion-exchange dynamics
    this.recoilOffset = new THREE.Vector3();
    this.recoilVelocity = new THREE.Vector3();
    this.yukawaExcitation = 0.0;

    // SU(3) color palette (Red, Green, Blue)
    this.su3Colors = [
      new THREE.Color(0xef4444),
      new THREE.Color(0x10b981),
      new THREE.Color(0x38bdf8)
    ];

    // Shared reusable materials
    this.protonMat = null;
    this.neutronMat = null;
    this.quarkUpMat = null;
    this.quarkDownMat = null;
    this.filamentMat = null;
    this.gluonTubeMat = null;
    this.protonBagMat = null;
    this.neutronBagMat = null;
    this.bagWireMat = null;
  }

  build() {
    this.initMaterials();
    this.rebuildNucleus();
  }

  initMaterials() {
    this.protonMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.85,
      roughness: 0.25,
      metalness: 0.1,
      depthWrite: true
    });

    this.neutronMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.85,
      roughness: 0.25,
      metalness: 0.1,
      depthWrite: true
    });

    this.quarkUpMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.2
    });

    this.quarkDownMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.90,
      roughness: 0.15,
      metalness: 0.2
    });

    this.filamentMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.55
    });

    this.gluonTubeMat = new THREE.LineBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85
    });

    this.protonBagMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
      depthWrite: false
    });

    this.neutronBagMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.28,
      roughness: 0.2,
      depthWrite: false
    });

    this.bagWireMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
  }

  /**
   * Reconstructs nucleons, inner quarks, MIT bag shells, gluon flux tubes, and wormhole throat.
   */
  rebuildNucleus() {
    // Clear existing children
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    this.nucleonData = [];
    this.filamentLines = [];

    this.throatGroup = new THREE.Group();
    this.group.add(this.throatGroup);

    const Z = Math.max(1, Math.min(ELEMENTS.length, this.parameters.Z));
    const elem = getElement(Z);
    const A = this.parameters.A || elem.mass;
    const neutronCount = Math.max(0, A - Z);

    // Liquid drop model nuclear radius scaling: R = R0 * A^(1/3)
    const baseRadius = 0.95;
    const shellRadius = baseRadius * Math.pow(Math.max(1, A), 0.34);
    const nucleonRadius = Math.min(0.42, 0.40 * Math.pow(4 / Math.max(1, A), 0.15));

    // 1. Transparent nuclear outer shell & wireframe
    const shellGeo = new THREE.SphereGeometry(shellRadius, 32, 32);
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      roughness: 0.2,
      wireframe: false,
      depthWrite: false
    });
    this.shellMesh = new THREE.Mesh(shellGeo, shellMat);
    this.shellMesh.visible = !!this.parameters.showShell;
    this.group.add(this.shellMesh);

    // Nuclear liquid drop spherical wireframe
    const wireGeo = new THREE.SphereGeometry(shellRadius * 1.015, 16, 16);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    });
    this.wireMesh = new THREE.Mesh(wireGeo, wireMat);
    this.wireMesh.visible = !!this.parameters.showNucleusWire;
    this.group.add(this.wireMesh);

    // 2. Generate clustered nucleon positions (Fibonacci sphere packing)
    const totalNucleons = Z + neutronCount;
    const nucleonGeo = new THREE.SphereGeometry(nucleonRadius, 18, 18);
    const quarkGeo = new THREE.SphereGeometry(nucleonRadius * 0.26, 12, 12);
    const bagGeo = new THREE.SphereGeometry(nucleonRadius * 1.08, 16, 16);
    const bagWireGeo = new THREE.SphereGeometry(nucleonRadius * 1.10, 10, 10);

    const nucleonTypes = [];
    for (let p = 0; p < Z; p++) nucleonTypes.push('proton');
    for (let n = 0; n < neutronCount; n++) nucleonTypes.push('neutron');

    // Interleave types so protons and neutrons mix realistically
    nucleonTypes.sort(() => Math.sin(nucleonTypes.length * 997.1) - 0.5);

    const phiGolden = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < totalNucleons; i++) {
      const isProton = nucleonTypes[i] === 'proton';
      const normY = totalNucleons === 1 ? 0 : 1 - (i / (totalNucleons - 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - normY * normY));
      const theta = phiGolden * i;

      const radialDist = totalNucleons === 1 ? 0.0 : (shellRadius - nucleonRadius * 1.15) * Math.pow((i + 1) / totalNucleons, 0.45);
      const posX = radialDist * radiusAtY * Math.cos(theta);
      const posY = radialDist * normY;
      const posZ = radialDist * radiusAtY * Math.sin(theta);
      const basePos = new THREE.Vector3(posX, posY, posZ);

      // Nucleon group (moves together)
      const nGroup = new THREE.Group();
      nGroup.position.copy(basePos);
      this.group.add(nGroup);

      // Main nucleon core mesh
      const mesh = new THREE.Mesh(nucleonGeo, isProton ? this.protonMat : this.neutronMat);
      mesh.visible = !!this.parameters.showNucleons;
      mesh.userData = {
        interactiveType: 'nucleon',
        interactiveData: { isProton, index: i }
      };
      nGroup.add(mesh);

      // Level 1 Embedded: MIT Bag Model boundary membrane
      const bagMesh = new THREE.Mesh(bagGeo, isProton ? this.protonBagMat : this.neutronBagMat);
      const bagWire = new THREE.Mesh(bagWireGeo, this.bagWireMat);
      bagMesh.visible = !!this.parameters.showBag;
      bagWire.visible = !!this.parameters.showNucleonWire;
      nGroup.add(bagMesh);
      nGroup.add(bagWire);

      // Level 1 Embedded: 3 Valence Quarks with SU(3) color cycling
      const quarks = [];
      const gluonLines = [];
      const quarkDist = nucleonRadius * 0.48;

      for (let q = 0; q < 3; q++) {
        const isUp = isProton ? q < 2 : q < 1;
        const qMat = (isUp ? this.quarkUpMat : this.quarkDownMat).clone();
        qMat.color.copy(this.su3Colors[q]);
        qMat.emissive.copy(this.su3Colors[q]);

        const qMesh = new THREE.Mesh(quarkGeo, qMat);
        const qAngle = (q / 3) * Math.PI * 2;
        const qOffset = new THREE.Vector3(
          Math.cos(qAngle) * quarkDist,
          Math.sin(qAngle) * quarkDist,
          (q === 0 ? 0.04 : -0.02)
        );
        qMesh.position.copy(qOffset);

        // Raycasting registration on valence quark!
        qMesh.userData = {
          interactiveType: 'quark',
          interactiveData: {
            type: isUp ? 'up' : 'down',
            charge: isUp ? '+⅔ e' : '-⅓ e',
            isProton,
            nucleonIndex: i,
            quarkIndex: q
          }
        };
        nGroup.add(qMesh);
        quarks.push({ mesh: qMesh, baseOffset: qOffset, phase: q * 2.094, isUp });

        // Level 1 Embedded: Gluon Flux Tube from Steiner center (0,0,0) to quark
        const gGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          qOffset.clone()
        ]);
        const gLine = new THREE.Line(gGeo, this.gluonTubeMat);
        gLine.visible = !!this.parameters.showFluxTubes;
        nGroup.add(gLine);
        gluonLines.push({ line: gLine, quarkIndex: q });
      }

      // Level 1 Embedded: Virtual Quark-Antiquark Sea pairs (uū, dđ)
      const seaQuarks = [];
      if (this.parameters.showSea) {
        const seaGeo = new THREE.SphereGeometry(nucleonRadius * 0.10, 8, 8);
        for (let s = 0; s < 4; s++) {
          const sMat = new THREE.MeshBasicMaterial({
            color: s % 2 === 0 ? 0xf43f5e : 0x10b981,
            transparent: true,
            opacity: 0.65
          });
          const sMesh = new THREE.Mesh(seaGeo, sMat);
          sMesh.position.set(
            (Math.random() - 0.5) * nucleonRadius * 0.7,
            (Math.random() - 0.5) * nucleonRadius * 0.7,
            (Math.random() - 0.5) * nucleonRadius * 0.7
          );
          sMesh.visible = false; // toggled by LOD
          nGroup.add(sMesh);
          seaQuarks.push({
            mesh: sMesh,
            phase: Math.random() * Math.PI * 2,
            speed: 3.5 + Math.random() * 2.5
          });
        }
      }

      this.nucleonData.push({
        group: nGroup,
        mesh,
        bagMesh,
        bagWire,
        basePos,
        isProton,
        phase: i * 0.85,
        freq: 2.2 + (i % 5) * 0.35,
        quarks,
        gluonLines,
        seaQuarks
      });
    }

    // 3. Dynamic meson exchange filaments between neighboring nucleons
    if (this.parameters.showMesons && totalNucleons > 1) {
      const maxDistSq = Math.pow(nucleonRadius * 3.4, 2);
      for (let i = 0; i < totalNucleons; i++) {
        for (let j = i + 1; j < totalNucleons; j++) {
          const dSq = this.nucleonData[i].basePos.distanceToSquared(this.nucleonData[j].basePos);
          if (dSq <= maxDistSq) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
              this.nucleonData[i].basePos.clone(),
              this.nucleonData[j].basePos.clone()
            ]);
            const line = new THREE.Line(lineGeo, this.filamentMat);
            this.group.add(line);
            this.filamentLines.push({ line, idxA: i, idxB: j });
          }
        }
      }
    }

    // 4. Level 2 Embedded: Micro-Wormhole Throat & Calabi-Yau at primary proton
    this.buildEmbeddedWormhole(shellRadius);

    this.group.scale.setScalar(this.parameters.scale);
    this.applyLOD();
  }

  /**
   * Helper to calculate the flaring throat radius at any height y.
   * @param {number} y
   * @returns {number}
   */
  getThroatRadiusAtY(y) {
    if (!this.throatGeometryCache) return 0.5;
    const { topY, bottomY, waistY, topRadius, bottomRadius, r0 } = this.throatGeometryCache;
    if (y >= waistY) {
      const u = (topY - waistY > 1e-4) ? (y - waistY) / (topY - waistY) : 0;
      return Math.sqrt(r0 * r0 + (topRadius * topRadius - r0 * r0) * u * u);
    } else {
      const u = (waistY - bottomY > 1e-4) ? (y - waistY) / (bottomY - waistY) : 0;
      return Math.sqrt(r0 * r0 + (bottomRadius * bottomRadius - r0 * r0) * u * u);
    }
  }

  /**
   * Builds the extended micro-wormhole throat connecting the nucleus base
   * directly to the spacetime vacuum well and the Einstein-Rosen bridge.
   * Includes spiral particle vortex and descending shockwave rings.
   */
  buildEmbeddedWormhole(shellRadius) {
    while (this.throatGroup.children.length > 0) {
      const child = this.throatGroup.children[0];
      this.throatGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }

    this.throatVortexData = [];
    this.throatWaveRings = [];

    // Continuous geometry from nucleus base to vacuum well depth (y = -8.0)
    const topY = -shellRadius * 0.82;
    const bottomY = -8.0;
    const throatHeight = Math.abs(bottomY - topY);
    const centerY = (topY + bottomY) / 2;
    const waistY = topY - throatHeight * 0.45;
    const topRadius = Math.max(0.65, shellRadius * 0.65);
    const bottomRadius = 1.5; // Hermetically matches ProjectedJanusSystem upperGateRing
    const r0 = 0.32; // Waist radius at Kerr ring equator

    this.throatGeometryCache = { topY, bottomY, waistY, topRadius, bottomRadius, r0 };

    // 1. Hyperboloid Throat Mesh & Wireframe
    const throatGeo = new THREE.CylinderGeometry(1.0, 1.0, throatHeight, 32, 28, true);
    const pos = throatGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const yLocal = pos.getY(i);
      const yAbs = yLocal + centerY;
      const targetR = this.getThroatRadiusAtY(yAbs);
      const curR = Math.sqrt(pos.getX(i) * pos.getX(i) + pos.getZ(i) * pos.getZ(i));
      const scale = curR > 1e-4 ? targetR / curR : 1.0;
      pos.setX(i, pos.getX(i) * scale);
      pos.setZ(i, pos.getZ(i) * scale);
    }
    pos.needsUpdate = true;
    throatGeo.computeVertexNormals();

    const throatMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b,
      emissive: 0x4338ca,
      emissiveIntensity: 0.5,
      roughness: 0.25,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.throatMesh = new THREE.Mesh(throatGeo, throatMat);
    this.throatMesh.position.set(0, centerY, 0);
    this.throatMesh.userData = {
      interactiveType: 'wormhole',
      interactiveData: { type: 'throat', r0, topY, bottomY }
    };
    this.throatGroup.add(this.throatMesh);

    // Throat wireframe overlay
    const throatWireMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    this.throatWire = new THREE.Mesh(throatGeo, throatWireMat);
    this.throatWire.position.copy(this.throatMesh.position);
    this.throatGroup.add(this.throatWire);

    // 2. Top Intake Ring (at base of nucleus)
    const topRingGeo = new THREE.TorusGeometry(topRadius, 0.035, 12, 48);
    const topRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.topIntakeRing = new THREE.Mesh(topRingGeo, topRingMat);
    this.topIntakeRing.rotation.x = Math.PI / 2;
    this.topIntakeRing.position.set(0, topY, 0);
    this.throatGroup.add(this.topIntakeRing);

    // 3. Bottom Docking Ring (at vacuum well & bridge gateway, y = -8.0)
    const botRingGeo = new THREE.TorusGeometry(bottomRadius, 0.045, 12, 48);
    const botRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.bottomDockingRing = new THREE.Mesh(botRingGeo, botRingMat);
    this.bottomDockingRing.rotation.x = Math.PI / 2;
    this.bottomDockingRing.position.set(0, bottomY, 0);
    this.throatGroup.add(this.bottomDockingRing);

    // 4. Kerr Ring Singularity at throat waist
    const ringGeo = new THREE.TorusGeometry(r0 * 1.02, 0.024, 12, 40);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    this.kerrRing = new THREE.Mesh(ringGeo, ringMat);
    this.kerrRing.rotation.x = Math.PI / 2;
    this.kerrRing.position.set(0, waistY, 0);
    this.throatGroup.add(this.kerrRing);

    // 5. Heisenberg Repulsive Barrier Shield (+1/r^3)
    const shieldGeo = new THREE.SphereGeometry(r0 * 1.45, 18, 18);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      wireframe: true,
      transparent: true,
      opacity: 0.40
    });
    this.bounceShield = new THREE.Mesh(shieldGeo, shieldMat);
    this.bounceShield.position.set(0, waistY, 0);
    this.throatGroup.add(this.bounceShield);

    // 6. Calabi-Yau 6D Compactification Projection
    this.calabiYauGroup = new THREE.Group();
    const cySteps = 24;
    for (let c = 0; c < 3; c++) {
      const cyPts = [];
      const cyRadius = r0 * 0.92;
      for (let s = 0; s <= cySteps; s++) {
        const u = (s / cySteps) * Math.PI * 2;
        const rK = cyRadius * (1.0 + 0.3 * Math.cos(5 * u + c * 2.1));
        cyPts.push(new THREE.Vector3(
          Math.cos(u) * rK,
          Math.sin(5 * u) * 0.08,
          Math.sin(u) * rK
        ));
      }
      const cyGeo = new THREE.BufferGeometry().setFromPoints(cyPts);
      const cyMat = new THREE.LineBasicMaterial({
        color: c === 0 ? 0xec4899 : (c === 1 ? 0x8b5cf6 : 0x06b6d4),
        transparent: true,
        opacity: 0.6
      });
      const cyLine = new THREE.Line(cyGeo, cyMat);
      cyLine.rotation.x = c * 0.5;
      cyLine.rotation.y = c * 0.7;
      this.calabiYauGroup.add(cyLine);
    }
    this.calabiYauGroup.position.set(0, waistY, 0);
    this.throatGroup.add(this.calabiYauGroup);

    // 7. Dynamic Spiral Particle Vortex (36 flowing quantum droplets)
    const pCount = 36;
    const vGeo = new THREE.BufferGeometry();
    const vPositions = new Float32Array(pCount * 3);
    const vColors = new Float32Array(pCount * 3);

    for (let p = 0; p < pCount; p++) {
      const prog = Math.random();
      const phase = Math.random() * Math.PI * 2;
      const twist = 3.5 + Math.random() * 1.5;
      const speed = 0.35 + Math.random() * 0.45;

      this.throatVortexData.push({
        progress: prog,
        phase,
        twist,
        speed
      });

      const y = topY * (1.0 - prog) + bottomY * prog;
      const r = this.getThroatRadiusAtY(y) * 0.92;
      const angle = phase + twist * prog * Math.PI * 2;

      vPositions[p * 3 + 0] = Math.cos(angle) * r;
      vPositions[p * 3 + 1] = y;
      vPositions[p * 3 + 2] = Math.sin(angle) * r;

      vColors[p * 3 + 0] = 1.0;
      vColors[p * 3 + 1] = 0.75;
      vColors[p * 3 + 2] = 0.1;
    }

    vGeo.setAttribute('position', new THREE.BufferAttribute(vPositions, 3));
    vGeo.setAttribute('color', new THREE.BufferAttribute(vColors, 3));

    const vMat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.throatVortexPoints = new THREE.Points(vGeo, vMat);
    this.throatGroup.add(this.throatVortexPoints);

    // 8. Flaring Shockwave Wave Rings (traveling downwards)
    const ringCount = 3;
    for (let rIdx = 0; rIdx < ringCount; rIdx++) {
      const wGeo = new THREE.TorusGeometry(1.0, 0.024, 10, 36);
      const wMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
      });
      const wRing = new THREE.Mesh(wGeo, wMat);
      wRing.rotation.x = Math.PI / 2;
      this.throatWaveRings.push({
        mesh: wRing,
        offset: rIdx / ringCount,
        speed: 0.55
      });
      this.throatGroup.add(wRing);
    }

    // Initial throat visibility
    this.throatGroup.visible = false;
  }

  /**
   * Sets LOD level and camera distance for dynamic detail management.
   * @param {number} lod - 0 (Macro), 1 (Nucleon), 2 (Quark/Throat)
   * @param {number} distance - Camera distance to nucleus
   */
  setLOD(lod, distance) {
    this.lodLevel = lod;
    this.cameraDistance = distance;
    this.applyLOD();
  }

  /**
   * Applies visibility / opacity updates based on LOD or manual overrides.
   */
  applyLOD() {
    const isAuto = this.parameters.autoLOD;
    const lod = this.lodLevel;

    // 4 Nucleus Levels:
    // Level 0: Átlátszó maghéj
    // Level 1: Nukleonok (alapértelmezett BE)
    // Level 2: Nukleon belső részek (MIT Bag, Gluonok, Tenger)
    // Micro-throat: Kvark mikro-féregjárat (alapértelmezett KI)
    const showShell = isAuto ? (lod === 0 && !!this.parameters.showShell) : !!this.parameters.showShell;
    const showNucleons = this.parameters.showNucleons !== false;
    const showNucInterior = isAuto ? (lod >= 2 && this.parameters.showBag) : !!this.parameters.showBag;
    const showThroat = !!this.parameters.showThroat;
    const showNucleusWire = !!this.parameters.showNucleusWire;
    const showNucleonWire = !!this.parameters.showNucleonWire;

    if (this.shellMesh) this.shellMesh.visible = showShell;
    if (this.wireMesh) this.wireMesh.visible = showNucleusWire;

    // Bag material opacity modulation
    const bagOpacity = showNucInterior ? 0.28 : 0.0;
    const wireOpacity = showNucleonWire ? 0.35 : 0.0;
    if (this.protonBagMat) this.protonBagMat.opacity = bagOpacity;
    if (this.neutronBagMat) this.neutronBagMat.opacity = bagOpacity;
    if (this.bagWireMat) this.bagWireMat.opacity = wireOpacity;

    // Nucleon outer shell opacity (crisp solid presence)
    const nucOpacity = 0.85;
    if (this.protonMat) this.protonMat.opacity = nucOpacity;
    if (this.neutronMat) this.neutronMat.opacity = nucOpacity;

    for (const data of this.nucleonData) {
      if (data.mesh) data.mesh.visible = showNucleons;

      if (data.quarks) {
        for (const q of data.quarks) {
          q.mesh.visible = showNucInterior || (showNucleons && lod >= 1 && this.parameters.showQuarks !== false);
        }
      }

      if (data.bagMesh) data.bagMesh.visible = showNucInterior;
      if (data.bagWire) data.bagWire.visible = showNucleonWire;

      if (data.gluonLines) {
        for (const g of data.gluonLines) {
          g.line.visible = showNucInterior;
        }
      }

      if (data.seaQuarks) {
        for (const s of data.seaQuarks) {
          s.mesh.visible = showNucInterior;
        }
      }
    }

    for (const fil of this.filamentLines) {
      fil.line.visible = !!this.parameters.showMesons && showNucleons;
    }

    if (this.throatGroup) {
      this.throatGroup.visible = showThroat;
    }
  }

  setEmbeddedLayers(options = {}) {
    if (options.showShell !== undefined) this.parameters.showShell = !!options.showShell;
    if (options.showNucleons !== undefined) this.parameters.showNucleons = !!options.showNucleons;
    if (options.showNucleusWire !== undefined) this.parameters.showNucleusWire = !!options.showNucleusWire;
    if (options.showNucleonWire !== undefined) this.parameters.showNucleonWire = !!options.showNucleonWire;
    if (options.showQuarks !== undefined) this.parameters.showQuarks = !!options.showQuarks;
    if (options.showMesons !== undefined) this.parameters.showMesons = !!options.showMesons;
    if (options.showBag !== undefined) this.parameters.showBag = !!options.showBag;
    if (options.showFluxTubes !== undefined) this.parameters.showFluxTubes = !!options.showFluxTubes;
    if (options.showSea !== undefined) this.parameters.showSea = !!options.showSea;
    if (options.showThroat !== undefined) this.parameters.showThroat = !!options.showThroat;
    if (options.autoLOD !== undefined) this.parameters.autoLOD = !!options.autoLOD;
    this.applyLOD();
  }

  getNucleonMeshes() {
    return this.nucleonData.map((d, index) => ({
      mesh: d.mesh,
      isProton: d.isProton,
      index
    }));
  }

  getInteractiveQuarks() {
    const list = [];
    for (const d of this.nucleonData) {
      if (d.quarks) {
        for (const q of d.quarks) {
          list.push(q.mesh);
        }
      }
    }
    return list;
  }

  getInteractiveWormhole() {
    return this.throatMesh;
  }

  /**
   * Triggers a momentum-conserving nuclear recoil and Yukawa meson excitation.
   * @param {THREE.Vector3} [direction] - Direction of momentum impulse transferred to nucleus
   * @param {number} [strength=0.35]
   */
  triggerRecoil(direction, strength = 0.35) {
    const dir = direction ? direction.clone().normalize() : new THREE.Vector3(0.6, -0.2, 0.7);
    this.recoilVelocity.addScaledVector(dir, strength);
    this.yukawaExcitation = 1.0;
  }

  setYukawaExcitation(val) {
    this.yukawaExcitation = Math.max(0.0, Math.min(1.0, val));
  }

  onUpdate(time, deltaTime, syncEngine) {
    const isAnyPartVisible = !!(
      this.parameters.showShell ||
      this.parameters.showNucleons ||
      this.parameters.showNucleusWire ||
      this.parameters.showNucleonWire ||
      this.parameters.showBag ||
      this.parameters.showThroat
    );
    if (!isAnyPartVisible) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const rotSpeed = this.parameters.rotationSpeed;
    this.currentAngle += deltaTime * rotSpeed;
    this.group.rotation.y = this.currentAngle;

    // 1. Recoil physics: spring damper towards origin
    const springK = 28.0;
    const damping = 4.5;
    const springAcc = this.recoilOffset.clone().multiplyScalar(-springK);
    const dampAcc = this.recoilVelocity.clone().multiplyScalar(-damping);
    const totalAcc = springAcc.add(dampAcc);

    this.recoilVelocity.addScaledVector(totalAcc, deltaTime);
    this.recoilOffset.addScaledVector(this.recoilVelocity, deltaTime);
    this.group.position.copy(this.recoilOffset);

    // Yukawa excitation decay
    if (this.yukawaExcitation > 0.0) {
      this.yukawaExcitation = Math.max(0.0, this.yukawaExcitation - deltaTime * 0.7);
    }

    const nPhase = syncEngine.nucleusPhase;
    const excFreq = 1.0 + this.yukawaExcitation * 1.8;
    const excAmp = 0.05 * (1.0 + this.yukawaExcitation * 2.2);

    // Dynamic filament glow under Yukawa pion-exchange excitation
    if (this.filamentMat) {
      this.filamentMat.opacity = 0.45 + this.yukawaExcitation * 0.5;
      if (this.yukawaExcitation > 0.05) {
        this.filamentMat.color.setHex(0xfbbf24);
      } else {
        this.filamentMat.color.setHex(0xf59e0b);
      }
    }

    // Harmonic vibration of nucleons inside meson potential well
    const count = this.nucleonData.length;
    for (let i = 0; i < count; i++) {
      const data = this.nucleonData[i];
      const vibAmp = excAmp;
      const t = (nPhase * 0.6 + data.phase) * excFreq;

      data.group.position.set(
        data.basePos.x + Math.sin(t * data.freq) * vibAmp,
        data.basePos.y + Math.cos(t * data.freq * 1.1) * vibAmp,
        data.basePos.z + Math.sin(t * data.freq * 0.9 + 1.2) * vibAmp
      );

      // MIT Bag membrane gentle breathing
      if (data.bagMesh && data.bagMesh.visible) {
        const bagBreath = 1.0 + 0.04 * Math.sin(nPhase * 2.0 + data.phase);
        data.bagMesh.scale.setScalar(bagBreath);
        if (data.bagWire) data.bagWire.scale.setScalar(bagBreath * 1.01);
      }

      // Valence quark micro-oscillations and SU(3) color cycling
      if (data.quarks && data.quarks.length > 0) {
        for (let qIdx = 0; qIdx < data.quarks.length; qIdx++) {
          const q = data.quarks[qIdx];
          const qt = nPhase * 3.2 + q.phase;
          q.mesh.position.set(
            q.baseOffset.x + Math.sin(qt) * 0.035,
            q.baseOffset.y + Math.cos(qt * 1.2) * 0.035,
            q.baseOffset.z + Math.sin(qt * 0.8) * 0.025
          );

          // Update gluon flux tube endpoint
          if (data.gluonLines && data.gluonLines[qIdx] && data.gluonLines[qIdx].line.visible) {
            const posAttr = data.gluonLines[qIdx].line.geometry.attributes.position;
            posAttr.setXYZ(1, q.mesh.position.x, q.mesh.position.y, q.mesh.position.z);
            posAttr.needsUpdate = true;
          }
        }
      }

      // Virtual sea quark animation
      if (data.seaQuarks && data.seaQuarks.length > 0 && this.lodLevel >= 1) {
        for (const s of data.seaQuarks) {
          const st = time * s.speed + s.phase;
          const pop = Math.max(0.0, Math.sin(st));
          s.mesh.scale.setScalar(pop);
          s.mesh.material.opacity = 0.65 * pop;
        }
      }
    }

    // Update meson exchange lines positions
    for (let k = 0; k < this.filamentLines.length; k++) {
      const fil = this.filamentLines[k];
      const posA = this.nucleonData[fil.idxA].group.position;
      const posB = this.nucleonData[fil.idxB].group.position;
      const posAttr = fil.line.geometry.attributes.position;
      posAttr.setXYZ(0, posA.x, posA.y, posA.z);
      posAttr.setXYZ(1, posB.x, posB.y, posB.z);
      posAttr.needsUpdate = true;
    }

    // Outer shell pulsation
    if (this.shellMesh) {
      const breath = 1.0 + (0.015 + this.yukawaExcitation * 0.03) * Math.sin(nPhase * 1.5 * excFreq);
      this.shellMesh.scale.setScalar(breath);
      if (this.wireMesh) {
        this.wireMesh.scale.setScalar(breath * 1.015);
      }
    }

    // Micro-wormhole & Calabi-Yau animation
    if (this.throatGroup && this.throatGroup.visible) {
      const exc = this.wormholeExcitation;
      const speedBoost = 1.0 + exc * 2.5;

      if (this.kerrRing) {
        this.kerrRing.rotation.z += deltaTime * (2.8 * speedBoost);
      }
      if (this.calabiYauGroup) {
        this.calabiYauGroup.rotation.y += deltaTime * (1.2 * speedBoost);
        this.calabiYauGroup.rotation.x += deltaTime * (0.6 * speedBoost);
      }
      if (this.bounceShield) {
        const shieldPulse = 1.0 + (0.06 + exc * 0.14) * Math.sin(time * 6.0);
        this.bounceShield.scale.setScalar(shieldPulse);
        if (this.bounceShield.material) {
          this.bounceShield.material.opacity = THREE.MathUtils.lerp(0.35, 0.75, exc);
        }
      }
      if (this.topIntakeRing) {
        this.topIntakeRing.rotation.z += deltaTime * (1.8 * speedBoost);
      }
      if (this.bottomDockingRing) {
        this.bottomDockingRing.rotation.z -= deltaTime * (1.8 * speedBoost);
      }

      // Update Spiral Vortex Particles
      if (this.throatVortexPoints && this.throatVortexData.length > 0 && this.throatGeometryCache) {
        const posAttr = this.throatVortexPoints.geometry.attributes.position;
        const colAttr = this.throatVortexPoints.geometry.attributes.color;
        const { topY, bottomY } = this.throatGeometryCache;
        const col = new THREE.Color();

        for (let p = 0; p < this.throatVortexData.length; p++) {
          const d = this.throatVortexData[p];
          d.progress = (d.progress + deltaTime * d.speed * speedBoost) % 1.0;
          const prog = d.progress;
          const y = topY * (1.0 - prog) + bottomY * prog;
          const r = this.getThroatRadiusAtY(y) * 0.90;
          const angle = d.phase + time * (3.5 * speedBoost) + d.twist * prog * Math.PI * 2;

          posAttr.setXYZ(p, Math.cos(angle) * r, y, Math.sin(angle) * r);

          if (prog < 0.35) {
            col.setHex(0xffb703).lerp(new THREE.Color(0x00f0ff), prog / 0.35);
          } else if (prog < 0.70) {
            col.setHex(0x00f0ff).lerp(new THREE.Color(0xd946ef), (prog - 0.35) / 0.35);
          } else {
            col.setHex(0xd946ef).lerp(new THREE.Color(0xf43f5e), (prog - 0.70) / 0.30);
          }
          colAttr.setXYZ(p, col.r, col.g, col.b);
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;

        if (this.throatVortexPoints.material) {
          this.throatVortexPoints.material.size = 0.22 + exc * 0.12;
          this.throatVortexPoints.material.opacity = 0.85 + exc * 0.15;
        }
      }

      // Update Flaring Traveling Shockwave Rings
      if (this.throatWaveRings.length > 0 && this.throatGeometryCache) {
        const { topY, bottomY } = this.throatGeometryCache;
        for (let rIdx = 0; rIdx < this.throatWaveRings.length; rIdx++) {
          const wr = this.throatWaveRings[rIdx];
          const p = (wr.offset + time * wr.speed * speedBoost) % 1.0;
          const y = topY * (1.0 - p) + bottomY * p;
          const r = this.getThroatRadiusAtY(y);

          wr.mesh.position.set(0, y, 0);
          wr.mesh.scale.set(r, r, 1.0);
          wr.mesh.material.opacity = Math.sin(p * Math.PI) * (0.35 + exc * 0.55);
        }
      }
    }
  }

  setWormholeExcitation(intensity = 0.0) {
    this.targetWormholeExcitation = Math.max(0.0, Math.min(1.0, intensity));
  }

  onParametersChanged(params) {
    if (params.Z !== undefined || params.A !== undefined) {
      this.rebuildNucleus();
    } else {
      this.setEmbeddedLayers(params);
    }
    if (params.scale !== undefined) {
      this.group.scale.setScalar(params.scale);
    }
  }

  dispose() {
    super.dispose();
    this.nucleonData = [];
    this.filamentLines = [];
    this.throatVortexData = [];
    this.throatWaveRings = [];
  }
}

