import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import { buildElectronConfiguration, ELEMENTS } from '../core/QuantumPhysics.js';

/**
 * ElectronSystem: Visualizes individual orbiting electrons with quantized orbital planes and angles.
 * Features:
 * - Shell (K, L, M, N) and subshell (s, p, d, f) distinction
 * - Space quantization: Orbital tilt angles according to cos(theta) = ml / sqrt(l*(l+1))
 * - Real-time de Broglie wavepacket centroid motion with sine ripple modulation
 * - Orbital trajectory guide rings showing exact planes
 * - Spin vectors (+1/2 up vs -1/2 down)
 * - Exposes active electron coordinates for quantum cloud wavepacket condensation
 */
export class ElectronSystem extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'electron-system', options = {}) {
    super(id, {
      name: 'Elektronok & Pályák',
      ...options,
      parameters: {
        Z: options.Z || 2,
        showElectrons: options.showElectrons !== undefined ? options.showElectrons : true,
        showTracks: options.showTracks !== undefined ? options.showTracks : true,
        showSpins: options.showSpins !== undefined ? options.showSpins : true,
        showDeBroglieWaves: options.showDeBroglieWaves !== undefined ? options.showDeBroglieWaves : true,
        baseSpeed: options.baseSpeed || 1.8,
        scale: options.scale || 1.0,
        ...options.parameters
      }
    });

    this.electrons = [];
    this.trackLines = [];
    this.orbitalsGroup = new THREE.Group();
    this.group.add(this.orbitalsGroup);

    // Cached positions for external subscribers (e.g. cloud condensation)
    this.worldPositions = [];

    // Continuous orbital morphing state (generalized (n_i,l_i) -> (n_f,l_f) transition)
    this.transitionAlpha = 0.0;
    this.targetAlpha = 0.0;
    this.impactEnergySurge = 0.0;

