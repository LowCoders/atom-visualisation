import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * EnergyFlowSystem: Visualizes higher-dimensional energy exchange and virtual gauge bosons.
 * Features:
 * - Two distinct particle streams:
 *   1. INWARD stream: Electron -> Nucleus (Radiant fiery gold/amber, Coulomb attraction & energy absorption)
 *   2. OUTWARD stream: Nucleus -> Electron (Neon cyan/electric blue, vacuum zero-point fluctuation)
 * - Geodesic dipping into the extra dimension (under the 3D brane / vacuum sheet)
 * - Transient electron-positron virtual pair fluctuations in the vacuum
 * - Circular glowing particle sprite textures with zero subpixel blurring
 */
export class EnergyFlowSystem extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'energy-flow', options = {}) {
    super(id, {
      name: 'Energiaáramlás & Virtuális Fotonok',
      ...options,
      parameters: {
        photonCount: options.photonCount || 48,
        dipDepth: options.dipDepth || 3.2,
        flowSpeed: options.flowSpeed || 1.6,
        showPhotons: options.showPhotons !== undefined ? options.showPhotons : true,
        showFilaments: options.showFilaments !== undefined ? options.showFilaments : true,
        showVirtualPairs: options.showVirtualPairs !== undefined ? options.showVirtualPairs : true,
        showJanusFilaments: options.showJanusFilaments !== undefined ? options.showJanusFilaments : true,
        ...options.parameters
      }
    });

    this.atomSystem = null;

    // Photons container group (inward, outward, filaments)
    this.photonsGroup = new THREE.Group();
    this.group.add(this.photonsGroup);

    // Glowing filamentous bridge curves
    this.filamentGroup = new THREE.Group();
    this.photonsGroup.add(this.filamentGroup);
    this.filamentLines = [];

    // Separate particle stream arrays
    this.inwardPhotons = [];
    this.outwardPhotons = [];

    this.inwardPoints = null;
    this.inwardGeo = null;
    this.inwardMat = null;

    this.outwardPoints = null;
    this.outwardGeo = null;
    this.outwardMat = null;

    this.particleTex = null;

    // Virtual electron-positron pairs popping from vacuum
    this.pairs = [];
    this.pairsGroup = new THREE.Group();
    this.group.add(this.pairsGroup);

    // Janus filaments group (depth threads down to wormhole throat for virtual positrons)
    this.janusGroup = new THREE.Group();
    this.pairsGroup.add(this.janusGroup);

    this.filamentMat = null;
    this.eMat = null;
    this.posMat = null;
    this.fluxMat = null;
    this.janusMat = null;
    this.sphereGeo = null;

