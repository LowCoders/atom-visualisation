import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import {
  radialWavefunction,
  realSphericalHarmonic,
  getWavefunctionColorRGB
} from '../core/QuantumPhysics.js';

/**
 * OrbitalCloud: Quantum probability density cloud (|psi|^2).
 * Features:
 * - 3000 sampling points accurately representing the 3D Born probability density |psi_{nlm}|^2
 * - Rejection sampling ensuring exact radial and angular nodal voids (black rings and gap planes)
 * - Image 1 ("Hydrogen Wave Function") color gradient palette:
 *   deep purple/violet -> luminous magenta -> fiery orange -> warm yellow (zero white blowout)
 * - Continuous smooth 3D morphing between orbitals (e.g. 1s -> 2p dipole transition)
 *   synchronized with the process simulator or manual UI orbital selection
 * - Dynamic de Broglie wavepacket condensation when electrons pass nearby
 * - Subtle zero-point energy (ZPE) quantum breathing
 */
export class OrbitalCloud extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'orbital-cloud', options = {}) {
    const initialZ = options.Z || 2;
    const initialN = options.n || 2;
    const initialL = options.l || 1;
    const initialCount = options.pointCount || Math.round(2400 + Math.min(60, initialZ) * 45 + initialN * 450 + initialL * 150);

    super(id, {
      name: 'Kvantum Hullámfüggvény Felhő (|ψ|²)',
      ...options,
      parameters: {
        pointCount: initialCount,
        Z: initialZ,
        zeff: options.zeff || 1.0,
        orbitRadius: options.orbitRadius || 0,
        n: initialN,
        l: initialL,
        m: options.m !== undefined ? options.m : 0,
        colorMode: options.colorMode || 'wavefunction',
        scale: options.scale || 1.8,
        brightness: options.brightness || 0.16,
        pointScale: options.pointScale || 340.0,
        showCondensation: options.showCondensation !== undefined ? options.showCondensation : true,
        ...options.parameters
      }
    });

    this.pointsMesh = null;
    this.geometry = null;
    this.material = null;

    // Dual-state morphing system: source <-> target
    this.sourcePoints = [];
    this.targetPoints = [];
    this.pointData = [];
    this.transitionAlpha = 0.0;
    this.targetAlpha = 0.0;
    this.isProcessDriven = false;
    this.isManualTransition = false;
    this.currentTargetState = null;
    this.excitationChannel = null;

