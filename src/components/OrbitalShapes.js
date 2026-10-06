import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import {
  realSphericalHarmonic,
  complexSphericalHarmonic,
  getNodalStructure,
  getRadialShellInfo,
  getOrbitalCurrentRings,
  ORBITAL_NAMES
} from '../core/QuantumPhysics.js';

/**
 * Creates high-resolution canvas text sprites for axes and nodal annotations
 */
function createTextSprite(text, color = '#f8fafc', fontSize = 54) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = `italic bold ${fontSize}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.95, 0.95, 1.0);
  return sprite;
}

/**
 * OrbitalShapes: 3D Visualization of "The Shapes of Atomic Orbitals".
 * Features:
 * - Real Orbitals / Superpositions: Signed phase lobes (+1 Cyan vs -1 Amber/Gold)
 *   Supports s, p (px, py, pz), d (dz2, dxz, dyz, dxy, dx2-y2), and f orbitals
 * - Complex m-eigenstates: Continuous rainbow HSV phase circulation e^{i(m*phi - omega*t)}
 * - Multi-shell radial topology: nested inner core lobes & outer horned funnels when n > l + 1
 *   (e.g. psi_{4,2,1} core lobe vs outer horned lobes) with Laguerre radial phase inversion
 * - Parametric Cutaway window (0°, 90°, 180°) opening the outer shell to reveal inner core & throat
 * - Probability current vortex rings (toroidal pinch rings for m != 0 rotating with L_z circulation)
 * - Spin vectors and precession cones for m_s (+1/2, -1/2, paired) with spin-orbit coupling
 * - Nodal Panels layer: Frosted glass planes, frame edges, coordinate axes (x, y, z), and callout annotations
 * - 5th Coordinate SU(2) Spin Double Cover (Riemann surface with 720° spinor winding)
 * - Fully independent layer controls for:
 *   1. Real shapes layer (shapesReal)
 *   2. Complex shapes layer (shapesComplex)
 *   3. Nodal surfaces layer (nodalSurfaces)
 *   4. Nodal panels & axes layer (nodalPanels)
 *   5. 5th coordinate SU(2) spin double cover (spinDoubleCover)
 *   6. Vortex current rings layer (vortexRings)
 */
export class OrbitalShapes extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'orbital-shapes', options = {}) {
    super(id, {
      name: 'Orbitális Formák (Real & Complex)',
      ...options,
      parameters: {
        n: options.n || 2,
        l: options.l || 1,        // 0: s, 1: p, 2: d, 3: f
        m: options.m !== undefined ? options.m : 0,
        ms: options.ms !== undefined ? options.ms : 0.5,
        su2Angle: options.su2Angle !== undefined ? options.su2Angle : 0,
        showReal: options.showReal !== undefined ? options.showReal : true,
        showComplex: options.showComplex !== undefined ? options.showComplex : false,
        showNodalSurfaces: options.showNodalSurfaces !== undefined ? options.showNodalSurfaces : true,
        showNodalPanels: options.showNodalPanels !== undefined ? options.showNodalPanels : true,
        showSpinDoubleCover: options.showSpinDoubleCover !== undefined ? options.showSpinDoubleCover : false,
        showVortexRings: options.showVortexRings !== undefined ? options.showVortexRings : true,
        cutawayAngle: options.cutawayAngle !== undefined ? options.cutawayAngle : 0, // 0: closed, Math.PI/2: 90°, Math.PI: 180°
        layout: options.layout || 'center', // 'center' (at nucleus 0,0,0) or 'split'
        splitOffset: options.splitOffset || 7.0,
        scale: options.scale || 4.2,
        opacity: options.opacity !== undefined ? options.opacity : 0.38,
        wireframe: options.wireframe || false,
        phaseSpeed: options.phaseSpeed || 2.2,
        ...options.parameters
      }
    });

    this.realGroup = new THREE.Group();
    this.complexGroup = new THREE.Group();
    this.nodalGroup = new THREE.Group();
    this.nodalPanelsGroup = new THREE.Group();
    this.spinGroup = new THREE.Group();
    this.spinDoubleCoverGroup = new THREE.Group();
    this.vortexGroup = new THREE.Group();

    this.group.add(this.realGroup);
    this.group.add(this.complexGroup);
    this.group.add(this.nodalGroup);
    this.group.add(this.nodalPanelsGroup);
    this.group.add(this.spinGroup);
    this.group.add(this.spinDoubleCoverGroup);
    this.group.add(this.vortexGroup);

    this.realMeshes = [];
    this.complexMeshes = [];
    this.vortexRings = [];
    this.spinPrecessionItems = [];
    this.su2ParticleMesh = null;

    // Backward-compatibility properties
    this.realMesh = null;
    this.complexMesh = null;
    this.realGeo = null;
    this.complexGeo = null;

    this.gridTheta = 60;
    this.gridPhi = 90;
  }

  build() {
    this.rebuildSurfaces();
    this.updateLayerVisibilities();
  }

  /**
   * Generates the parametric shape geometry for real or complex spherical harmonics
   * with support for nested radial shells and azimuthal cutaway windows.
   */
  createOrbitalGeometry(isComplex = false, shellIndex = 0, shellInfo = null) {
    const nTheta = this.gridTheta;
    const nPhi = this.gridPhi;
    const l = this.parameters.l;
    const m = this.parameters.m;
    const scale = this.parameters.scale;

    const isInner = shellInfo && shellInfo.hasSubshells && shellIndex < shellInfo.shells.length - 1;
    const shellCount = shellInfo && shellInfo.hasSubshells ? shellInfo.shells.length : 1;

    // Cutaway angle opens the outer shell to reveal the inner core & central vortex throat.
    // For inner core, cutaway is 0 (or small) so it remains whole and visible inside.
    const cutaway = isInner ? 0 : (this.parameters.cutawayAngle || 0);
    const maxPhi = Math.PI * 2 - cutaway;

    // Shell scale calculation
    let shellScale = scale;
    let signShift = 0;
    if (shellInfo && shellInfo.hasSubshells) {
      if (isInner) {
        const peakInner = shellInfo.shells[shellIndex].rPeak;
        const peakOuter = shellInfo.shells[shellCount - 1].rPeak || 1.0;
        const ratio = Math.max(0.32, Math.min(0.52, peakInner / peakOuter));
        shellScale = scale * ratio;
        if (shellInfo.shells[shellIndex].sign !== shellInfo.shells[shellCount - 1].sign) {
          signShift = 0.5; // Pi phase shift
        }
      }
    }

    const vertexCount = (nTheta + 1) * (nPhi + 1);
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    const colorPos = new THREE.Color(0x38bdf8); // Cyan (+ phase)
    const colorNeg = new THREE.Color(0xf59e0b); // Amber/Gold (- phase)
    const tempColor = new THREE.Color();

    let idx = 0;
    for (let i = 0; i <= nTheta; i++) {
      const theta = (i / nTheta) * Math.PI;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let j = 0; j <= nPhi; j++) {
        const phi = (j / nPhi) * maxPhi;

        let rVal = 0;
        let isPositive = true;

        if (!isComplex) {
          // Real spherical harmonic with signed lobes
          const yVal = realSphericalHarmonic(l, m, theta, phi);
          isPositive = yVal >= 0;
          if (signShift > 0) isPositive = !isPositive; // Laguerre radial sign inversion for inner shell

          rVal = l === 0 ? shellScale * 0.75 : shellScale * Math.abs(yVal);
          rVal = Math.max(0.04, rVal);

          const col = isPositive ? colorPos : colorNeg;
          colors[idx * 3]     = col.r;
          colors[idx * 3 + 1] = col.g;
          colors[idx * 3 + 2] = col.b;
        } else {
          // Complex m-eigenstate
          const { magnitude } = complexSphericalHarmonic(l, m, theta, phi, 0);
          rVal = l === 0 ? shellScale * 0.75 : shellScale * magnitude;
          rVal = Math.max(0.04, rVal);

          // Hue derived from azimuthal angle & magnetic quantum number + radial sign phase shift
          const hue = (((m * phi) / (Math.PI * 2) + 10.0 + signShift) % 1.0);
          tempColor.setHSL(hue, 0.9, 0.55);

          colors[idx * 3]     = tempColor.r;
          colors[idx * 3 + 1] = tempColor.g;
          colors[idx * 3 + 2] = tempColor.b;
        }

        // Y is vertical polar axis (matching physics convention with Three.js camera upright)
        const vx = rVal * sinT * Math.cos(phi);
        const vy = rVal * cosT;
        const vz = rVal * sinT * Math.sin(phi);

        positions[idx * 3]     = vx;
        positions[idx * 3 + 1] = vy;
        positions[idx * 3 + 2] = vz;

        uvs[idx * 2]     = j / nPhi;
        uvs[idx * 2 + 1] = i / nTheta;

        idx++;
      }
    }

    // Build triangle faces
    const indices = [];
    for (let i = 0; i < nTheta; i++) {
      for (let j = 0; j < nPhi; j++) {
        const a = i * (nPhi + 1) + j;
        const b = (i + 1) * (nPhi + 1) + j;
        const c = (i + 1) * (nPhi + 1) + (j + 1);
        const d = i * (nPhi + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }

  rebuildSurfaces() {
    // Clear previous real meshes
    while (this.realGroup.children.length > 0) {
      const child = this.realGroup.children[0];
      this.realGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.realMeshes = [];

    // Clear previous complex meshes
    while (this.complexGroup.children.length > 0) {
      const child = this.complexGroup.children[0];
      this.complexGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }
    this.complexMeshes = [];

    // Clear previous nodal group
    while (this.nodalGroup.children.length > 0) {
      const child = this.nodalGroup.children[0];
      this.nodalGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    const { n, l, m, scale, layout, splitOffset } = this.parameters;
    const splitX = splitOffset;

    const matOptions = {
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: this.parameters.opacity !== undefined ? this.parameters.opacity : 0.38,
      depthWrite: false,
      roughness: 0.28,
      metalness: 0.15,
      wireframe: this.parameters.wireframe
    };

    const shellInfo = getRadialShellInfo(n, l);
    const shellCount = shellInfo.hasSubshells ? shellInfo.shells.length : 1;

    for (let s = 0; s < shellCount; s++) {
      const isInner = shellInfo.hasSubshells && s < shellCount - 1;
      const signShift = (isInner && shellInfo.shells[s].sign !== shellInfo.shells[shellCount - 1].sign) ? 0.5 : 0;

      // 1. Real Superposition Mesh
      const rGeo = this.createOrbitalGeometry(false, s, shellInfo);
      const rMat = new THREE.MeshStandardMaterial({
        ...matOptions,
        opacity: isInner ? Math.min(0.85, matOptions.opacity * 1.5) : matOptions.opacity
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.x = (layout === 'split' && this.parameters.showComplex) ? -splitX : 0;
      this.realGroup.add(rMesh);
      this.realMeshes.push({ mesh: rMesh, geo: rGeo, isInner, signShift });

      // 2. Complex m-eigenstate Mesh
      const cGeo = this.createOrbitalGeometry(true, s, shellInfo);
      const cMat = new THREE.MeshStandardMaterial({
        ...matOptions,
        opacity: isInner ? Math.min(0.85, matOptions.opacity * 1.5) : matOptions.opacity
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.x = (layout === 'split' && this.parameters.showReal) ? splitX : 0;
      this.complexGroup.add(cMesh);
      this.complexMeshes.push({ mesh: cMesh, geo: cGeo, isInner, signShift });
    }

    // Set backward compatibility handles to outermost mesh
    this.realMesh = this.realMeshes[this.realMeshes.length - 1]?.mesh || null;
    this.realGeo = this.realMeshes[this.realMeshes.length - 1]?.geo || null;
    this.complexMesh = this.complexMeshes[this.complexMeshes.length - 1]?.mesh || null;
    this.complexGeo = this.complexMeshes[this.complexMeshes.length - 1]?.geo || null;

    // 3. Nodal Surfaces
    this.buildNodalSurfaces(shellInfo);

    // 4. Nodal Panels & Coordinate Axes
    this.buildNodalPanels();

    // 5. Spin Visuals & Precession Cones
    this.buildSpinVisuals();

    // 6. 5th Coordinate SU(2) Spin Double Cover
    this.buildSpinDoubleCover();

    // 7. Vortex Current Rings
    this.buildVortexRings();

    this.updateLayerVisibilities();
  }

  buildNodalSurfaces(shellInfo = null) {
    const n = this.parameters.n;
    const l = this.parameters.l;
    const m = this.parameters.m;
    const scale = this.parameters.scale;
    const layout = this.parameters.layout;
    const nodalX = (layout === 'split' && this.parameters.showComplex) ? -this.parameters.splitOffset : 0;

    const nodalMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false
    });

    // Radial node spheres (where n - l - 1 > 0)
    if (shellInfo && shellInfo.radialNodes && shellInfo.radialNodes.length > 0) {
      const outerPeak = shellInfo.shells[shellInfo.shells.length - 1].rPeak || 1.0;
      for (const rNode of shellInfo.radialNodes) {
        const nodeRadius = scale * 0.65 * (rNode / outerPeak);
        const sphereGeo = new THREE.SphereGeometry(nodeRadius, 24, 24);
        const sphereMesh = new THREE.Mesh(sphereGeo, nodalMat);
        sphereMesh.position.x = nodalX;
        this.nodalGroup.add(sphereMesh);
      }
    } else {
      const radialNodes = n - l - 1;
      for (let r = 1; r <= radialNodes; r++) {
        const nodeRadius = (scale * 0.45) * (r / (radialNodes + 1)) * 1.6;
        const sphereGeo = new THREE.SphereGeometry(nodeRadius, 24, 24);
        const sphereMesh = new THREE.Mesh(sphereGeo, nodalMat);
        sphereMesh.position.x = nodalX;
        this.nodalGroup.add(sphereMesh);
      }
    }

    // Angular nodal planes
    if (l === 1 && m === 0) {
      // p_z (along Y) nodal plane at XZ (y = 0)
      const planeGeo = new THREE.RingGeometry(0.2, scale * 1.2, 32);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMesh = new THREE.Mesh(planeGeo, nodalMat);
      planeMesh.position.x = nodalX;
      this.nodalGroup.add(planeMesh);
    } else if (l === 1 && m === 1) {
      // p_x nodal plane at YZ (x = 0)
      const planeGeo = new THREE.RingGeometry(0.2, scale * 1.2, 32);
      planeGeo.rotateY(Math.PI / 2);
      const planeMesh = new THREE.Mesh(planeGeo, nodalMat);
      planeMesh.position.x = nodalX;
      this.nodalGroup.add(planeMesh);
    } else if (l === 2 && m === 0) {
      // d_z2 nodal cones: 3*cos^2(theta) - 1 = 0 => theta = 54.74° and 125.26°
      const coneHeight = scale * 0.85;
      const coneRadius = scale * 1.1;
      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 32, 1, true);
      const coneUp = new THREE.Mesh(coneGeo, nodalMat);
      coneUp.position.set(nodalX, coneHeight * 0.5, 0);
      coneUp.rotation.x = Math.PI;
      this.nodalGroup.add(coneUp);

      const coneDown = new THREE.Mesh(coneGeo, nodalMat);
      coneDown.position.set(nodalX, -coneHeight * 0.5, 0);
      this.nodalGroup.add(coneDown);
    }
  }

  /**
   * Helper to construct a frosted glass panel with border frame lines
   */
  _createGlassPanel(width, height, normalAxis = 'y', rotationY = 0) {
    const pGroup = new THREE.Group();
    const planeGeo = new THREE.PlaneGeometry(width, height);
    if (normalAxis === 'y') {
      planeGeo.rotateX(-Math.PI / 2); // Lies in XZ plane
    } else if (normalAxis === 'x') {
      planeGeo.rotateY(Math.PI / 2); // Lies in YZ plane
    }

    if (rotationY !== 0) {
      pGroup.rotation.y = rotationY;
    }

    const panelMat = new THREE.MeshStandardMaterial({
      color: 0xeff6ff, // Clean ice glass
      roughness: 0.15,
      metalness: 0.08,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const panelMesh = new THREE.Mesh(planeGeo, panelMat);
    pGroup.add(panelMesh);

    // Subtle crisp border frame around perimeter
    const edges = new THREE.EdgesGeometry(planeGeo);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });
    const borderLine = new THREE.LineSegments(edges, borderMat);
    pGroup.add(borderLine);

    return pGroup;
  }

  /**
   * Builds the Nodal Panels layer: frosted glass dividing planes, coordinate axes, and callout labels
   * accurately reproducing the textbook orbital diagrams (Image 1).
   */
  buildNodalPanels() {
    while (this.nodalPanelsGroup.children.length > 0) {
      const c = this.nodalPanelsGroup.children[0];
      this.nodalPanelsGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }

    const { l, m, scale, layout, splitOffset, showComplex } = this.parameters;
    const posX = (layout === 'split' && showComplex) ? -splitOffset : 0;

    const panelSize = scale * 2.35;
    const container = new THREE.Group();
    container.position.x = posX;
    this.nodalPanelsGroup.add(container);

    // 1. Angular Nodal Panels matching textbook Image 1
    if (l === 1) {
      if (m === 0) {
        // p_z: horizontal nodal plane at z=0 (Three.js XZ plane, y=0)
        container.add(this._createGlassPanel(panelSize, panelSize, 'y'));
      } else if (m === 1) {
        // p_x: vertical nodal plane at x=0 (Three.js YZ plane)
        container.add(this._createGlassPanel(panelSize, panelSize, 'x'));
      } else if (m === -1) {
        // p_y: vertical nodal plane at y=0 (Three.js XY plane)
        container.add(this._createGlassPanel(panelSize, panelSize, 'z'));
      }
    } else if (l === 2) {
      if (m === -2) {
        // 3d_xy: two vertical nodal planes at x=0 and y=0 (Three.js YZ and XY planes)
        container.add(this._createGlassPanel(panelSize, panelSize, 'x'));
        container.add(this._createGlassPanel(panelSize, panelSize, 'z'));
      } else if (m === 1) {
        // 3d_xz: vertical at x=0 (YZ plane) and horizontal at z=0 (XZ plane)
        container.add(this._createGlassPanel(panelSize, panelSize, 'x'));
        container.add(this._createGlassPanel(panelSize, panelSize, 'y'));
      } else if (m === -1) {
        // 3d_yz: vertical at y=0 (XY plane) and horizontal at z=0 (XZ plane)
        container.add(this._createGlassPanel(panelSize, panelSize, 'z'));
        container.add(this._createGlassPanel(panelSize, panelSize, 'y'));
      } else if (m === 2) {
        // 3d_{x^2 - y^2}: two diagonal planes rotated 45 deg around vertical axis
        container.add(this._createGlassPanel(panelSize, panelSize, 'x', Math.PI / 4));
        container.add(this._createGlassPanel(panelSize, panelSize, 'x', -Math.PI / 4));
      } else if (m === 0) {
        // 3d_{z^2}: two nodal cones at theta = 54.74° and 125.26° around Y axis
        const coneHeight = scale * 0.95;
        const coneRadius = coneHeight * Math.tan((54.74 * Math.PI) / 180);
        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 36, 1, true);
        const coneMat = new THREE.MeshStandardMaterial({
          color: 0xeff6ff,
          roughness: 0.15,
          metalness: 0.08,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const coneUp = new THREE.Mesh(coneGeo, coneMat);
        coneUp.position.y = coneHeight * 0.5;
        coneUp.rotation.x = Math.PI;
        container.add(coneUp);

        const coneDown = new THREE.Mesh(coneGeo, coneMat);
        coneDown.position.y = -coneHeight * 0.5;
        container.add(coneDown);

        // Frame rim rings
        const rimGeo = new THREE.BufferGeometry();
        const rimPts = 48;
        const rimPos = new Float32Array((rimPts + 1) * 3);
        for (let p = 0; p <= rimPts; p++) {
          const a = (p / rimPts) * Math.PI * 2;
          rimPos[p * 3]     = Math.cos(a) * coneRadius;
          rimPos[p * 3 + 1] = 0;
          rimPos[p * 3 + 2] = Math.sin(a) * coneRadius;
        }
        rimGeo.setAttribute('position', new THREE.BufferAttribute(rimPos, 3));
        const rimMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.65 });
        const rimUp = new THREE.Line(rimGeo, rimMat);
        rimUp.position.y = coneHeight;
        container.add(rimUp);
        const rimDown = new THREE.Line(rimGeo, rimMat);
        rimDown.position.y = -coneHeight;
        container.add(rimDown);
      }
    } else if (l === 3) {
      if (m === 0) {
        container.add(this._createGlassPanel(panelSize, panelSize, 'y'));
      } else if (Math.abs(m) === 1) {
        container.add(this._createGlassPanel(panelSize, panelSize, m > 0 ? 'x' : 'z'));
      } else if (Math.abs(m) === 2) {
        container.add(this._createGlassPanel(panelSize, panelSize, 'y'));
        container.add(this._createGlassPanel(panelSize, panelSize, 'x', Math.PI / 4));
      } else {
        container.add(this._createGlassPanel(panelSize, panelSize, 'x', 0));
        container.add(this._createGlassPanel(panelSize, panelSize, 'x', Math.PI / 3));
        container.add(this._createGlassPanel(panelSize, panelSize, 'x', -Math.PI / 3));
      }
    }

    // 2. Coordinate Axes (x, y, z) extending beyond panels with text sprites
    const axisLength = scale * 1.55;
    const axisMat = new THREE.LineBasicMaterial({ color: 0x475569, transparent: true, opacity: 0.85 });

    // Z axis (Three.js vertical Y axis)
    const zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0)
    ]);
    container.add(new THREE.Line(zGeo, axisMat));
    const zLabel = createTextSprite('z', '#0f172a', 62);
    zLabel.position.set(0, axisLength * 1.08, 0);
    container.add(zLabel);

    // X axis (Three.js +X axis)
    const xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0)
    ]);
    container.add(new THREE.Line(xGeo, axisMat));
    const xLabel = createTextSprite('x', '#0f172a', 62);
    xLabel.position.set(axisLength * 1.08, 0, 0);
    container.add(xLabel);

    // Y axis (Three.js +Z axis)
    const yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength)
    ]);
    container.add(new THREE.Line(yGeo, axisMat));
    const yLabel = createTextSprite('y', '#0f172a', 62);
    yLabel.position.set(0, 0, axisLength * 1.08);
    container.add(yLabel);

    // 3. "Nodal planes" annotation callout
    if (l > 0) {
      const calloutText = createTextSprite('Nodal planes', '#334155', 38);
      calloutText.scale.set(1.8, 0.9, 1);
      const calloutX = panelSize * 0.62;
      const calloutY = panelSize * 0.45;
      const calloutZ = 0;
      calloutText.position.set(calloutX, calloutY, calloutZ);
      container.add(calloutText);

      // Leader line from text to plane edge
      const leaderGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(panelSize * 0.40, panelSize * 0.35, 0),
        new THREE.Vector3(calloutX - 0.3, calloutY, calloutZ)
      ]);
      const leaderMat = new THREE.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.75 });
      container.add(new THREE.Line(leaderGeo, leaderMat));
    }
  }

  /**
   * Builds the Spin Visuals: Spin vector arrow (+1/2, -1/2, paired) and
   * the quantum mechanical spin precession cone (theta = 54.74° around quantization axis)
   */
  buildSpinVisuals() {
    while (this.spinGroup.children.length > 0) {
      const c = this.spinGroup.children[0];
      this.spinGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    this.spinPrecessionItems = [];

    const ms = this.parameters.ms !== undefined ? this.parameters.ms : 0.5;
    const scale = this.parameters.scale;
    const { layout, splitOffset, showComplex } = this.parameters;
    const posX = (layout === 'split' && showComplex) ? -splitOffset : 0;

    const container = new THREE.Group();
    container.position.x = posX;
    this.spinGroup.add(container);

    const arrowLength = scale * 0.95;
    const arrowOrigin = new THREE.Vector3(0, 0, 0);

    const spinsToDraw = [];
    if (ms > 0) {
      spinsToDraw.push({ dir: new THREE.Vector3(0, 1, 0), color: 0xf59e0b, sign: 1 });
    } else if (ms < 0) {
      spinsToDraw.push({ dir: new THREE.Vector3(0, -1, 0), color: 0x38bdf8, sign: -1 });
    } else {
      // Paired (±1/2)
      spinsToDraw.push({ dir: new THREE.Vector3(0, 1, 0), color: 0xf59e0b, sign: 1 });
      spinsToDraw.push({ dir: new THREE.Vector3(0, -1, 0), color: 0x38bdf8, sign: -1 });
    }

    for (const sp of spinsToDraw) {
      // Central arrow
      const arrowHelper = new THREE.ArrowHelper(
        sp.dir,
        arrowOrigin,
        arrowLength,
        sp.color,
        arrowLength * 0.22,
        arrowLength * 0.12
      );
      container.add(arrowHelper);

      // Glowing cylinder shaft
      const cylGeo = new THREE.CylinderGeometry(scale * 0.016, scale * 0.016, arrowLength * 0.78, 16);
      const cylMat = new THREE.MeshStandardMaterial({
        color: sp.color,
        emissive: sp.color,
        emissiveIntensity: 0.85,
        roughness: 0.3,
        metalness: 0.5
      });
      const cylMesh = new THREE.Mesh(cylGeo, cylMat);
      cylMesh.position.y = sp.sign * arrowLength * 0.39;
      container.add(cylMesh);

      // Precession cone: angle theta = arccos(1 / sqrt(3)) = 54.74°
      const coneHeight = arrowLength * 0.85;
      const coneRadius = coneHeight * Math.tan((54.74 * Math.PI) / 180);
      const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 32, 2, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: sp.color,
        wireframe: true,
        transparent: true,
        opacity: 0.18,
        depthWrite: false
      });
      const coneMesh = new THREE.Mesh(coneGeo, coneMat);
      if (sp.sign > 0) {
        coneMesh.position.y = coneHeight * 0.5;
        coneMesh.rotation.x = Math.PI;
      } else {
        coneMesh.position.y = -coneHeight * 0.5;
      }
      container.add(coneMesh);

      // Precession orbit ring rim
      const ringGeo = new THREE.BufferGeometry();
      const ringPts = 64;
      const ringPos = new Float32Array((ringPts + 1) * 3);
      for (let p = 0; p <= ringPts; p++) {
        const a = (p / ringPts) * Math.PI * 2;
        ringPos[p * 3]     = Math.cos(a) * coneRadius;
        ringPos[p * 3 + 1] = sp.sign * coneHeight;
        ringPos[p * 3 + 2] = Math.sin(a) * coneRadius;
      }
      ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3));
      const ringMat = new THREE.LineBasicMaterial({
        color: sp.color,
        transparent: true,
        opacity: 0.55
      });
      const ringLine = new THREE.Line(ringGeo, ringMat);
      container.add(ringLine);

      // Precessing vector tip marker
      const tipGeo = new THREE.SphereGeometry(scale * 0.045, 16, 16);
      const tipMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: sp.color,
        emissiveIntensity: 1.0
      });
      const tipMesh = new THREE.Mesh(tipGeo, tipMat);
      tipMesh.position.set(coneRadius, sp.sign * coneHeight, 0);
      container.add(tipMesh);

      // Dynamic precessing vector from origin to tip
      const precessLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(coneRadius, sp.sign * coneHeight, 0)
      ]);
      const precessLineMat = new THREE.LineBasicMaterial({
        color: sp.color,
        transparent: true,
        opacity: 0.75
      });
      const precessLine = new THREE.Line(precessLineGeo, precessLineMat);
      container.add(precessLine);

      this.spinPrecessionItems.push({
        tipMesh,
        precessLine,
        coneRadius,
        coneHeight: sp.sign * coneHeight,
        sign: sp.sign,
        speed: 2.2 * sp.sign
      });
    }
  }

  /**
   * Builds the 5th Coordinate SU(2) Spin Double Cover (Riemann surface).
   * Spans 720° (4*PI), covering both Sheet 1 (+1/2 phase) and Sheet 2 (-1/2 phase).
   */
  buildSpinDoubleCover() {
    while (this.spinDoubleCoverGroup.children.length > 0) {
      const c = this.spinDoubleCoverGroup.children[0];
      this.spinDoubleCoverGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    this.su2ParticleMesh = null;

    const scale = this.parameters.scale;
    const { layout, splitOffset, showComplex } = this.parameters;
    const posX = (layout === 'split' && showComplex) ? -splitOffset : 0;

    const container = new THREE.Group();
    container.position.x = posX;
    this.spinDoubleCoverGroup.add(container);

    const rMin = scale * 0.28;
    const rMax = scale * 1.25;
    const maxPhi = Math.PI * 4; // 720 degrees
    const nR = 24;
    const nPhi = 96;
    const hTotal = scale * 0.95;

    const vertexCount = (nR + 1) * (nPhi + 1);
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    const colSheet1 = new THREE.Color(0xf59e0b); // Amber/Gold (+1/2)
    const colSheet2 = new THREE.Color(0x06b6d4); // Cyan (-1/2)
    const colMid = new THREE.Color(0x8b5cf6);   // Violet transition
    const tempCol = new THREE.Color();

    let idx = 0;
    for (let i = 0; i <= nR; i++) {
      const r = rMin + (i / nR) * (rMax - rMin);
      for (let j = 0; j <= nPhi; j++) {
        const phi = (j / nPhi) * maxPhi;
        const vx = r * Math.cos(phi);
        const vz = r * Math.sin(phi);
        const vy = hTotal * ((phi - Math.PI * 2) / (Math.PI * 4));

        positions[idx * 3]     = vx;
        positions[idx * 3 + 1] = vy;
        positions[idx * 3 + 2] = vz;

        if (phi < Math.PI * 2) {
          tempCol.lerpColors(colSheet1, colMid, (phi / (Math.PI * 2)) * 0.35);
        } else {
          tempCol.lerpColors(colMid, colSheet2, ((phi - Math.PI * 2) / (Math.PI * 2)));
        }

        colors[idx * 3]     = tempCol.r;
        colors[idx * 3 + 1] = tempCol.g;
        colors[idx * 3 + 2] = tempCol.b;

        uvs[idx * 2]     = j / nPhi;
        uvs[idx * 2 + 1] = i / nR;

        idx++;
      }
    }

    const indices = [];
    for (let i = 0; i < nR; i++) {
      for (let j = 0; j < nPhi; j++) {
        const a = i * (nPhi + 1) + j;
        const b = (i + 1) * (nPhi + 1) + j;
        const c = (i + 1) * (nPhi + 1) + (j + 1);
        const d = i * (nPhi + 1) + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      roughness: 0.35,
      metalness: 0.25
    });
    const mesh = new THREE.Mesh(geo, mat);
    container.add(mesh);

    // Spiraling outer rim line
    const edgeGeo = new THREE.BufferGeometry();
    const edgePos = new Float32Array((nPhi + 1) * 3);
    for (let j = 0; j <= nPhi; j++) {
      const phi = (j / nPhi) * maxPhi;
      edgePos[j * 3]     = rMax * Math.cos(phi);
      edgePos[j * 3 + 1] = hTotal * ((phi - Math.PI * 2) / (Math.PI * 4));
      edgePos[j * 3 + 2] = rMax * Math.sin(phi);
    }
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3));
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const edgeLine = new THREE.Line(edgeGeo, edgeMat);
    container.add(edgeLine);

    // Branch cut seam line at phi = 2*PI (between Sheet 1 and Sheet 2)
    const seamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(rMin, 0, 0),
      new THREE.Vector3(rMax, 0, 0)
    ]);
    const seamMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const seamLine = new THREE.Line(seamGeo, seamMat);
    container.add(seamLine);

    // Dynamic Spinor Marker particle
    const partGeo = new THREE.SphereGeometry(scale * 0.07, 16, 16);
    const partMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.8
    });
    this.su2ParticleMesh = new THREE.Mesh(partGeo, partMat);
    this.updateSu2ParticlePosition();
    container.add(this.su2ParticleMesh);
  }

  setSu2Angle(angleRad) {
    this.parameters.su2Angle = angleRad;
    this.updateSu2ParticlePosition();
  }

  updateSu2ParticlePosition() {
    if (!this.su2ParticleMesh) return;
    const scale = this.parameters.scale;
    const r = scale * 0.75;
    const hTotal = scale * 0.95;
    const phi = Math.max(0, Math.min(Math.PI * 4, this.parameters.su2Angle || 0));

    const vx = r * Math.cos(phi);
    const vy = hTotal * ((phi - Math.PI * 2) / (Math.PI * 4));
    const vz = r * Math.sin(phi);

    this.su2ParticleMesh.position.set(vx, vy, vz);

    if (this.su2ParticleMesh.material && this.su2ParticleMesh.material.emissive) {
      if (phi < Math.PI * 2) {
        this.su2ParticleMesh.material.emissive.setHex(0xf59e0b); // Amber for Sheet 1
      } else {
        this.su2ParticleMesh.material.emissive.setHex(0x06b6d4); // Cyan for Sheet 2
      }
    }
  }

  buildVortexRings() {
    while (this.vortexGroup.children.length > 0) {
      const c = this.vortexGroup.children[0];
      this.vortexGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    this.vortexRings = [];

    const { n, l, m, scale, layout, splitOffset, showComplex, showReal } = this.parameters;
    if (m === 0 || l === 0) return;

    const ringsData = getOrbitalCurrentRings(n, l, m, scale);
    const ringX = (layout === 'split' && showComplex && !showReal)
      ? splitOffset
      : ((layout === 'split' && showReal && !showComplex) ? -splitOffset : 0);

    for (const rData of ringsData) {
      const tubeRadius = Math.max(0.04, scale * 0.022);
      const torusGeo = new THREE.TorusGeometry(rData.radius, tubeRadius, 16, 64);
      torusGeo.rotateX(Math.PI / 2);

      const baseColor = new THREE.Color().setHSL(rData.hue, 0.95, 0.60);
      const emissiveColor = new THREE.Color().setHSL(rData.hue, 1.0, 0.45);

      const mat = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.45,
        transparent: true,
        opacity: 0.92
      });

      const mesh = new THREE.Mesh(torusGeo, mat);
      mesh.position.set(ringX, rData.y, 0);
      this.vortexGroup.add(mesh);

      this.vortexRings.push({
        mesh,
        speed: rData.speed,
        direction: rData.direction,
        y: rData.y
      });
    }
  }

  updateLayerVisibilities() {
    this.realGroup.visible = !!this.parameters.showReal;
    this.complexGroup.visible = !!this.parameters.showComplex;
    this.nodalGroup.visible = !!this.parameters.showNodalSurfaces;
    this.nodalPanelsGroup.visible = !!this.parameters.showNodalPanels;
    this.spinGroup.visible = !!(this.parameters.showReal || this.parameters.showComplex || this.parameters.showNodalPanels);
    this.spinDoubleCoverGroup.visible = !!this.parameters.showSpinDoubleCover;
    this.vortexGroup.visible = !!this.parameters.showVortexRings;
  }

  setRealVisible(visible) {
    this.parameters.showReal = !!visible;
    this.realGroup.visible = this.parameters.showReal;
    this.spinGroup.visible = !!(this.parameters.showReal || this.parameters.showComplex || this.parameters.showNodalPanels);
  }

  setComplexVisible(visible) {
    this.parameters.showComplex = !!visible;
    this.complexGroup.visible = this.parameters.showComplex;
    this.spinGroup.visible = !!(this.parameters.showReal || this.parameters.showComplex || this.parameters.showNodalPanels);
  }

  setNodalVisible(visible) {
    this.parameters.showNodalSurfaces = !!visible;
    this.nodalGroup.visible = this.parameters.showNodalSurfaces;
  }

  setNodalPanelsVisible(visible) {
    this.parameters.showNodalPanels = !!visible;
    this.nodalPanelsGroup.visible = this.parameters.showNodalPanels;
    this.spinGroup.visible = !!(this.parameters.showReal || this.parameters.showComplex || this.parameters.showNodalPanels);
  }

  setSpinDoubleCoverVisible(visible) {
    this.parameters.showSpinDoubleCover = !!visible;
    this.spinDoubleCoverGroup.visible = this.parameters.showSpinDoubleCover;
  }

  setVortexRingsVisible(visible) {
    this.parameters.showVortexRings = !!visible;
    this.vortexGroup.visible = this.parameters.showVortexRings;
  }

  setCutawayAngle(angle) {
    if (this.parameters.cutawayAngle !== angle) {
      this.parameters.cutawayAngle = angle;
      this.rebuildSurfaces();
    }
  }

  onUpdate(time, deltaTime, syncEngine) {
    // Dynamic quantum phase rotation of complex m-eigenstate: exp(i * (m*phi - omega*t))
    if (this.complexGroup.visible && this.complexMeshes.length > 0) {
      const m = this.parameters.m;
      if (m !== 0) {
        const nTheta = this.gridTheta;
        const nPhi = this.gridPhi;
        const omega = this.parameters.phaseSpeed;
        const t = syncEngine.simTime;
        const tempColor = new THREE.Color();

        for (const cEntry of this.complexMeshes) {
          const { geo, isInner, signShift } = cEntry;
          const colorAttr = geo.attributes.color;
          const cutaway = isInner ? 0 : (this.parameters.cutawayAngle || 0);
          const maxPhi = Math.PI * 2 - cutaway;

          let idx = 0;
          for (let i = 0; i <= nTheta; i++) {
            for (let j = 0; j <= nPhi; j++) {
              const phi = (j / nPhi) * maxPhi;
              const phase = (m * phi - omega * t) / (Math.PI * 2) + (signShift || 0);
              const hue = ((phase % 1.0) + 1.0) % 1.0;
              tempColor.setHSL(hue, 0.9, 0.55);

              colorAttr.setXYZ(idx, tempColor.r, tempColor.g, tempColor.b);
              idx++;
            }
          }
          colorAttr.needsUpdate = true;
        }
      }
    }

    // Dynamic spin precession (Larmor precession around Y axis)
    if (this.spinGroup.visible && this.spinPrecessionItems.length > 0) {
      for (const item of this.spinPrecessionItems) {
        const phi = time * item.speed;
        const px = item.coneRadius * Math.cos(phi);
        const pz = item.coneRadius * Math.sin(phi);
        item.tipMesh.position.set(px, item.coneHeight, pz);

        const posAttr = item.precessLine.geometry.attributes.position;
        posAttr.setXYZ(1, px, item.coneHeight, pz);
        posAttr.needsUpdate = true;
      }
    }

    // Dynamic rotation of toroidal quantum vortex current rings with spin-orbit coupling
    if (this.vortexGroup.visible && this.vortexRings.length > 0) {
      const ms = this.parameters.ms !== undefined ? this.parameters.ms : 0.5;
      const soFactor = 1.0 + 0.3 * Math.sign(this.parameters.m * ms);
      for (const vRing of this.vortexRings) {
        vRing.mesh.rotation.z += deltaTime * vRing.speed * 1.5 * soFactor;
        if (vRing.mesh.material && vRing.mesh.material.emissiveIntensity !== undefined) {
          vRing.mesh.material.emissiveIntensity = 0.75 + 0.25 * Math.sin(time * 3.2 + vRing.direction);
        }
      }
    }

    // Gentle floating rotation around polar axis
    const floatRot = deltaTime * 0.25;
    if (this.realGroup.visible) {
      for (const rEntry of this.realMeshes) {
        rEntry.mesh.rotation.y += floatRot;
      }
    }
    if (this.complexGroup.visible) {
      for (const cEntry of this.complexMeshes) {
        cEntry.mesh.rotation.y += floatRot;
      }
    }
  }

  onParametersChanged(params) {
    let needsRebuild = false;
    if (params.n !== undefined || params.l !== undefined || params.m !== undefined ||
        params.layout !== undefined || params.scale !== undefined ||
        params.cutawayAngle !== undefined) {
      needsRebuild = true;
    }
    if (params.ms !== undefined && params.ms !== this.parameters.ms) {
      this.parameters.ms = params.ms;
      needsRebuild = true;
    }

    if (needsRebuild) {
      this.rebuildSurfaces();
    }

    if (params.su2Angle !== undefined) {
      this.setSu2Angle(params.su2Angle);
    }
    if (params.showReal !== undefined) {
      this.setRealVisible(params.showReal);
    }
    if (params.showComplex !== undefined) {
      this.setComplexVisible(params.showComplex);
    }
    if (params.showNodalSurfaces !== undefined) {
      this.setNodalVisible(params.showNodalSurfaces);
    }
    if (params.showNodalPanels !== undefined) {
      this.setNodalPanelsVisible(params.showNodalPanels);
    }
    if (params.showSpinDoubleCover !== undefined) {
      this.setSpinDoubleCoverVisible(params.showSpinDoubleCover);
    }
    if (params.showVortexRings !== undefined) {
      this.setVortexRingsVisible(params.showVortexRings);
    }
    if (params.wireframe !== undefined) {
      this.realMeshes.forEach(m => { m.mesh.material.wireframe = params.wireframe; });
      this.complexMeshes.forEach(m => { m.mesh.material.wireframe = params.wireframe; });
    }
    if (params.opacity !== undefined) {
      this.realMeshes.forEach(m => {
        m.mesh.material.opacity = m.isInner ? Math.min(0.85, params.opacity * 1.5) : params.opacity;
      });
      this.complexMeshes.forEach(m => {
        m.mesh.material.opacity = m.isInner ? Math.min(0.85, params.opacity * 1.5) : params.opacity;
      });
    }
  }

  dispose() {
    super.dispose();
    this.realMeshes.forEach(m => m.geo.dispose());
    this.complexMeshes.forEach(m => m.geo.dispose());
    this.vortexRings.forEach(r => r.mesh.geometry.dispose());
    this.realMeshes = [];
    this.complexMeshes = [];
    this.vortexRings = [];
    this.spinPrecessionItems = [];
    while (this.spinGroup.children.length > 0) {
      const c = this.spinGroup.children[0];
      this.spinGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    while (this.nodalPanelsGroup.children.length > 0) {
      const c = this.nodalPanelsGroup.children[0];
      this.nodalPanelsGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
    while (this.spinDoubleCoverGroup.children.length > 0) {
      const c = this.spinDoubleCoverGroup.children[0];
      this.spinDoubleCoverGroup.remove(c);
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    }
  }
}