    // Inward vs outward flow bias & dipole polarization
    this.inwardFlowBias = 0.0;
    this.intensityMultiplier = 1.0;
    this.dipolePolarization = 0.0;
  }

  setAtomSystem(atomSystem) {
    this.atomSystem = atomSystem;
  }

  /**
   * Set asymmetric inward flow bias (0.0: balanced 50/50, 1.0: 95% inward to nucleus).
   * @param {number} bias - [0.0 .. 1.0]
   * @param {number} [intensity=1.0] - Speed & density multiplier
   * @param {number} [dipole=0.0] - Vertical 2p_z dipole alignment [0.0 .. 1.0]
   */
  setInwardFlowBias(bias, intensity = 1.0, dipole = 0.0) {
    this.inwardFlowBias = Math.max(0.0, Math.min(1.0, bias));
    this.intensityMultiplier = Math.max(0.5, Math.min(3.5, intensity));
    this.dipolePolarization = Math.max(0.0, Math.min(1.0, dipole));
  }

  /**
   * Trigger immediate inward surge of virtual photons from struck electron into the nucleus.
   */
  triggerInwardSurge() {
    this.inwardFlowBias = 1.0;
    for (let i = 0; i < this.inwardPhotons.length; i++) {
      const p = this.inwardPhotons[i];
      p.electronIndex = 0; // Struck electron
      p.progress = (i / this.inwardPhotons.length) * 0.35; // Staggered stream starting at electron
      p.speed = 0.85 + Math.random() * 0.95; // Fast plunge
    }
  }

  build() {
    this.initTexture();
    this.initMaterials();
    this.initPhotons();
    this.initFilamentLines();
    this.initVirtualPairs();
    this.updateVisibilityFromParams();
  }

  updateVisibilityFromParams() {
    if (this.photonsGroup) {
      this.photonsGroup.visible = this.parameters.showPhotons !== false;
    }
    if (this.filamentGroup) {
      this.filamentGroup.visible = this.parameters.showFilaments !== false;
    }
    if (this.pairsGroup) {
      this.pairsGroup.visible = this.parameters.showVirtualPairs !== false;
    }
    if (this.janusGroup) {
      this.janusGroup.visible = this.parameters.showJanusFilaments !== false;
    }
  }

  onParametersChanged(params) {
    this.updateVisibilityFromParams();
  }

  initTexture() {
    // Generate glowing circular sprite texture on an offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    this.particleTex = new THREE.CanvasTexture(canvas);
  }

  initMaterials() {
    this.filamentMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.35,
      dashSize: 0.35,
      gapSize: 0.22,
      depthWrite: false
    });

    // Virtual electron (blue/cyan) & positron (bright rose/magenta)
    this.eMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.90
    });

    this.posMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.90
    });

    // Dipole electric flux thread between virtual e- and e+
    this.fluxMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    // Janus depth wormhole filaments (connecting virtual positrons down into the Janus gateway)
    this.janusMat = new THREE.LineBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sphereGeo = new THREE.SphereGeometry(0.13, 10, 10);
  }

  initFilamentLines() {
    const ptsCount = 18;
    for (let f = 0; f < 6; f++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(ptsCount * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      // Even lines: Inward channels (Amber-gold); Odd lines: Outward channels (Cyan)
      const isInwardChannel = (f % 2 === 0);
      const mat = new THREE.LineDashedMaterial({
        color: isInwardChannel ? 0xfbbf24 : 0x00f0ff,
        transparent: true,
        opacity: 0.35,
        dashSize: 0.45,
        gapSize: 0.25,
        depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      this.filamentLines.push(line);
      this.filamentGroup.add(line);
    }
  }

  initPhotons() {
    const totalCount = this.parameters.photonCount;
    const inCount = Math.floor(totalCount * 0.55);
    const outCount = totalCount - inCount;

    // 1. INWARD Photons: Radiant Gold / Fiery Amber (#ff9500 -> #ffcc00 -> #ffffff)
    this.inwardGeo = new THREE.BufferGeometry();
    const inPos = new Float32Array(inCount * 3);
    const inCol = new Float32Array(inCount * 3);
    const baseInCol = new THREE.Color(0xffb703);

    for (let i = 0; i < inCount; i++) {
      baseInCol.toArray(inCol, i * 3);
      this.inwardPhotons.push({
        progress: Math.random(),
        speed: 0.40 + Math.random() * 0.45,
        electronIndex: i % 8
      });
    }

    this.inwardGeo.setAttribute('position', new THREE.BufferAttribute(inPos, 3));
    this.inwardGeo.setAttribute('color', new THREE.BufferAttribute(inCol, 3));

    this.inwardMat = new THREE.PointsMaterial({
      size: 0.55,
      map: this.particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.inwardPoints = new THREE.Points(this.inwardGeo, this.inwardMat);
    this.photonsGroup.add(this.inwardPoints);

    // 2. OUTWARD Photons: Electric Neon Cyan / Ice Blue (#00f0ff -> #38bdf8)
    this.outwardGeo = new THREE.BufferGeometry();
    const outPos = new Float32Array(outCount * 3);
    const outCol = new Float32Array(outCount * 3);
    const baseOutCol = new THREE.Color(0x00f0ff);

    for (let i = 0; i < outCount; i++) {
      baseOutCol.toArray(outCol, i * 3);
      this.outwardPhotons.push({
        progress: Math.random(),
        speed: 0.35 + Math.random() * 0.35,
        electronIndex: i % 8
      });
    }

    this.outwardGeo.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
    this.outwardGeo.setAttribute('color', new THREE.BufferAttribute(outCol, 3));

    this.outwardMat = new THREE.PointsMaterial({
      size: 0.30,
      map: this.particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.outwardPoints = new THREE.Points(this.outwardGeo, this.outwardMat);
    this.photonsGroup.add(this.outwardPoints);
  }

  /**
   * Calculates the local electric field vector E(r) generated by the positive
   * atomic nucleus (+Z) and negative bound electrons (-1 each).
   * Determines the physical dipole polarization axis of virtual pairs.
   * @param {THREE.Vector3} pos
   * @param {THREE.Vector3} nucleusPos
   * @param {Array<THREE.Vector3>} electronPositions
   * @param {number} [Z=2]
   * @returns {THREE.Vector3}
   */
  calculateElectricField(pos, nucleusPos, electronPositions, Z = 2) {
    const dNuc = new THREE.Vector3().subVectors(pos, nucleusPos);
    const distSqNuc = dNuc.lengthSq() + 0.35;
    const distNuc = Math.sqrt(distSqNuc);
    const eField = dNuc.clone().multiplyScalar(Z / (distNuc * distSqNuc));

    if (electronPositions && electronPositions.length > 0) {
      for (let k = 0; k < electronPositions.length; k++) {
        const ep = electronPositions[k];
        const dE = new THREE.Vector3().subVectors(pos, ep);
        const distSqE = dE.lengthSq() + 0.30;
        const distE = Math.sqrt(distSqE);
        eField.addScaledVector(dE, -1.0 / (distE * distSqE));
      }
    }

    return eField;
  }

  /**
   * Spawns a virtual electron-positron pair with Uehling density distribution.
   * Dipole orientation aligns with the local electric field vector.
   */
  spawnVirtualPair(pair, nucleusPos, electronPositions, Z) {
    pair.life = 0;
    pair.duration = 1.3 + Math.random() * 1.5;

    let maxR = 4.5;
    if (electronPositions && electronPositions.length > 0) {
      let maxDistSq = 0;
      electronPositions.forEach(p => {
        const d2 = p.lengthSq();
        if (d2 > maxDistSq) maxDistSq = d2;
      });
      maxR = Math.max(3.2, Math.sqrt(maxDistSq) * 1.15);
    }

    // Uehling probability: density concentrated near core & shells with high gradient
    const u = Math.random();
    const rad = 1.2 + Math.pow(u, 1.35) * (maxR - 0.9);
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.75;

    pair.center.set(
      rad * Math.cos(phi) * Math.cos(theta),
      rad * Math.sin(phi),
      rad * Math.cos(phi) * Math.sin(theta)
    );
    pair.group.position.copy(pair.center);

    const eField = this.calculateElectricField(pair.center, nucleusPos, electronPositions, Z);
    if (eField.lengthSq() > 1e-4) {
      pair.axis.copy(eField.normalize());
    } else {
      pair.axis.copy(pair.center).normalize();
    }

    const fieldMag = Math.min(3.0, eField.length());
    pair.baseMaxDist = 0.45 + fieldMag * 0.22;
  }

  initVirtualPairs() {
    const pairCount = 16;

    for (let i = 0; i < pairCount; i++) {
      const pairGroup = new THREE.Group();

      const eMesh = new THREE.Mesh(this.sphereGeo, this.eMat);
      const posMesh = new THREE.Mesh(this.sphereGeo, this.posMat);
      pairGroup.add(eMesh);
      pairGroup.add(posMesh);

      // Dipole electric flux thread between e- and e+
      const fluxGeo = new THREE.BufferGeometry();
      const fluxPositions = new Float32Array(6);
      fluxGeo.setAttribute('position', new THREE.BufferAttribute(fluxPositions, 3));
      const fluxLine = new THREE.Line(fluxGeo, this.fluxMat.clone());
      pairGroup.add(fluxLine);

      // Janus filament line down to wormhole throat (3 vertices)
      const janusGeo = new THREE.BufferGeometry();
      const janusPositions = new Float32Array(9);
      janusGeo.setAttribute('position', new THREE.BufferAttribute(janusPositions, 3));
      const janusLine = new THREE.Line(janusGeo, this.janusMat.clone());
      this.janusGroup.add(janusLine);

      this.pairsGroup.add(pairGroup);

      const pair = {
        group: pairGroup,
        eMesh,
        posMesh,
        fluxLine,
        janusLine,
        life: Math.random(), // Staggered birth
        duration: 1.3 + Math.random() * 1.5,
        baseMaxDist: 0.55,
        axis: new THREE.Vector3(0, 1, 0),
        center: new THREE.Vector3()
      };

      const rad = 2.0 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.75;
      pair.center.set(
        rad * Math.cos(phi) * Math.cos(theta),
        rad * Math.sin(phi),
        rad * Math.cos(phi) * Math.sin(theta)
      );
      pair.group.position.copy(pair.center);
      pair.axis.copy(pair.center).normalize();

      this.pairs.push(pair);
    }
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (!this.group.visible) return;

    const showPhotons = this.parameters.showPhotons !== false;
    const showPairs = this.parameters.showVirtualPairs !== false;
    if (!showPhotons && !showPairs) return;

    const atom = this.atomSystem
      ? (this.atomSystem.getPrimaryAtom ? this.atomSystem.getPrimaryAtom() : this.atomSystem)
      : null;

    if (!atom) return;

    const electronPositions = (atom.electrons && atom.electrons.worldPositions && atom.electrons.worldPositions.length > 0)
      ? atom.electrons.worldPositions
      : [new THREE.Vector3(3.5, 0, 0)];

    const nucleusPos = atom.nucleus
      ? atom.nucleus.group.position
      : new THREE.Vector3(0, 0, 0);

    const nucWorldPos = new THREE.Vector3();
    if (atom.nucleus && atom.nucleus.group) {
      atom.nucleus.group.getWorldPosition(nucWorldPos);
    } else {
      nucWorldPos.copy(nucleusPos);
    }

    const Z = (atom.elementData && atom.elementData.Z) || (atom.parameters && atom.parameters.Z) || 2;
    const dip = this.parameters.dipDepth;
    const speedScale = this.parameters.flowSpeed * this.intensityMultiplier;

    // --- 1. Update INWARD Virtual Photons (Electron -> Nucleus: GOLD/AMBER) ---
    if (showPhotons && this.inwardGeo) {
      const inPosAttr = this.inwardGeo.getAttribute('position');
      const inColAttr = this.inwardGeo.getAttribute('color');
      const inSpeedBoost = speedScale * (1.0 + this.inwardFlowBias * 1.5);

      for (let i = 0; i < this.inwardPhotons.length; i++) {
        const p = this.inwardPhotons[i];
        p.progress += deltaTime * p.speed * inSpeedBoost;
        if (p.progress > 1.0) {
          p.progress -= 1.0;
          p.electronIndex = (this.inwardFlowBias > 0.2 && Math.random() < 0.85)
            ? 0
            : Math.floor(Math.random() * electronPositions.length);
        }

        const ePos = electronPositions[p.electronIndex % electronPositions.length] || electronPositions[0];
        const t = p.progress; // 0: at electron, 1: at nucleus / throat

        // During inward surge, funnel energy towards nucleus base and wormhole throat intake
        const throatTopY = (atom && atom.nucleus && atom.nucleus.throatGeometryCache)
          ? atom.nucleus.throatGeometryCache.topY
          : -1.25;
        const targetNucY = THREE.MathUtils.lerp(nucleusPos.y, nucleusPos.y + throatTopY, this.inwardFlowBias * 0.65);

        const curX = THREE.MathUtils.lerp(ePos.x, nucleusPos.x, t);
        const curZ = THREE.MathUtils.lerp(ePos.z, nucleusPos.z, t);
        const curY3D = THREE.MathUtils.lerp(ePos.y, targetNucY, t);
        const sag = Math.sin(Math.PI * t) * dip;
        inPosAttr.setXYZ(i, curX, curY3D - sag, curZ);

        // Color gradient: starts bright sun-gold (#ffb703) at electron, becomes white-hot (#ffffff) plunge into nucleus
        const r = 1.0;
        const g = THREE.MathUtils.lerp(0.72, 1.0, t);
        const b = THREE.MathUtils.lerp(0.05, 0.90, t);
        inColAttr.setXYZ(i, r, g, b);
      }
      inPosAttr.needsUpdate = true;
      inColAttr.needsUpdate = true;

      if (this.inwardMat) {
        // Grow larger and brighter during surge
        this.inwardMat.size = THREE.MathUtils.lerp(0.55, 0.95, this.inwardFlowBias);
        this.inwardMat.opacity = 0.95;
      }
    }

    // --- 2. Update OUTWARD Virtual Photons (Nucleus -> Electron: NEON CYAN/BLUE) ---
    if (showPhotons && this.outwardGeo) {
      const outPosAttr = this.outwardGeo.getAttribute('position');
      const outColAttr = this.outwardGeo.getAttribute('color');

      for (let i = 0; i < this.outwardPhotons.length; i++) {
        const p = this.outwardPhotons[i];
        p.progress += deltaTime * p.speed * speedScale;
        if (p.progress > 1.0) {
          p.progress -= 1.0;
          p.electronIndex = Math.floor(Math.random() * electronPositions.length);
        }

        const ePos = electronPositions[p.electronIndex % electronPositions.length] || electronPositions[0];
        const t = 1.0 - p.progress; // 0: at nucleus (progress 1), 1: at electron (progress 0)
        const curT = 1.0 - t; // 0 at nucleus, 1 at electron

        const curX = THREE.MathUtils.lerp(nucleusPos.x, ePos.x, curT);
        const curZ = THREE.MathUtils.lerp(nucleusPos.z, ePos.z, curT);
        const curY3D = THREE.MathUtils.lerp(nucleusPos.y, ePos.y, curT);
        const sag = Math.sin(Math.PI * curT) * dip;
        outPosAttr.setXYZ(i, curX, curY3D - sag, curZ);

        // Electric neon cyan to violet-blue
        const r = THREE.MathUtils.lerp(0.0, 0.30, curT);
        const g = THREE.MathUtils.lerp(0.95, 0.70, curT);
        const b = 1.0;
        outColAttr.setXYZ(i, r, g, b);
      }
      outPosAttr.needsUpdate = true;
      outColAttr.needsUpdate = true;

      if (this.outwardMat) {
        // Dims during inward collision surge so the gold plunge dominates
        this.outwardMat.opacity = THREE.MathUtils.lerp(0.85, 0.25, this.inwardFlowBias);
      }
    }

    // --- 3. Update Filament Lines with Inward vs Outward Dash Flow ---
    if (showPhotons && this.filamentLines && this.filamentLines.length > 0) {
      const ptsCount = 18;
      for (let f = 0; f < this.filamentLines.length; f++) {
        const line = this.filamentLines[f];
        const isInward = (f % 2 === 0);
        const eIdx = (isInward && this.inwardFlowBias > 0.2) ? 0 : (f % electronPositions.length);
        const ePos = electronPositions[eIdx] || electronPositions[0];
        const lPos = line.geometry.attributes.position;

        const throatTopY = (atom && atom.nucleus && atom.nucleus.throatGeometryCache)
          ? atom.nucleus.throatGeometryCache.topY
          : -1.25;
        const targetLineY = isInward
          ? THREE.MathUtils.lerp(nucleusPos.y, nucleusPos.y + throatTopY * 0.65, this.inwardFlowBias * 0.70)
          : nucleusPos.y;

        for (let s = 0; s < ptsCount; s++) {
          const frac = s / (ptsCount - 1);
          const lx = THREE.MathUtils.lerp(ePos.x, nucleusPos.x, frac);
          const lz = THREE.MathUtils.lerp(ePos.z, nucleusPos.z, frac);
          const ly3D = THREE.MathUtils.lerp(ePos.y, targetLineY, frac);
          const sag = Math.sin(Math.PI * frac) * dip;
          lPos.setXYZ(s, lx, ly3D - sag, lz);
        }
        lPos.needsUpdate = true;
        line.computeLineDistances();

        // Inward lines stream negative dashOffset (towards nucleus); outward stream positive
        const flowDir = isInward ? -1 : 1;
        const lineSpeed = (isInward && this.inwardFlowBias > 0.2) ? 4.8 : 1.8;
        line.material.dashOffset += flowDir * deltaTime * lineSpeed * speedScale;

        if (isInward) {
          line.material.color.setHex(0xfbbf24);
          line.material.opacity = THREE.MathUtils.lerp(0.35, 0.75, this.inwardFlowBias);
        } else {
          line.material.color.setHex(0x00f0ff);
          line.material.opacity = THREE.MathUtils.lerp(0.35, 0.15, this.inwardFlowBias);
        }
      }
    }

    // --- 4. Update Virtual Electron-Positron Pairs (QED Vacuum Polarization & Janus Link) ---
    if (showPairs) {
      const pairSpeedScale = speedScale * (1.0 + this.inwardFlowBias * 0.6);
      for (let i = 0; i < this.pairs.length; i++) {
        const pair = this.pairs[i];
        pair.life += (deltaTime / pair.duration) * pairSpeedScale;
        if (pair.life > 1.0) {
          this.spawnVirtualPair(pair, nucleusPos, electronPositions, Z);
        }

        // Calculate dynamic electric field and smoothly rotate dipole axis along field lines
        const eField = this.calculateElectricField(pair.center, nucleusPos, electronPositions, Z);
        if (eField.lengthSq() > 1e-4) {
          pair.axis.lerp(eField.normalize(), Math.min(1.0, deltaTime * 8.0)).normalize();
        }

        // Schwinger effect: electric field surge expands dipole separation
        const surgeMultiplier = 1.0 + this.inwardFlowBias * 0.85;
        const currentMaxDist = pair.baseMaxDist * surgeMultiplier;
        const separation = Math.sin(Math.PI * pair.life) * currentMaxDist;
        const scale = Math.sin(Math.PI * pair.life);

        pair.group.position.copy(nucWorldPos).add(pair.center);

        // e+ (positron, red) is pushed along +axis (along field lines)
        // e- (electron, blue) is pulled along -axis (against field lines, screening core charge)
        pair.posMesh.position.copy(pair.axis).multiplyScalar(separation * 0.5);
        pair.eMesh.position.copy(pair.axis).multiplyScalar(-separation * 0.5);

        pair.eMesh.scale.setScalar(scale);
        pair.posMesh.scale.setScalar(scale);

        // Update electric flux thread between e- and e+
        if (pair.fluxLine) {
          const fPos = pair.fluxLine.geometry.attributes.position;
          fPos.setXYZ(0, pair.eMesh.position.x, pair.eMesh.position.y, pair.eMesh.position.z);
          fPos.setXYZ(1, pair.posMesh.position.x, pair.posMesh.position.y, pair.posMesh.position.z);
          fPos.needsUpdate = true;
          pair.fluxLine.material.opacity = Math.sin(Math.PI * pair.life) * 0.65;
        }

        // Update Janus depth filament connecting virtual positron to the extra-dimensional throat
        if (pair.janusLine && this.parameters.showJanusFilaments !== false) {
          const jPos = pair.janusLine.geometry.attributes.position;
          // Exact world position of the virtual positron (+1e lepton)
          const pWorldX = nucWorldPos.x + pair.center.x + pair.posMesh.position.x;
          const pWorldY = nucWorldPos.y + pair.center.y + pair.posMesh.position.y;
          const pWorldZ = nucWorldPos.z + pair.center.z + pair.posMesh.position.z;

          // Wormhole throat gateway and waist coordinates
          const throatX = nucWorldPos.x;
          const throatGateY = -8.0; // exactly at the upperGateRing docking level
          const throatWaistY = (atom && atom.nucleus && atom.nucleus.throatGeometryCache)
            ? atom.nucleus.throatGeometryCache.waistY
            : -4.5;
          const throatZ = nucWorldPos.z;

          // Smooth inward hyperbolic curving down into the throat through the waist
          const midX = THREE.MathUtils.lerp(pWorldX, throatX, 0.60);
          const midY = THREE.MathUtils.lerp(pWorldY, throatWaistY, 0.65);
          const midZ = THREE.MathUtils.lerp(pWorldZ, throatZ, 0.60);

          jPos.setXYZ(0, pWorldX, pWorldY, pWorldZ);
          jPos.setXYZ(1, midX, midY, midZ);
          jPos.setXYZ(2, throatX, throatGateY, throatZ);
          jPos.needsUpdate = true;

          let jOpacity = Math.sin(Math.PI * pair.life) * 0.45;
          if (pair.life > 0.82) {
            // Annihilation drainage pulse down to throat
            const drain = (pair.life - 0.82) / 0.18;
            jOpacity = Math.max(jOpacity, (1.0 - drain) * 0.90);
          }
          pair.janusLine.material.opacity = jOpacity;
        }
      }
    }
  }

  dispose() {
    super.dispose();
    if (this.inwardGeo) this.inwardGeo.dispose();
    if (this.outwardGeo) this.outwardGeo.dispose();
    if (this.inwardMat) this.inwardMat.dispose();
    if (this.outwardMat) this.outwardMat.dispose();
    if (this.particleTex) this.particleTex.dispose();
    if (this.filamentMat) this.filamentMat.dispose();
    if (this.eMat) this.eMat.dispose();
    if (this.posMat) this.posMat.dispose();
    if (this.fluxMat) this.fluxMat.dispose();
    if (this.janusMat) this.janusMat.dispose();
    if (this.sphereGeo) this.sphereGeo.dispose();
    if (this.filamentLines) {
      this.filamentLines.forEach(line => {
        if (line.geometry) line.geometry.dispose();
        if (line.material) line.material.dispose();
      });
      this.filamentLines = [];
    }
    if (this.pairs) {
      this.pairs.forEach(pair => {
        if (pair.fluxLine) {
          if (pair.fluxLine.geometry) pair.fluxLine.geometry.dispose();
          if (pair.fluxLine.material) pair.fluxLine.material.dispose();
        }
        if (pair.janusLine) {
          if (pair.janusLine.geometry) pair.janusLine.geometry.dispose();
          if (pair.janusLine.material) pair.janusLine.material.dispose();
        }
      });
      this.pairs = [];
    }
  }
}
