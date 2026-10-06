import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * VacuumSheet: Deformable polar spacetime vacuum fabric (delta g_00).
 * Features:
 * - Concentric geodesic polar ring-mesh (avoids Cartesian square grid bias)
 * - Lorentzian gravitational curvature well(s) centered under one or more atoms
 * - Dynamic Quantum Zero-Point Vacuum Fluctuations (ZPE wave ripple interference)
 * - Depth-mapped vertex color gradients (deep blue -> electric cyan -> amber/gold -> magenta core)
 * - Soft radial fade towards edge to eliminate hard circular cut-offs
 * - Glowing depth contour ring tracking deepest sag
 */
export class VacuumSheet extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   * @param {number} [options.innerRadius=0.2]
   * @param {number} [options.outerRadius=32.0]
   * @param {number} [options.thetaSegments=64]
   * @param {number} [options.phiSegments=42]
   * @param {number} [options.yOffset=-5.5]
   */
  constructor(id = 'vacuum-sheet', options = {}) {
    super(id, {
      name: 'Megereszkedő Vákuumszőnyeg (δg₀₀)',
      ...options,
      parameters: {
        innerRadius: options.innerRadius || 0.2,
        outerRadius: options.outerRadius || 32.0,
        thetaSegments: options.thetaSegments || 64,
        phiSegments: options.phiSegments || 42,
        yOffset: options.yOffset !== undefined ? options.yOffset : -5.5,
        baseSagDepth: options.baseSagDepth || 2.4,
        zpeIntensity: options.zpeIntensity !== undefined ? options.zpeIntensity : 1.0,
        showSurface: options.showSurface !== undefined ? options.showSurface : true,
        showWireframe: options.showWireframe !== undefined ? options.showWireframe : (options.wireframe !== undefined ? options.wireframe : true),
        colorMode: options.colorMode || 'depth', // 'depth' | 'curvature' | 'entropy'
        // List of source gravity masses [{ x, z, mass, sagDepth }]
        sources: options.sources || [{ x: 0, z: 0, mass: 1.0, sagDepth: 2.8 }],
        ...options.parameters
      }
    });

    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.glowRingMesh = null;
    this.glowRingMat = null;
    this.glowRingGeo = null;
    this.projGlowRingMesh = null;
    this.projGlowRingMat = null;
    this.projGlowRingGeo = null;
    this.splitGlowRingMesh = null;
    this.splitGlowRingMat = null;
    this.splitGlowRingGeo = null;

    // Dynamic excitation and gravitational wave tracking
    this.excitationSagDelta = 0.0;
    this.targetSagDelta = 0.0;
    this.gravWaves = [];

    // Entropic time waves and Riemannian curvature mapping
    this.entropicRipples = [];
    this.vTau = 1.0;
    this.accumulatedTau = 0.0;
    this.lastEntropicWaveTime = 0.0;
    this._lastRecoilShock = 0;

    // Projectile dynamic gravity source (incoming / scattered test particle)
    this.projectileSource = {
      active: false,
      x: 0,
      z: 0,
      sagDepth: 1.6
    };

    // Ring split dynamics during collision & absorption
    this.splitProgress = 0.0;
    this.splitVertexPos = new THREE.Vector3(1.6, 0.8, 1.4);
  }

  build() {
    const { innerRadius, outerRadius, thetaSegments, phiSegments, yOffset } = this.parameters;

    // 1. Polar Ring Geometry
    this.geometry = new THREE.RingGeometry(innerRadius, outerRadius, thetaSegments, phiSegments);
    this.geometry.rotateX(-Math.PI / 2);

    const vertexCount = this.geometry.attributes.position.count;
    const vertexColors = new Float32Array(vertexCount * 3);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    // 2. Separate Surface and Wireframe Meshes
    this.surfaceMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      wireframe: false,
      transparent: true,
      opacity: 0.55,
      roughness: 0.35,
      metalness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.surfaceMesh = new THREE.Mesh(this.geometry, this.surfaceMat);
    this.surfaceMesh.position.y = yOffset;
    this.surfaceMesh.renderOrder = -10;
    this.surfaceMesh.visible = !!this.parameters.showSurface;
    this.group.add(this.surfaceMesh);

    this.wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      wireframe: true,
      transparent: true,
      opacity: 0.50,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.wireMesh = new THREE.Mesh(this.geometry, this.wireMat);
    this.wireMesh.position.y = yOffset;
    this.wireMesh.renderOrder = -9;
    this.wireMesh.visible = !!this.parameters.showWireframe;
    this.group.add(this.wireMesh);

    this.group.renderOrder = -10;

    // Backward compatibility aliases
    this.mesh = this.surfaceMesh;
    this.material = this.surfaceMat;

    this.updateGroupVisibility();

    // 3. Glowing depth contour ring under primary well (48 segments, 1 phi segment for dynamic thickness)
    this.glowRingGeo = new THREE.RingGeometry(1.95, 2.05, 48, 1);
    this.glowRingGeo.rotateX(-Math.PI / 2);
    this.glowRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.glowRingMesh = new THREE.Mesh(this.glowRingGeo, this.glowRingMat);
    this.glowRingMesh.position.y = yOffset - 0.5;
    this.group.add(this.glowRingMesh);

    // 4. Glowing depth contour ring under projectile well (when active)
    this.projGlowRingGeo = new THREE.RingGeometry(0.7, 1.2, 32, 1);
    this.projGlowRingGeo.rotateX(-Math.PI / 2);
    this.projGlowRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.projGlowRingMesh = new THREE.Mesh(this.projGlowRingGeo, this.projGlowRingMat);
    this.projGlowRingMesh.visible = false;
    this.group.add(this.projGlowRingMesh);

    // 5. Absorbed energy split ring that branches off and merges into central atom (10.2 eV portion)
    this.splitGlowRingGeo = new THREE.RingGeometry(0.7, 1.2, 32, 1);
    this.splitGlowRingGeo.rotateX(-Math.PI / 2);
    this.splitGlowRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.splitGlowRingMesh = new THREE.Mesh(this.splitGlowRingGeo, this.splitGlowRingMat);
    this.splitGlowRingMesh.visible = false;
    this.group.add(this.splitGlowRingMesh);
  }

  /**
   * Set dynamic excitation level (0.0: ground 1s, 1.0: excited 2p M*).
   * @param {number} level - Excitation amount
   * @param {boolean} [smooth=true] - Whether to smoothly interpolate
   */
  setExcitationLevel(level, smooth = true) {
    this.targetSagDelta = Math.max(0.0, Math.min(1.5, level)) * 1.2;
    if (!smooth) {
      this.excitationSagDelta = this.targetSagDelta;
    }
  }

  /**
   * Set dynamic split progress during Phase 2 collision (10.2 eV branching off to central well).
   * @param {number} progress - 0.0 to 1.0
   * @param {THREE.Vector3} [vertexPos]
   */
  setSplitProgress(progress, vertexPos = null) {
    this.splitProgress = Math.max(0.0, Math.min(1.0, progress));
    if (vertexPos) {
      this.splitVertexPos.copy(vertexPos);
    }
  }

  /**
   * Set dynamic projectile gravity source (incoming or scattered test particle).
   * @param {number} x
   * @param {number} z
   * @param {boolean} active
   * @param {number} [sagDepth=1.6]
   */
  setProjectileSource(x, z, active, sagDepth = 1.6) {
    this.projectileSource.x = x;
    this.projectileSource.z = z;
    this.projectileSource.active = !!active;
    this.projectileSource.sagDepth = sagDepth;
  }

  /**
   * Triggers an expanding gravitational metric wave (Lyman-alpha photon departure).
   * @param {number} [amplitude=0.85]
   */
  triggerGravitationalWave(amplitude = 0.85) {
    this.gravWaves.push({
      radius: 0.2,
      speed: 14.0,
      amplitude,
      decay: 0.16
    });
  }

  /**
   * Sets color display mode: 'depth' | 'curvature' | 'entropy'
   * @param {'depth'|'curvature'|'entropy'} mode
   */
  setColorMode(mode) {
    if (['depth', 'curvature', 'entropy'].includes(mode)) {
      this.parameters.colorMode = mode;
    }
  }

  /**
   * Synchronizes entropic time flow rate and accumulated time with the vacuum sheet.
   * Emits entropic ripples into the polar spacetime fabric.
   * @param {number} vTau - Rate of entropic time flow dtau/dt
   * @param {number} accumulatedTau - Total accumulated entropic time tau
   * @param {string} [phaseKey] - Active process phase
   */
  setEntropicState(vTau, accumulatedTau, phaseKey) {
    this.vTau = vTau !== undefined ? vTau : 1.0;
    this.accumulatedTau = accumulatedTau !== undefined ? accumulatedTau : 0.0;

    // Phase 4 Nuclear Recoil: trigger intense entropic shockwave
    if (phaseKey === 'nuclear_recoil') {
      const now = Date.now();
      if (!this._lastRecoilShock || now - this._lastRecoilShock > 2200) {
        this._lastRecoilShock = now;
        this.triggerEntropicShockwave(2.2);
      }
    }
  }

  /**
   * Triggers an expanding entropic time shockwave ripple in the spacetime fabric.
   * @param {number} [amplitude=1.8]
   */
  triggerEntropicShockwave(amplitude = 1.8) {
    this.entropicRipples.push({
      radius: 0.3,
      speed: 11.0 + Math.min(6.0, this.vTau * 1.5),
      amplitude,
      decay: 0.14,
      frequency: 2.8
    });
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (!this.geometry || !this.surfaceMesh) return;
    if (!this.parameters.showSurface && !this.parameters.showWireframe) return;

    // Smoothly interpolate excitation sag delta
    this.excitationSagDelta = THREE.MathUtils.lerp(
      this.excitationSagDelta,
      this.targetSagDelta,
      Math.min(1.0, deltaTime * 3.5)
    );

    const outerR = this.parameters.outerRadius;

    // Step expanding gravitational waves
    for (let w = this.gravWaves.length - 1; w >= 0; w--) {
      const wave = this.gravWaves[w];
      wave.radius += deltaTime * wave.speed;
      wave.amplitude *= Math.exp(-wave.decay * deltaTime * 10.0);
      if (wave.amplitude < 0.01 || wave.radius > outerR) {
        this.gravWaves.splice(w, 1);
      }
    }

    // Step expanding entropic ripples
    for (let e = this.entropicRipples.length - 1; e >= 0; e--) {
      const eWave = this.entropicRipples[e];
      eWave.radius += deltaTime * eWave.speed;
      eWave.amplitude *= Math.exp(-eWave.decay * deltaTime * 8.0);
      if (eWave.amplitude < 0.01 || eWave.radius > outerR) {
        this.entropicRipples.splice(e, 1);
      }
    }

    // High entropy flow (e.g. recoil or QED exchange): periodically spawn subtle entropic ripples
    if (this.vTau > 2.4 && (time - this.lastEntropicWaveTime > 0.45)) {
      this.lastEntropicWaveTime = time;
      this.entropicRipples.push({
        radius: 0.3,
        speed: 7.5 + this.vTau * 1.4,
        amplitude: 0.45 * Math.min(1.8, this.vTau / 3.0),
        decay: 0.18,
        frequency: 3.4
      });
    }

    const posAttr = this.geometry.attributes.position;
    const colorAttr = this.geometry.attributes.color;
    const sources = this.parameters.sources || [{ x: 0, z: 0, mass: 1.0, sagDepth: this.parameters.baseSagDepth }];
    const zpeInt = this.parameters.zpeIntensity;
    const t = syncEngine.simTime;
    const colorMode = this.parameters.colorMode || 'depth';

    let primarySag = 0;
    let primaryX = 0;
    let primaryZ = 0;

    const proj = this.projectileSource;
    const hasProj = proj && proj.active;
    const projX = hasProj ? proj.x : 0;
    const projZ = hasProj ? proj.z : 0;
    const projSag = hasProj ? proj.sagDepth : 0;

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);

      let totalSag = 0;

      // Superposition of gravitational Lorentzian wells from all source atoms
      for (const src of sources) {
        const dx = vx - src.x;
        const dz = vz - src.z;
        const d2 = dx * dx + dz * dz;
        const baseSag = src.sagDepth || this.parameters.baseSagDepth;
        const sagDepth = baseSag + this.excitationSagDelta;
        // Lorentzian curve: Delta g_00 = -depth / (1 + r^2 * curvature)
        const well = -sagDepth / (1.0 + d2 * 0.08);
        totalSag += well;

        if (i === 0) {
          primarySag = sagDepth;
          primaryX = src.x;
          primaryZ = src.z;
        }
      }

      // Secondary dynamic gravitational well from projectile (incoming test particle)
      if (hasProj) {
        const dpx = vx - projX;
        const dpz = vz - projZ;
        const dp2 = dpx * dpx + dpz * dpz;
        const pWell = -projSag / (1.0 + dp2 * 0.12);
        totalSag += pWell;
      }

      // Dynamic Quantum Zero-Point Vacuum Fluctuation (ZPE wave interference)
      const distFromCenter = Math.sqrt(vx * vx + vz * vz);
      const zpeWave = zpeInt * (
        0.15 * Math.sin(distFromCenter * 0.72 - t * 2.5) * Math.exp(-distFromCenter * 0.06) +
        0.06 * Math.sin(vx * 0.35 + t * 1.4) * Math.cos(vz * 0.35 + t * 1.2)
      );

      // Gravitational metric waves modulation (Lyman-alpha photon emission ripple)
      let waveMod = 0.0;
      for (let w = 0; w < this.gravWaves.length; w++) {
        const wave = this.gravWaves[w];
        const dr = distFromCenter - wave.radius;
        waveMod += wave.amplitude * Math.exp(-dr * dr * 0.75) * Math.sin(dr * 3.0);
      }

      // Entropic time ripple waves modulation
      let entropicMod = 0.0;
      for (let e = 0; e < this.entropicRipples.length; e++) {
        const eWave = this.entropicRipples[e];
        const dr = distFromCenter - eWave.radius;
        entropicMod += eWave.amplitude * Math.exp(-dr * dr * 1.1) * Math.sin(dr * (eWave.frequency || 3.0) - this.accumulatedTau * 3.0);
      }
      const entropicPhase = 0.05 * (this.vTau / 2.0) * Math.sin(distFromCenter * 0.9 - this.accumulatedTau * 2.2) * Math.exp(-distFromCenter * 0.04);

      posAttr.setY(i, totalSag + zpeWave + waveMod + entropicMod + entropicPhase);

      // Radial soft boundary fade at outer boundary to prevent harsh clipping
      const fadeStart = outerR * 0.65;
      const edgeFade = distFromCenter > fadeStart
        ? Math.max(0.0, 1.0 - (distFromCenter - fadeStart) / (outerR - fadeStart))
        : 1.0;

      // Color mapping according to selected colorMode
      let r, g, b;

      if (colorMode === 'curvature') {
        // Gaussian curvature / Riemann deformation visualization
        const curveIntensity = Math.min(1.0, Math.max(0.0, -totalSag / 5.5));
        if (curveIntensity < 0.3) {
          const f = curveIntensity / 0.3;
          r = THREE.MathUtils.lerp(0.05, 0.35, f);
          g = THREE.MathUtils.lerp(0.65, 0.20, f);
          b = THREE.MathUtils.lerp(0.85, 0.90, f);
        } else if (curveIntensity < 0.7) {
          const f = (curveIntensity - 0.3) / 0.4;
          r = THREE.MathUtils.lerp(0.35, 0.85, f);
          g = THREE.MathUtils.lerp(0.20, 0.15, f);
          b = THREE.MathUtils.lerp(0.90, 0.50, f);
        } else {
          const f = (curveIntensity - 0.7) / 0.3;
          r = THREE.MathUtils.lerp(0.85, 1.00, f);
          g = THREE.MathUtils.lerp(0.15, 0.85, f);
          b = THREE.MathUtils.lerp(0.50, 0.10, f);
        }
      } else if (colorMode === 'entropy') {
        // Entropic flow visualization: radiant purple/magenta waves expanding in sync with dtau/dt
        const wavePhase = Math.sin(distFromCenter * 1.2 - this.accumulatedTau * 2.8);
        const normEntropy = Math.min(1.0, Math.max(0.0, (this.vTau - 1.0) / 4.0));
        const waveBrightness = 0.5 + 0.5 * wavePhase;

        r = THREE.MathUtils.lerp(0.15, 0.95, waveBrightness) * (0.6 + 0.4 * normEntropy);
        g = THREE.MathUtils.lerp(0.05, 0.25, waveBrightness);
        b = THREE.MathUtils.lerp(0.40, 0.85, waveBrightness);
      } else {
        // Standard Depth Mode (Image 1 gradient: deep blue -> electric cyan -> amber/gold)
        const normDepth = Math.min(1.0, Math.max(0.0, -totalSag / 6.5));
        if (normDepth < 0.22) {
          const f = normDepth / 0.22;
          r = THREE.MathUtils.lerp(0.04, 0.10, f);
          g = THREE.MathUtils.lerp(0.14, 0.36, f);
          b = THREE.MathUtils.lerp(0.35, 0.70, f);
        } else if (normDepth < 0.62) {
          const f = (normDepth - 0.22) / 0.40;
          r = THREE.MathUtils.lerp(0.10, 0.28, f);
          g = THREE.MathUtils.lerp(0.36, 0.82, f);
          b = THREE.MathUtils.lerp(0.70, 0.98, f);
        } else {
          const f = (normDepth - 0.62) / 0.38;
          r = THREE.MathUtils.lerp(0.28, 0.96, f);
          g = THREE.MathUtils.lerp(0.82, 0.68, f);
          b = THREE.MathUtils.lerp(0.98, 0.20, f);
        }
      }

      colorAttr.setXYZ(i, r * edgeFade, g * edgeFade, b * edgeFade);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    // CPU optimization: recompute vertex normals only every 3rd frame (lighting change is imperceptible,
    // but this saves a costly full-mesh normal recomputation on the 2688-vertex sheet each frame)
    this._normalFrame = (this._normalFrame || 0) + 1;
    if (this._normalFrame % 3 === 0) {
      this.geometry.computeVertexNormals();
    }

    // Update glowing contour ring under primary source with dynamic thickness and color
    if (this.glowRingMesh && this.glowRingGeo) {
      this.glowRingMesh.visible = !!this.parameters.showSurface || !!this.parameters.showWireframe;
      this.glowRingMesh.position.x = primaryX;
      this.glowRingMesh.position.z = primaryZ;
      this.glowRingMesh.position.y = this.parameters.yOffset - primarySag * 0.6;

      const excFactor = Math.min(1.0, Math.max(0.0, this.excitationSagDelta / 1.15));

      // Dynamic thickness: 0 state is a thin razor line (width ~ 0.10); excited 3 state is a thick energetic band (width ~ 1.50)
      const curInnerR = THREE.MathUtils.lerp(1.95, 1.35, excFactor);
      const curOuterR = THREE.MathUtils.lerp(2.05, 2.85, excFactor);

      const rPos = this.glowRingGeo.attributes.position;
      const countPerRing = 48 + 1; // thetaSegments + 1
      for (let j = 0; j <= 48; j++) {
        const a = (j / 48) * Math.PI * 2;
        const cosA = Math.cos(a);
        const sinA = Math.sin(a);
        // inner ring
        rPos.setXYZ(j, cosA * curInnerR, 0, sinA * curInnerR);
        // outer ring
        rPos.setXYZ(countPerRing + j, cosA * curOuterR, 0, sinA * curOuterR);
      }
      rPos.needsUpdate = true;

      // Color shifts from calm cyan (ground state) to blazing amber-gold (excited 2p)
      const colGround = new THREE.Color(0x38bdf8);
      const colExcited = new THREE.Color(0xf59e0b);
      this.glowRingMat.color.lerpColors(colGround, colExcited, excFactor);
      this.glowRingMat.opacity = THREE.MathUtils.lerp(0.40, 0.85, excFactor) + 0.12 * Math.sin(t * 3.5);
    }

    // Update glowing contour ring under projectile well
    if (this.projGlowRingMesh) {
      if (hasProj) {
        this.projGlowRingMesh.visible = true;
        this.projGlowRingMesh.position.set(
          projX,
          this.parameters.yOffset - projSag * 0.55,
          projZ
        );

        // When splitting in Phase 2, scale shrinks from 1.2 (15 eV) to 0.65 (4.8 eV)
        const scaleVal = this.splitProgress > 0 ? THREE.MathUtils.lerp(1.2, 0.65, this.splitProgress) : 1.2;
        this.projGlowRingMesh.scale.set(scaleVal, 1, scaleVal);
        this.projGlowRingMat.opacity = 0.45 + 0.25 * Math.sin(t * 6.0);
      } else {
        this.projGlowRingMesh.visible = false;
      }
    }

    // Update split ring (10.2 eV branching off towards nucleus)
    if (this.splitGlowRingMesh) {
      if (this.splitProgress > 0.01 && this.splitProgress < 0.99) {
        this.splitGlowRingMesh.visible = true;
        const sX = THREE.MathUtils.lerp(this.splitVertexPos.x, primaryX, this.splitProgress);
        const sZ = THREE.MathUtils.lerp(this.splitVertexPos.z, primaryZ, this.splitProgress);
        const sY = this.parameters.yOffset - primarySag * 0.55;
        this.splitGlowRingMesh.position.set(sX, sY, sZ);

        // Expands as it merges into the primary atom's contour ring
        const sScale = THREE.MathUtils.lerp(0.9, 1.8, this.splitProgress);
        this.splitGlowRingMesh.scale.set(sScale, 1, sScale);
        this.splitGlowRingMat.opacity = Math.sin(this.splitProgress * Math.PI) * 0.85;
      } else {
        this.splitGlowRingMesh.visible = false;
      }
    }
  }

  /**
   * Set dynamic gravity sources (for single or multi-atom simulation)
   * @param {Array<{ x: number, z: number, mass: number, sagDepth: number }>} sources
   */
  setSources(sources) {
    this.parameters.sources = sources;
  }

  setSurfaceVisible(visible) {
    this.parameters.showSurface = !!visible;
    if (this.surfaceMesh) this.surfaceMesh.visible = !!visible;
    this.updateGroupVisibility();
  }

  setWireframeVisible(visible) {
    this.parameters.showWireframe = !!visible;
    if (this.wireMesh) this.wireMesh.visible = !!visible;
    this.updateGroupVisibility();
  }

  updateGroupVisibility() {
    const isVisible = !!(this.parameters.showSurface || this.parameters.showWireframe);
    this.group.visible = isVisible;
    if (this.glowRingMesh) {
      this.glowRingMesh.visible = isVisible;
    }
  }

  onParametersChanged(params) {
    if (params.yOffset !== undefined) {
      if (this.surfaceMesh) this.surfaceMesh.position.y = params.yOffset;
      if (this.wireMesh) this.wireMesh.position.y = params.yOffset;
    }
    if (params.showSurface !== undefined) {
      this.setSurfaceVisible(params.showSurface);
    }
    if (params.showWireframe !== undefined) {
      this.setWireframeVisible(params.showWireframe);
    }
    if (params.wireframe !== undefined) {
      this.setWireframeVisible(params.wireframe);
    }
  }

  dispose() {
    super.dispose();
    this.geometry = null;
    this.material = null;
    this.surfaceMat = null;
    this.wireMat = null;
    this.surfaceMesh = null;
    this.wireMesh = null;
    this.glowRingMesh = null;
    this.glowRingMat = null;
    if (this.glowRingGeo) this.glowRingGeo.dispose();
    if (this.projGlowRingMesh) {
      if (this.projGlowRingMesh.geometry) this.projGlowRingMesh.geometry.dispose();
      if (this.projGlowRingMat) this.projGlowRingMat.dispose();
      this.projGlowRingMesh = null;
      this.projGlowRingMat = null;
    }
    if (this.splitGlowRingMesh) {
      if (this.splitGlowRingMesh.geometry) this.splitGlowRingMesh.geometry.dispose();
      if (this.splitGlowRingMat) this.splitGlowRingMat.dispose();
      this.splitGlowRingMesh = null;
      this.splitGlowRingMat = null;
    }
  }
}
