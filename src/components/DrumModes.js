import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import {
  besselJ0,
  BESSEL_J0_ZEROS,
  besselJ1,
  BESSEL_J1_ZEROS,
  besselJ2,
  BESSEL_J2_ZEROS
} from '../core/QuantumPhysics.js';

/**
 * DrumModes: 3D Visualization of 2D circular vibrating membranes (Bessel modes).
 * Demonstrates the 2D boundary analogy to 3D atomic orbital wavefunctions:
 * - s-mode (m = 0): J_0 radial Bessel wave with concentric circular nodal lines (1s, 2s analog)
 * - p-mode (m = 1): J_1 Bessel wave with diameter nodal line, two antisymmetric lobes (p_z, p_x analog)
 * - Real m-mode (m = 2): J_2 standing wave with quadrupole lobes and crossed nodal lines (d-orbital analog)
 * - Complex m-mode: Traveling/rotating phase wave J_1(kr) * cos(phi - omega*t) (complex eigenstate analog)
 */
export class DrumModes extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'drum-modes', options = {}) {
    super(id, {
      name: 'Membrán Felületek & Dobmódok',
      ...options,
      parameters: {
        modeIndex: options.modeIndex || 2, // 1: 1s, 2: 2s analog
        radius: options.radius || 7.5,
        amplitude: options.amplitude || 1.6,
        radialSegments: options.radialSegments || 48,
        thetaSegments: options.thetaSegments || 64,
        yOffset: options.yOffset !== undefined ? options.yOffset : -2.5,
        wireframe: options.wireframe !== undefined ? options.wireframe : false,
        vibrationSpeed: options.vibrationSpeed || 3.2,
        opacity: options.opacity !== undefined ? options.opacity : 0.45,
        showS: options.showS !== undefined ? options.showS : true,
        showP: options.showP !== undefined ? options.showP : false,
        showMReal: options.showMReal !== undefined ? options.showMReal : false,
        showMComplex: options.showMComplex !== undefined ? options.showMComplex : false,
        ...options.parameters
      }
    });

    // Sub-containers for each membrane surface
    this.groupS = new THREE.Group();
    this.groupP = new THREE.Group();
    this.groupMReal = new THREE.Group();
    this.groupMComplex = new THREE.Group();

    this.group.add(this.groupS);
    this.group.add(this.groupP);
    this.group.add(this.groupMReal);
    this.group.add(this.groupMComplex);

    // Meshes and geometries
    this.meshS = null;
    this.geoS = null;
    this.meshP = null;
    this.geoP = null;
    this.meshMReal = null;
    this.geoMReal = null;
    this.meshMComplex = null;
    this.geoMComplex = null;