    // Excitation channel: which electron absorbs & where it goes + spectator relaxation shifts
    this.activeIndex = 0;
    this.targetState = { n: 2, l: 1, ml: 0 };
    // Map "n:l" -> relative radius shift (Delta r / r) applied to spectator electrons
    this.spectatorShiftMap = {};
  }

  setTransitionProgress(alpha) {
    this.targetAlpha = Math.max(0.0, Math.min(1.0, alpha));
  }

  /**
   * Configures the multi-electron excitation channel.
   * @param {Object} cfg
   * @param {number} cfg.activeIndex - index of the absorbing electron
   * @param {number} cfg.targetN - target principal quantum number
   * @param {number} cfg.targetL - target angular momentum
   * @param {number} [cfg.targetMl=0]
   * @param {Array<{n:number,l:number,relShift:number,isSource:boolean}>} [cfg.spectatorShifts]
   */
  setExcitationState(cfg = {}) {
    if (cfg.activeIndex !== undefined) this.activeIndex = cfg.activeIndex;
    if (cfg.targetN !== undefined) {
      this.targetState = {
        n: cfg.targetN,
        l: cfg.targetL !== undefined ? cfg.targetL : 1,
        ml: cfg.targetMl !== undefined ? cfg.targetMl : 0
      };
    }
    if (Array.isArray(cfg.spectatorShifts)) {
      this.spectatorShiftMap = {};
      cfg.spectatorShifts.forEach((s) => {
        this.spectatorShiftMap[`${s.n}:${s.l}`] = s.relShift || 0;
      });
    }
  }

  setImpactKick(intensity = 1.0) {
    this.impactEnergySurge = Math.max(this.impactEnergySurge, Math.min(1.0, intensity));
  }

  build() {
    this.rebuildElectrons();
  }

  rebuildElectrons() {
    // Clear existing children
    while (this.orbitalsGroup.children.length > 0) {
      const child = this.orbitalsGroup.children[0];
      this.orbitalsGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    }
    this.electrons = [];
    this.trackLines = [];
    this.worldPositions = [];

    const Z = Math.max(1, Math.min(ELEMENTS.length, this.parameters.Z));
    const config = buildElectronConfiguration(Z);

    const shellColors = [
      new THREE.Color(0x38bdf8), // n = 1: Cyan
      new THREE.Color(0x10b981), // n = 2: Green
      new THREE.Color(0xfbbf24), // n = 3: Amber
      new THREE.Color(0xf43f5e)  // n = 4: Magenta
    ];

    const coreGeo = new THREE.SphereGeometry(0.20, 16, 16);
    const haloGeo = new THREE.SphereGeometry(0.48, 16, 16);

    config.electrons.forEach((eData, idx) => {
      const n = eData.n;
      const l = eData.l;
      const ml = eData.ml;
      const ms = eData.ms;

      const shellCol = shellColors[(n - 1) % shellColors.length].clone();
      if (ms < 0) {
        shellCol.offsetHSL(0.04, 0, 0.05);
      }

      // 1. Orbital radius: scaled visually
      const radius = (2.2 * Math.pow(n, 1.4) + (l * 0.55)) * this.parameters.scale;

      // 2. Orbital inclination (space quantization of angular momentum)
      // cos(theta) = ml / sqrt(l * (l + 1))
      let tiltX = 0;
      let tiltZ = 0;
      let thetaDeg = 0;
      let cosTheta = 1.0;

      if (l > 0) {
        const lNorm = Math.sqrt(l * (l + 1));
        cosTheta = Math.max(-1, Math.min(1, ml / lNorm));
        const theta = Math.acos(cosTheta);
        thetaDeg = (theta * 180 / Math.PI);
        // Tilt axis rotated according to electron subshell index
        const azimuth = (ml * 1.05) + (idx * 0.4);
        tiltX = Math.sin(theta) * Math.cos(azimuth) * 0.85;
        tiltZ = Math.sin(theta) * Math.sin(azimuth) * 0.85;
      } else {
        // s-orbitals distributed across slightly varied planes so paired electrons don't collide
        tiltX = (idx % 2 === 0 ? 0.15 : -0.15);
        tiltZ = (idx % 2 === 0 ? 0.10 : -0.10);
      }

      // Orbital container plane
      const planeGroup = new THREE.Group();
      planeGroup.rotation.x = tiltX;
      planeGroup.rotation.z = tiltZ;
      this.orbitalsGroup.add(planeGroup);

      // 3. Trajectory guide track ring
      const trackPoints = 72;
      const trackGeo = new THREE.BufferGeometry();
      const trackPos = new Float32Array((trackPoints + 1) * 3);
      for (let p = 0; p <= trackPoints; p++) {
        const a = (p / trackPoints) * Math.PI * 2;
        trackPos[p * 3]     = Math.cos(a) * radius;
        trackPos[p * 3 + 1] = 0;
        trackPos[p * 3 + 2] = Math.sin(a) * radius;
      }
      trackGeo.setAttribute('position', new THREE.BufferAttribute(trackPos, 3));
      const trackMat = new THREE.LineBasicMaterial({
        color: shellCol,
        transparent: true,
        opacity: this.parameters.showTracks ? 0.28 : 0.0,
        depthWrite: false
      });
      const trackLine = new THREE.Line(trackGeo, trackMat);
      trackLine.visible = !!this.parameters.showTracks;
      planeGroup.add(trackLine);
      this.trackLines.push(trackLine);

      // 4. Electron Mesh (Core + Luminous Halo)
      const eGroup = new THREE.Group();
      eGroup.visible = this.parameters.showElectrons !== false;
      planeGroup.add(eGroup);

      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      eGroup.add(coreMesh);

      const haloMat = new THREE.MeshBasicMaterial({
        color: shellCol,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      eGroup.add(haloMesh);

      // 5. Spin indicator arrow (+1/2 up, -1/2 down)
      if (this.parameters.showSpins) {
        const spinDir = new THREE.Vector3(0, ms > 0 ? 1 : -1, 0);
        const spinArrow = new THREE.ArrowHelper(
          spinDir,
          new THREE.Vector3(0, 0, 0),
          0.7,
          shellCol.getHex(),
          0.25,
          0.18
        );
        eGroup.add(spinArrow);
      }

      // Orbital speed: v ~ 1 / sqrt(n)
      const speed = (this.parameters.baseSpeed / Math.sqrt(n)) * (1.0 + (idx % 3) * 0.08);
      // Phase offset so electrons don't clump
      const phaseOffset = (idx * (Math.PI * 2 / Math.max(1, Z))) + (ms < 0 ? Math.PI : 0);

      this.electrons.push({
        eGroup,
        planeGroup,
        trackLine,
        trackGeo,
        coreMesh,
        haloMesh,
        baseColor: shellCol.clone(),
        baseRadius: radius,
        radius,
        speed,
        currentAngle: phaseOffset,
        n,
        l,
        ml,
        ms,
        thetaDeg,
        cosTheta,
        tiltX,
        tiltZ,
        deBroglieN: 2 * n, // number of de Broglie waves around orbit
        worldPos: new THREE.Vector3()
      });

      this.worldPositions.push(new THREE.Vector3());
    });
  }

  getOrbitalTiltData() {
    return this.electrons.map((e, idx) => ({
      index: idx,
      n: e.n,
      l: e.l,
      ml: e.ml,
      ms: e.ms,
      thetaDeg: e.thetaDeg,
      cosTheta: e.cosTheta
    }));
  }

  onUpdate(time, deltaTime, syncEngine) {
    const showWaves = this.parameters.showDeBroglieWaves;

    // Smoothly interpolate transition alpha towards target
    this.transitionAlpha = THREE.MathUtils.lerp(
      this.transitionAlpha,
      this.targetAlpha,
      Math.min(1.0, deltaTime * 4.5)
    );

    const alpha = this.transitionAlpha;

    // Virial energy conversion: Kinetic surge converts directly into orbital potential energy
    // as alpha expands from 0 (1s) to 1 (2p_z). No balloon-like inflating/deflating in place!
    const activeSurge = this.impactEnergySurge * Math.max(0.0, 1.0 - alpha);

    if (this.impactEnergySurge > 0.001) {
      this.impactEnergySurge *= Math.exp(-deltaTime * 0.9);
    } else {
      this.impactEnergySurge = 0;
    }

    // Virial speed progression: electron starts fast on impact, then naturally slows
    // as it climbs the potential well to n=2 (which has lower orbital speed than n=1)
    const virialSpeedFactor = THREE.MathUtils.lerp(1.0, 0.72, alpha);
    const speedBoost = virialSpeedFactor + activeSurge * 0.85;

    for (let i = 0; i < this.electrons.length; i++) {
      const e = this.electrons[i];
      const isActive = i === this.activeIndex;
      const curSpeed = isActive ? e.speed * speedBoost : e.speed;
      e.currentAngle += deltaTime * curSpeed;

      // The active (absorbing) electron undergoes a generalized (l_i -> l_f) transition when alpha > 0
      if (isActive && (alpha > 0.001 || e.wasMorphed)) {
        e.wasMorphed = (alpha > 0.001);
        const rFrom = e.baseRadius;
        // Excited-state radius grows with n_f^2 (Bohr scaling), capped for visibility
        const tN = this.targetState.n;
        const rTo = (2.2 * Math.pow(tN, 1.4) + this.targetState.l * 0.55 + 1.2) * this.parameters.scale;
        const lFrom = e.l;
        const lTo = this.targetState.l;

        // 1. Update track geometry vertices to show the morphing path
        if (e.trackGeo && e.trackGeo.attributes.position) {
          const trackPos = e.trackGeo.attributes.position.array;
          const totalPts = 72;
          for (let p = 0; p <= totalPts; p++) {
            const a = (p / totalPts) * Math.PI * 2;
            const pt = this.evaluateGeneralizedMorph(a, alpha, lFrom, lTo, rFrom, rTo);
            trackPos[p * 3 + 0] = pt.x;
            trackPos[p * 3 + 1] = pt.y;
            trackPos[p * 3 + 2] = pt.z;
          }
          e.trackGeo.attributes.position.needsUpdate = true;
        }

        // 2. Position electron on the morphed track
        const pt = this.evaluateGeneralizedMorph(e.currentAngle, alpha, lFrom, lTo, rFrom, rTo);
        let ey = pt.y;
        if (showWaves) {
          ey += Math.sin(e.currentAngle * e.deBroglieN) * (0.18 * (1.0 - alpha * 0.6));
        }
        e.eGroup.position.set(pt.x, ey, pt.z);

        // 3. Visual aura & energy surge feedback on the electron
        if (e.haloMesh && e.haloMesh.material) {
          // Controlled crisp luminous aura (scale 1.0 .. 1.25, NOT an inflating balloon)
          const auraScale = 1.0 + activeSurge * 0.25 + alpha * 0.15;
          e.haloMesh.scale.setScalar(auraScale);

          // Color: white-hot incandescent gold at impact, smoothly converting to 2p magenta/rose
          const hotImpactCol = new THREE.Color(0xffffff).lerp(new THREE.Color(0xfbbf24), 0.35);
          const excited2pCol = new THREE.Color(0xf43f5e);
          const targetCol = e.baseColor.clone().lerp(excited2pCol, alpha);
          e.haloMesh.material.color.lerpColors(targetCol, hotImpactCol, activeSurge);
        }

        // 4. Luminous track line glow during dipole transition
        if (e.trackLine && e.trackLine.material) {
          if (this.parameters.showTracks) {
            e.trackLine.visible = true;
            e.trackLine.material.opacity = THREE.MathUtils.lerp(0.28, 0.70, alpha);
            e.trackLine.material.color.lerpColors(e.baseColor, new THREE.Color(0xf43f5e), alpha);
          } else {
            e.trackLine.visible = false;
          }
        }
      } else {
        // Spectator electron: apply Slater orbital-relaxation core contraction driven by alpha.
        // As the active electron departs to an outer shell, screening drops and inner/co-shell
        // electrons feel a higher Z_eff, contracting their mean radius (relShift < 0).
        const shift = this.spectatorShiftMap[`${e.n}:${e.l}`] || 0;
        // Subtle collective polarization ripple synchronized with the transition
        const ripple = Math.abs(shift) > 1e-4
          ? 0.015 * Math.sin(time * 3.0 + e.currentAngle) * alpha
          : 0.0;
        const rDynamic = e.baseRadius * (1.0 + shift * alpha + ripple);
        e.radius = rDynamic;

        const ex = Math.cos(e.currentAngle) * rDynamic;
        const ez = Math.sin(e.currentAngle) * rDynamic;

        let ey = 0;
        if (showWaves) {
          ey = Math.sin(e.currentAngle * e.deBroglieN) * 0.18;
        }

        e.eGroup.position.set(ex, ey, ez);

        // Update guide ring radius to reflect the contraction
        if (Math.abs(shift) > 1e-4 && e.trackGeo && e.trackGeo.attributes.position) {
          const trackPos = e.trackGeo.attributes.position.array;
          const totalPts = 72;
          for (let p = 0; p <= totalPts; p++) {
            const a = (p / totalPts) * Math.PI * 2;
            trackPos[p * 3 + 0] = Math.cos(a) * rDynamic;
            trackPos[p * 3 + 1] = 0;
            trackPos[p * 3 + 2] = Math.sin(a) * rDynamic;
          }
          e.trackGeo.attributes.position.needsUpdate = true;
        }

        if (e.haloMesh && e.haloMesh.material) {
          // Contracting electrons warm up slightly (higher effective binding)
          if (shift < -1e-4) {
            const warmCol = e.baseColor.clone().lerp(new THREE.Color(0xfbbf24), Math.min(1, -shift * 6.0) * alpha);
            e.haloMesh.material.color.copy(warmCol);
          } else {
            e.haloMesh.material.color.copy(e.baseColor);
          }
          e.haloMesh.scale.setScalar(1.0 + Math.abs(shift) * alpha * 0.8);
        }
      }

      // Update world position for interaction with quantum cloud
      e.eGroup.getWorldPosition(e.worldPos);
      this.worldPositions[i].copy(e.worldPos);
    }
  }

  /**
   * Evaluates continuous 3D interpolation between 1s circle and 2p_z vertical dipole figure-8 loop.
   * @param {number} a - Orbital parameter [0 .. 2PI]
   * @param {number} alpha - Transition progress [0: 1s, 1: 2p_z]
   * @param {number} r1s - 1s radius
   * @param {number} r2p - 2p_z radius
   * @returns {{ x: number, y: number, z: number }}
   */
  /**
   * Parametric path point for an orbital of angular momentum l at radius r.
   * l=0: planar circle (s), l=1: vertical figure-8 dipole (p),
   * l=2: four-lobe clover (d), l>=3: six-lobe rosette (f).
   * @returns {{x:number,y:number,z:number}}
   */
  evaluateOrbitalPath(a, l, r) {
    if (l <= 0) {
      // s: planar circular orbit in the XZ plane
      return { x: r * Math.cos(a), y: 0.0, z: r * Math.sin(a) };
    }
    if (l === 1) {
      // p: vertical figure-8 dumbbell loop along Y
      return {
        x: r * 0.32 * Math.sin(2.0 * a),
        y: r * Math.cos(a),
        z: r * 0.32 * Math.sin(a)
      };
    }
    if (l === 2) {
      // d: four-lobe clover in the XZ plane
      const rad = r * Math.abs(Math.cos(2.0 * a));
      return {
        x: rad * Math.cos(a),
        y: r * 0.18 * Math.sin(3.0 * a),
        z: rad * Math.sin(a)
      };
    }
    // f and higher: six-lobe rosette
    const rad = r * Math.abs(Math.cos(3.0 * a));
    return {
      x: rad * Math.cos(a),
      y: r * 0.15 * Math.sin(4.0 * a),
      z: rad * Math.sin(a)
    };
  }

  /**
   * Continuous interpolation between a source orbital (l_from, r_from) and a target
   * orbital (l_to, r_to). Generalizes the original 1s -> 2p_z morph to arbitrary
   * s <-> p <-> d <-> f transitions.
   * @param {number} a - orbital parameter [0..2PI]
   * @param {number} alpha - transition progress [0..1]
   * @returns {{x:number,y:number,z:number}}
   */
  evaluateGeneralizedMorph(a, alpha, lFrom, lTo, rFrom, rTo) {
    const from = this.evaluateOrbitalPath(a, lFrom, rFrom);
    const to = this.evaluateOrbitalPath(a, lTo, rTo);
    return {
      x: (1.0 - alpha) * from.x + alpha * to.x,
      y: (1.0 - alpha) * from.y + alpha * to.y,
      z: (1.0 - alpha) * from.z + alpha * to.z
    };
  }

  evaluateDipoleMorph(a, alpha, r1s, r2p) {
    const rEff = THREE.MathUtils.lerp(r1s, r2p, alpha);

    // 1s planar circular orbit in XZ plane
    const cX = r1s * Math.cos(a);
    const cY = 0.0;
    const cZ = r1s * Math.sin(a);

    // 2p_z vertical 3D figure-8 dumbbell loop along Y
    // Upper lobe at +r2p, lower lobe at -r2p, crossing node at y=0
    const pY = r2p * Math.cos(a);
    const pX = r2p * 0.32 * Math.sin(2.0 * a);
    const pZ = r2p * 0.32 * Math.sin(a);

    return {
      x: (1.0 - alpha) * cX + alpha * pX,
      y: (1.0 - alpha) * cY + alpha * pY,
      z: (1.0 - alpha) * cZ + alpha * pZ
    };
  }

  /**
   * Returns current 3D world coordinates of all electrons.
   * @returns {Array<THREE.Vector3>}
   */
  getElectronPositions() {
    return this.worldPositions;
  }

  /**
   * Toggles visibility of the localized electron spherical meshes (core + halo + spin)
   * while preserving real-time coordinate calculation for external components (e.g. energy flow).
   * @param {boolean} visible
   */
  setShowElectrons(visible) {
    this.parameters.showElectrons = !!visible;
    this.electrons.forEach(e => {
      if (e.eGroup) e.eGroup.visible = !!visible;
    });
  }

  /**
   * Toggles visibility of orbital guide track lines.
   * @param {boolean} visible
   */
  setShowTracks(visible) {
    this.parameters.showTracks = !!visible;
    this.trackLines.forEach(l => {
      l.visible = !!visible;
      l.material.opacity = visible ? 0.28 : 0.0;
    });
  }

  onParametersChanged(params) {
    if (params.Z !== undefined || params.scale !== undefined || params.showSpins !== undefined) {
      this.rebuildElectrons();
    }
    if (params.showElectrons !== undefined) {
      this.setShowElectrons(params.showElectrons);
    }
    if (params.showTracks !== undefined) {
      this.setShowTracks(params.showTracks);
    }
  }

  dispose() {
    super.dispose();
    this.electrons = [];
    this.trackLines = [];
    this.worldPositions = [];
  }
}