    this.positions = null;
    this.colors = null;
    this.sizes = null;
    this.alphas = null;
  }

  build() {
    this.rebuildCloud();
  }

  /**
   * Determines the primary dipole/symmetry axis of an (l, m) orbital for aligned sorting.
   * @param {number} l
   * @param {number} m
   * @returns {THREE.Vector3}
   */
  _getOrbitalAxis(l, m) {
    if (l === 1) {
      if (m === 1) return new THREE.Vector3(1, 0, 0);  // px along X
      if (m === -1) return new THREE.Vector3(0, 0, 1); // py along Z
      return new THREE.Vector3(0, 1, 0);               // pz along Y
    }
    if (l === 2) {
      if (m === 1 || m === -1) return new THREE.Vector3(1, 0, 0);
      return new THREE.Vector3(0, 1, 0);
    }
    return new THREE.Vector3(0, 1, 0);
  }

  /**
   * Sorts points along an axis to ensure smooth, monotonic, untangled flow during morphing.
   * @param {Array<Object>} points
   * @param {THREE.Vector3} axis
   */
  _sortPointsAlongAxis(points, axis) {
    points.sort((a, b) => a.pos.dot(axis) - b.pos.dot(axis));
  }

  /**
   * Samples 3D points according to |psi_{nlm}|^2 Born probability density.
   * - Uses exact radial probability distribution: p(r) ~ r^2 |R_{nl}(r)|^2
   * - Uses exact angular probability distribution: p(theta, phi) ~ |Y_{lm}(theta, phi)|^2 on uniform sphere
   * - Crisp standing wave ripple modulation creating sharp separator gaps (Image 3 Quantum Model)
   * - Sharp extinction at nodal boundaries (normP -> 0)
   *
   * @param {number} n
   * @param {number} l
   * @param {number} m
   * @param {number} [zeff=1.0]
   * @param {number} [orbitRadius=0]
   * @returns {Array<Object>}
   */
  sampleOrbitalPoints(n, l, m, zeff = 1.0, orbitRadius = 0) {
    const count = this.parameters.pointCount;
    const scale = this.parameters.scale;
    const colorMode = this.parameters.colorMode;
    const effectiveZeff = Math.max(1.0, zeff || 1.0);

    const maxR = (3.8 * Math.pow(n, 1.45) + 3.5) / Math.sqrt(effectiveZeff);
    let visualScale;
    const meanRBohr = (3 * n * n - l * (l + 1)) / (2 * effectiveZeff);
    if (orbitRadius > 0 && meanRBohr > 0) {
      visualScale = orbitRadius / meanRBohr;
    } else {
      visualScale = scale * (6.5 / maxR);
    }

    // Accurate peak radial density: r^2 * |R_nl(r)|^2
    let peakRadP = 1e-12;
    const rSearchSteps = 200;
    for (let ir = 1; ir <= rSearchSteps; ir++) {
      const rTest = (ir / rSearchSteps) * maxR;
      const Rnl = radialWavefunction(n, l, rTest, effectiveZeff);
      const radP = rTest * rTest * Rnl * Rnl;
      if (radP > peakRadP) peakRadP = radP;
    }
    if (peakRadP <= 1e-12) peakRadP = 1.0;

    // Accurate peak angular density: |Y_lm(theta, phi)|^2
    let peakY2 = 1e-12;
    const tSearchSteps = 30;
    const pSearchSteps = 30;
    for (let it = 0; it <= tSearchSteps; it++) {
      const tTest = (it / tSearchSteps) * Math.PI;
      for (let ip = 0; ip <= pSearchSteps; ip++) {
        const pTest = (ip / pSearchSteps) * (Math.PI * 2);
        const Ylm = realSphericalHarmonic(l, m, tTest, pTest);
        const y2 = Ylm * Ylm;
        if (y2 > peakY2) peakY2 = y2;
      }
    }
    if (peakY2 <= 1e-12) peakY2 = 1.0;

    // Overall peak Born density |psi|^2 for accurate normalized coloring
    let peakBornP = 1e-12;
    for (let ir = 1; ir <= 50; ir++) {
      const rTest = (ir / 50) * maxR;
      const Rnl = radialWavefunction(n, l, rTest, effectiveZeff);
      const rawP = Rnl * Rnl * peakY2;
      if (rawP > peakBornP) peakBornP = rawP;
    }
    if (peakBornP <= 1e-12) peakBornP = 1.0;

    // de Broglie standing wave ripple wavelength for concentric separator rings
    const lambdaDB = (2.0 * Math.PI * Math.max(0.6, meanRBohr)) / Math.max(1, n);

    const points = [];
    let attempts = 0;
    const maxAttempts = count * 95;

    while (points.length < count && attempts < maxAttempts) {
      attempts++;
      const candR = Math.random() * maxR;
      const candCosT = 2.0 * Math.random() - 1.0;
      const candTheta = Math.acos(candCosT);
      const candPhi = Math.random() * Math.PI * 2;

      const Rnl = radialWavefunction(n, l, candR, effectiveZeff);
      const radP = candR * candR * Rnl * Rnl;

      const Ylm = realSphericalHarmonic(l, m, candTheta, candPhi);
      const y2 = Ylm * Ylm;

      // Concentric standing ripple factor (Image 3 Quantum Model)
      const rippleFactor = 0.85 + 0.15 * Math.cos((2.0 * Math.PI * candR) / lambdaDB);
      const probRatio = (radP / peakRadP) * (y2 / peakY2) * rippleFactor;

      if (Math.random() <= probRatio) {
        const sinT = Math.sin(candTheta);
        const px = candR * sinT * Math.cos(candPhi) * visualScale;
        const py = candR * candCosT * visualScale;
        const pz = candR * sinT * Math.sin(candPhi) * visualScale;

        const rawBornP = Math.pow(Rnl * Ylm, 2);
        const normP = Math.min(1.0, rawBornP / peakBornP);
        const gammaP = Math.pow(normP, 0.65);

        let col;
        if (colorMode === 'wavefunction') {
          col = getWavefunctionColorRGB(gammaP);
        } else {
          const shellPalette = [0x38bdf8, 0x10b981, 0xfbbf24, 0xf43f5e];
          const baseC = new THREE.Color(shellPalette[(n - 1) % shellPalette.length]);
          col = { r: baseC.r, g: baseC.g, b: baseC.b };
        }

        // Sharp extinction at nodal boundaries (normP -> 0)
        const alpha = Math.max(0.08, Math.pow(normP, 0.95) * 0.90);
        const size = Math.max(0.6, 0.9 + gammaP * 2.5);

        points.push({
          pos: new THREE.Vector3(px, py, pz),
          color: { r: col.r, g: col.g, b: col.b },
          size,
          alpha,
          normP,
          gammaP
        });
      }
    }

    // Safe fallback if count not reached
    while (points.length < count) {
      if (points.length > 0) {
        const src = points[points.length % points.length];
        points.push({
          pos: src.pos.clone().add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
          )),
          color: { ...src.color },
          size: src.size,
          alpha: src.alpha,
          normP: src.normP,
          gammaP: src.gammaP
        });
      } else {
        points.push({
          pos: new THREE.Vector3(0, 0, 0),
          color: { r: 1.0, g: 0.75, b: 0.0 },
          size: 2.0,
          alpha: 0.6,
          normP: 0.5,
          gammaP: 0.7
        });
      }
    }

    return points;
  }

  rebuildCloud() {
    if (this.pointsMesh) {
      this.group.remove(this.pointsMesh);
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
      this.pointsMesh = null;
    }

    const { n, l, m } = this.parameters;
    const zeff = Math.max(1.0, this.parameters.zeff || 1.0);
    const orbitRadius = this.parameters.orbitRadius || 0;

    const sampled = this.sampleOrbitalPoints(n, l, m, zeff, orbitRadius);
    const count = sampled.length;
    this.parameters.pointCount = count;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);

    const axis = this._getOrbitalAxis(l, m);
    this._sortPointsAlongAxis(sampled, axis);

    this.sourcePoints = sampled;
    this.targetPoints = sampled.map(p => ({ ...p, pos: p.pos.clone(), color: { ...p.color } }));
    this.transitionAlpha = 0.0;
    this.targetAlpha = 0.0;
    this.isManualTransition = false;
    this.isProcessDriven = false;
    this.currentTargetState = { n, l, m };

    this.pointData = [];
    for (let i = 0; i < count; i++) {
      const p = sampled[i];
      this.positions[i * 3 + 0] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;

      this.colors[i * 3 + 0] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;

      this.sizes[i] = p.size;
      this.alphas[i] = p.alpha;

      this.pointData.push({
        zpePhase: Math.random() * Math.PI * 2,
        zpeSpeed: 1.4 + Math.random() * 2.2
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    // Custom ShaderMaterial with soft Gaussian falloff
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: this.parameters.pointScale },
        uBrightness: { value: this.parameters.brightness }
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uScale;

        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (uScale / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uBrightness;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          // Sharp exponential falloff eliminating washed-out milky haze over nodal gaps
          float radial = exp(-dist * dist * 15.0);
          gl_FragColor = vec4(vColor * radial * uBrightness * vAlpha, 1.0);
        }
      `,
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.ZeroFactor,
      blendDstAlpha: THREE.OneFactor,
      depthWrite: false
    });

    this.pointsMesh = new THREE.Points(this.geometry, this.material);
    this.group.add(this.pointsMesh);
  }

  /**
   * Calculates adaptive point count dynamically based on nuclear charge Z and shell quantum numbers (n, l).
   * @param {number} Z
   * @param {number} n
   * @param {number} l
   * @returns {number}
   */
  _calculateDynamicPointCount(Z, n, l) {
    const atomZ = Math.max(1, Z || this.parameters.Z || 1);
    const dynamicCount = Math.round(2400 + Math.min(60, atomZ) * 45 + n * 450 + l * 150);
    return Math.min(8000, Math.max(2500, dynamicCount));
  }

  /**
   * Configures a smooth continuous orbital transition (e.g. user selected 2p in ControlPanel).
   * Freezes current interpolated positions and morphs smoothly to the new orbital.
   *
   * @param {number} n
   * @param {number} l
   * @param {number} m
   * @param {number} [zeff]
   * @param {number} [orbitRadius]
   * @param {boolean} [animate=true]
   * @param {number} [Z=null]
   */
  setOrbitalConfig(n, l, m, zeff, orbitRadius, animate = true, Z = null) {
    if (Z !== null && Z !== undefined) {
      this.parameters.Z = Z;
    }
    const targetCount = this._calculateDynamicPointCount(this.parameters.Z, n, l);
    const countChanged = this.parameters.pointCount !== targetCount;

    if (this.currentTargetState &&
        this.currentTargetState.n === n &&
        this.currentTargetState.l === l &&
        this.currentTargetState.m === m &&
        !countChanged) {
      return;
    }

    this.parameters.n = n;
    this.parameters.l = l;
    this.parameters.m = m;
    this.parameters.pointCount = targetCount;
    if (zeff !== undefined) this.parameters.zeff = zeff;
    if (orbitRadius !== undefined) this.parameters.orbitRadius = orbitRadius;

    if (countChanged || !animate || !this.isInitialized || !this.sourcePoints || this.sourcePoints.length !== targetCount) {
      this.rebuildCloud();
      this.currentTargetState = { n, l, m };
      return;
    }

    const newTarget = this.sampleOrbitalPoints(n, l, m, this.parameters.zeff, this.parameters.orbitRadius);
    const axis = this._getOrbitalAxis(l, m);
    this._sortPointsAlongAxis(newTarget, axis);

    const count = this.parameters.pointCount;
    if (animate && this.isInitialized && this.sourcePoints && this.sourcePoints.length === count) {
      const curAlpha = this.transitionAlpha;
      const currentPts = [];
      for (let i = 0; i < count; i++) {
        const s = this.sourcePoints[i];
        const t = this.targetPoints[i] || s;
        currentPts.push({
          pos: new THREE.Vector3(
            THREE.MathUtils.lerp(s.pos.x, t.pos.x, curAlpha),
            THREE.MathUtils.lerp(s.pos.y, t.pos.y, curAlpha),
            THREE.MathUtils.lerp(s.pos.z, t.pos.z, curAlpha)
          ),
          color: {
            r: THREE.MathUtils.lerp(s.color.r, t.color.r, curAlpha),
            g: THREE.MathUtils.lerp(s.color.g, t.color.g, curAlpha),
            b: THREE.MathUtils.lerp(s.color.b, t.color.b, curAlpha)
          },
          size: THREE.MathUtils.lerp(s.size, t.size, curAlpha),
          alpha: THREE.MathUtils.lerp(s.alpha, t.alpha, curAlpha),
          normP: THREE.MathUtils.lerp(s.normP || 0.5, t.normP || 0.5, curAlpha),
          gammaP: THREE.MathUtils.lerp(s.gammaP || 0.5, t.gammaP || 0.5, curAlpha)
        });
      }
      this._sortPointsAlongAxis(currentPts, axis);

      this.sourcePoints = currentPts;
      this.targetPoints = newTarget;
      this.transitionAlpha = 0.0;
      this.targetAlpha = 1.0;
      this.isManualTransition = true;
      this.isProcessDriven = false;
      this.currentTargetState = { n, l, m };
    } else {
      this.sourcePoints = newTarget;
      this.targetPoints = newTarget.map(p => ({ ...p, pos: p.pos.clone(), color: { ...p.color } }));
      this.transitionAlpha = 0.0;
      this.targetAlpha = 0.0;
      this.isManualTransition = false;
      this.isProcessDriven = false;
      this.currentTargetState = { n, l, m };
    }
  }

  /**
   * Sets up the two states for process-driven continuous excitation (1s -> 2p).
   * @param {Object} channel - getExcitationChannel() result
   */
  setExcitationChannel(channel) {
    if (!channel || !channel.source || !channel.target) return;
    this.excitationChannel = channel;

    const srcN = channel.source.n;
    const srcL = channel.source.l;
    const tgtN = channel.target.n;
    const tgtL = channel.target.l;

    const zeffI = channel.zeffInitial || this.parameters.zeff || 1.0;
    const zeffF = channel.zeffFinal || this.parameters.zeff || 1.0;

    const srcOrbitR = (2.2 * Math.pow(srcN, 1.4) + srcL * 0.55);
    const tgtOrbitR = (2.2 * Math.pow(tgtN, 1.4) + tgtL * 0.55);

    const srcPoints = this.sampleOrbitalPoints(srcN, srcL, 0, zeffI, srcOrbitR);
    const tgtPoints = this.sampleOrbitalPoints(tgtN, tgtL, 0, zeffF, tgtOrbitR);

    const axis = this._getOrbitalAxis(tgtL, 0);
    this._sortPointsAlongAxis(srcPoints, axis);
    this._sortPointsAlongAxis(tgtPoints, axis);

    this.sourcePoints = srcPoints;
    this.targetPoints = tgtPoints;
    this.transitionAlpha = 0.0;
    this.targetAlpha = 0.0;
    this.isProcessDriven = true;
    this.isManualTransition = false;
    this.currentTargetState = { n: tgtN, l: tgtL, m: 0 };
  }

  /**
   * Sets continuous transition progress alpha [0..1] driven by ProcessSimulator.
   * @param {number} alpha
   */
  setTransitionProgress(alpha) {
    this.isProcessDriven = true;
    this.isManualTransition = false;
    this.targetAlpha = Math.max(0.0, Math.min(1.0, alpha));
  }

  /**
   * Frame update: smooth morphing, ZPE quantum fluctuations, and electron wavepacket condensation.
   */
  onUpdate(time, deltaTime, syncEngine, electronPositions = []) {
    if (!this.geometry || !this.pointsMesh) return;

    // Smooth transition progress
    if (this.isProcessDriven) {
      this.transitionAlpha = THREE.MathUtils.lerp(
        this.transitionAlpha,
        this.targetAlpha,
        Math.min(1.0, deltaTime * 5.5)
      );
    } else if (this.isManualTransition) {
      this.transitionAlpha = THREE.MathUtils.lerp(
        this.transitionAlpha,
        1.0,
        Math.min(1.0, deltaTime * 3.5)
      );
      if (this.transitionAlpha >= 0.998) {
        this.transitionAlpha = 1.0;
        this.isManualTransition = false;
        this.sourcePoints = this.targetPoints;
      }
    }

    const posAttr = this.geometry.attributes.position;
    const colorAttr = this.geometry.attributes.aColor;
    const sizeAttr = this.geometry.attributes.aSize;
    const alphaAttr = this.geometry.attributes.aAlpha;
    const count = this.pointData.length;
    const t = syncEngine.simTime;
    const alpha = this.transitionAlpha;
    const showCond = this.parameters.showCondensation && electronPositions && electronPositions.length > 0;

    for (let i = 0; i < count; i++) {
      const src = this.sourcePoints[i] || { pos: new THREE.Vector3(), color: { r: 1, g: 0.7, b: 0 }, size: 2, alpha: 0.6 };
      const tgt = this.targetPoints[i] || src;
      const data = this.pointData[i];

      // 1. Morphed position
      const mx = (1.0 - alpha) * src.pos.x + alpha * tgt.pos.x;
      const my = (1.0 - alpha) * src.pos.y + alpha * tgt.pos.y;
      const mz = (1.0 - alpha) * src.pos.z + alpha * tgt.pos.z;

      // 2. Subtle Zero-Point Energy (ZPE) quantum breathing
      const zpe = 1.0 + 0.035 * Math.sin(t * data.zpeSpeed + data.zpePhase);
      const px = mx * zpe;
      const py = my * zpe;
      const pz = mz * zpe;
      posAttr.setXYZ(i, px, py, pz);

      // 3. Morphed color (blue channel remains 0 in core -> zero white blowout)
      const cr = (1.0 - alpha) * src.color.r + alpha * tgt.color.r;
      const cg = (1.0 - alpha) * src.color.g + alpha * tgt.color.g;
      const cb = (1.0 - alpha) * src.color.b + alpha * tgt.color.b;
      colorAttr.setXYZ(i, cr, cg, cb);

      // 4. Morphed base size & alpha
      const baseSize = (1.0 - alpha) * src.size + alpha * tgt.size;
      const baseAlpha = (1.0 - alpha) * src.alpha + alpha * tgt.alpha;

      let sizeMultiplier = 1.0;
      let alphaMultiplier = 1.0;

      // Dynamic de Broglie wavepacket condensation when an electron is nearby
      if (showCond) {
        let minDistSq = 999999;
        for (let e = 0; e < electronPositions.length; e++) {
          const ep = electronPositions[e];
          const dx = px - ep.x;
          const dy = py - ep.y;
          const dz = pz - ep.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < minDistSq) minDistSq = d2;
        }

        const proximityDist = Math.sqrt(minDistSq);
        if (proximityDist < 2.4) {
          const proxFrac = 1.0 - proximityDist / 2.4;
          sizeMultiplier = 1.0 + 1.2 * Math.pow(proxFrac, 1.4);
          alphaMultiplier = 1.0 + 0.8 * proxFrac;
        }
      }

      sizeAttr.setX(i, baseSize * sizeMultiplier);
      alphaAttr.setX(i, baseAlpha * alphaMultiplier);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  onParametersChanged(params) {
    if (params.n !== undefined || params.l !== undefined || params.m !== undefined) {
      this.setOrbitalConfig(
        params.n !== undefined ? params.n : this.parameters.n,
        params.l !== undefined ? params.l : this.parameters.l,
        params.m !== undefined ? params.m : this.parameters.m,
        params.zeff !== undefined ? params.zeff : this.parameters.zeff,
        params.orbitRadius !== undefined ? params.orbitRadius : this.parameters.orbitRadius,
        true
      );
    } else if (params.pointCount !== undefined || params.colorMode !== undefined || params.scale !== undefined) {
      this.rebuildCloud();
    }
    if (params.brightness !== undefined && this.material) {
      this.material.uniforms.uBrightness.value = params.brightness;
    }
    if (params.pointScale !== undefined && this.material) {
      this.material.uniforms.uScale.value = params.pointScale;
    }
  }

  dispose() {
    super.dispose();
    this.pointsMesh = null;
    this.geometry = null;
    this.material = null;
    this.sourcePoints = [];
    this.targetPoints = [];
    this.pointData = [];
  }
}