    this.materials = [];
  }

  build() {
    this.rebuildAll();
  }

  _createMembraneMesh(radius, thetaSegments, radialSegments, yOffset, wireframe) {
    const geo = new THREE.RingGeometry(0.001, radius, thetaSegments, radialSegments);
    geo.rotateX(-Math.PI / 2);

    const vertexCount = geo.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      wireframe: !!wireframe,
      roughness: 0.25,
      metalness: 0.15,
      transparent: true,
      opacity: this.parameters.opacity,
      depthWrite: false
    });
    this.materials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = yOffset;

    // Outer clamped rim
    const rimGeo = new THREE.TorusGeometry(radius, 0.10, 14, 64);
    rimGeo.rotateX(Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.65
    });
    this.materials.push(rimMat);
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = yOffset;

    return { geo, mat, mesh, rimMesh };
  }

  rebuildAll() {
    // Clear sub-groups
    [this.groupS, this.groupP, this.groupMReal, this.groupMComplex].forEach(g => {
      while (g.children.length > 0) {
        const c = g.children[0];
        g.remove(c);
        if (c.geometry) c.geometry.dispose();
      }
    });
    this.materials.forEach(m => m.dispose());
    this.materials = [];

    const { radius, radialSegments, thetaSegments, yOffset, wireframe } = this.parameters;

    // 1. s-típusú dobréz membrán (m = 0)
    const sData = this._createMembraneMesh(radius, thetaSegments, radialSegments, yOffset, wireframe);
    this.geoS = sData.geo;
    this.meshS = sData.mesh;
    this.groupS.add(this.meshS);
    this.groupS.add(sData.rimMesh);

    // s-mode nodal circular ring
    const mode = Math.max(1, Math.min(4, this.parameters.modeIndex));
    const currentZero = BESSEL_J0_ZEROS[mode - 1];
    const ringMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 });
    this.materials.push(ringMat);

    for (let k = 0; k < mode - 1; k++) {
      const interiorZero = BESSEL_J0_ZEROS[k];
      const nodeRadius = radius * (interiorZero / currentZero);
      const ringPts = [];
      for (let s = 0; s <= 64; s++) {
        const theta = (s / 64) * Math.PI * 2;
        ringPts.push(new THREE.Vector3(Math.cos(theta) * nodeRadius, yOffset + 0.02, Math.sin(theta) * nodeRadius));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
      this.groupS.add(new THREE.Line(ringGeo, ringMat));
    }

    // 2. p-típusú membrán (m = 1)
    const pData = this._createMembraneMesh(radius, thetaSegments, radialSegments, yOffset, wireframe);
    this.geoP = pData.geo;
    this.meshP = pData.mesh;
    this.groupP.add(this.meshP);
    this.groupP.add(pData.rimMesh);

    // p-mode nodal diameter line (along x = 0, z from -R to +R)
    const pNodeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    this.materials.push(pNodeMat);
    const pNodeGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, yOffset + 0.02, -radius),
      new THREE.Vector3(0, yOffset + 0.02, radius)
    ]);
    this.groupP.add(new THREE.Line(pNodeGeo, pNodeMat));

    // 3. Valós m-típusú állóhullám membrán (m = 2 quadrupole)
    const mRData = this._createMembraneMesh(radius, thetaSegments, radialSegments, yOffset, wireframe);
    this.geoMReal = mRData.geo;
    this.meshMReal = mRData.mesh;
    this.groupMReal.add(this.meshMReal);
    this.groupMReal.add(mRData.rimMesh);

    // m-Real crossed nodal diameter lines (at 45 and 135 deg)
    const mRNodeMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.85 });
    this.materials.push(mRNodeMat);
    const diag = radius * Math.SQRT1_2;
    const mRNodeGeo1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-diag, yOffset + 0.02, -diag),
      new THREE.Vector3(diag, yOffset + 0.02, diag)
    ]);
    const mRNodeGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-diag, yOffset + 0.02, diag),
      new THREE.Vector3(diag, yOffset + 0.02, -diag)
    ]);
    this.groupMReal.add(new THREE.Line(mRNodeGeo1, mRNodeMat));
    this.groupMReal.add(new THREE.Line(mRNodeGeo2, mRNodeMat));

    // 4. Komplex m-típusú forgó fázisú membrán (traveling wave)
    const mCData = this._createMembraneMesh(radius, thetaSegments, radialSegments, yOffset, wireframe);
    this.geoMComplex = mCData.geo;
    this.meshMComplex = mCData.mesh;
    this.groupMComplex.add(this.meshMComplex);
    this.groupMComplex.add(mCData.rimMesh);

    this.updateVisibility();
  }

  updateVisibility() {
    this.groupS.visible = !!this.parameters.showS;
    this.groupP.visible = !!this.parameters.showP;
    this.groupMReal.visible = !!this.parameters.showMReal;
    this.groupMComplex.visible = !!this.parameters.showMComplex;
  }

  setSublayerVisibility(opts = {}) {
    if (opts.showS !== undefined) this.parameters.showS = !!opts.showS;
    if (opts.showP !== undefined) this.parameters.showP = !!opts.showP;
    if (opts.showMReal !== undefined) this.parameters.showMReal = !!opts.showMReal;
    if (opts.showMComplex !== undefined) this.parameters.showMComplex = !!opts.showMComplex;
    this.updateVisibility();
  }

  onUpdate(time, deltaTime, syncEngine) {
    const R = this.parameters.radius;
    const A = this.parameters.amplitude;
    const omega = this.parameters.vibrationSpeed;
    const t = syncEngine.simTime;
    const colPeak = new THREE.Color(0x38bdf8); // Cyan
    const colTrough = new THREE.Color(0xf43f5e); // Magenta
    const colZero = new THREE.Color(0x0f172a); // Deep background blue

    // 1. Update s-mode membrane: u(r, t) = A * J0(k01 * r / R) * cos(omega * t)
    if (this.groupS.visible && this.geoS) {
      const posAttr = this.geoS.attributes.position;
      const colorAttr = this.geoS.attributes.color;
      const mode = Math.max(1, Math.min(4, this.parameters.modeIndex));
      const zeroK = BESSEL_J0_ZEROS[mode - 1];
      const timeFactor = Math.cos(omega * t);

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const r = Math.sqrt(vx * vx + vz * vz);
        const besselArg = zeroK * Math.min(1.0, r / R);
        const dispY = A * besselJ0(besselArg) * timeFactor;
        posAttr.setY(i, dispY);

        const normDisp = Math.max(-1.0, Math.min(1.0, dispY / (A || 1.0)));
        const vCol = new THREE.Color();
        if (normDisp >= 0) vCol.copy(colZero).lerp(colPeak, normDisp);
        else vCol.copy(colZero).lerp(colTrough, -normDisp);
        colorAttr.setXYZ(i, vCol.r, vCol.g, vCol.b);
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      this.geoS.computeVertexNormals();
    }

    // 2. Update p-mode membrane: u(r, phi, t) = A * J1(k11 * r / R) * cos(phi) * cos(omega * t)
    if (this.groupP.visible && this.geoP) {
      const posAttr = this.geoP.attributes.position;
      const colorAttr = this.geoP.attributes.color;
      const zeroK = BESSEL_J1_ZEROS[0]; // first zero of J1 ~ 3.83
      const timeFactor = Math.cos(omega * t);

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const r = Math.sqrt(vx * vx + vz * vz);
        const phi = Math.atan2(vz, vx);
        const besselArg = zeroK * Math.min(1.0, r / R);
        const dispY = A * 1.25 * besselJ1(besselArg) * Math.cos(phi) * timeFactor;
        posAttr.setY(i, dispY);

        const normDisp = Math.max(-1.0, Math.min(1.0, dispY / (A || 1.0)));
        const vCol = new THREE.Color();
        if (normDisp >= 0) vCol.copy(colZero).lerp(colPeak, normDisp);
        else vCol.copy(colZero).lerp(colTrough, -normDisp);
        colorAttr.setXYZ(i, vCol.r, vCol.g, vCol.b);
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      this.geoP.computeVertexNormals();
    }

    // 3. Update Real m-mode membrane (m = 2 quadrupole): u(r, phi, t) = A * J2(k21 * r / R) * cos(2*phi) * cos(omega * t)
    if (this.groupMReal.visible && this.geoMReal) {
      const posAttr = this.geoMReal.attributes.position;
      const colorAttr = this.geoMReal.attributes.color;
      const zeroK = BESSEL_J2_ZEROS[0]; // first zero of J2 ~ 5.136
      const timeFactor = Math.cos(omega * t);

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const r = Math.sqrt(vx * vx + vz * vz);
        const phi = Math.atan2(vz, vx);
        const besselArg = zeroK * Math.min(1.0, r / R);
        const dispY = A * 1.4 * besselJ2(besselArg) * Math.cos(2 * phi) * timeFactor;
        posAttr.setY(i, dispY);

        const normDisp = Math.max(-1.0, Math.min(1.0, dispY / (A || 1.0)));
        const vCol = new THREE.Color();
        if (normDisp >= 0) vCol.copy(colZero).lerp(colPeak, normDisp);
        else vCol.copy(colZero).lerp(colTrough, -normDisp);
        colorAttr.setXYZ(i, vCol.r, vCol.g, vCol.b);
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      this.geoMReal.computeVertexNormals();
    }

    // 4. Update Complex m-mode membrane (traveling wave): u(r, phi, t) = A * J1(k11 * r / R) * cos(phi - omega * t)
    if (this.groupMComplex.visible && this.geoMComplex) {
      const posAttr = this.geoMComplex.attributes.position;
      const colorAttr = this.geoMComplex.attributes.color;
      const zeroK = BESSEL_J1_ZEROS[0];
      const tempColor = new THREE.Color();

      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const vz = posAttr.getZ(i);
        const r = Math.sqrt(vx * vx + vz * vz);
        const phi = Math.atan2(vz, vx);
        const wavePhase = phi - omega * t;
        const besselArg = zeroK * Math.min(1.0, r / R);
        const dispY = A * 1.25 * besselJ1(besselArg) * Math.cos(wavePhase);
        posAttr.setY(i, dispY);

        // Rotating color phase around 2*PI
        const hue = ((wavePhase / (Math.PI * 2)) % 1.0 + 1.0) % 1.0;
        tempColor.setHSL(hue, 0.85, 0.55);
        colorAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      this.geoMComplex.computeVertexNormals();
    }
  }

  onParametersChanged(params) {
    if (params.modeIndex !== undefined || params.radius !== undefined || params.yOffset !== undefined) {
      this.rebuildAll();
    }
    if (params.showS !== undefined || params.showP !== undefined ||
        params.showMReal !== undefined || params.showMComplex !== undefined) {
      this.setSublayerVisibility(params);
    }
    if (params.wireframe !== undefined) {
      this.materials.forEach(m => {
        if (m.wireframe !== undefined) m.wireframe = params.wireframe;
      });
    }
    if (params.opacity !== undefined) {
      this.parameters.opacity = params.opacity;
      this.materials.forEach(m => {
        if (m.opacity !== undefined) m.opacity = params.opacity;
      });
    }
  }

  dispose() {
    super.dispose();
    this.materials.forEach(m => m.dispose());
    this.materials = [];
  }
}
