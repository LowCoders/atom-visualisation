import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import { evaluateWavefunctionCartesian, getWavefunctionColorRGB } from '../core/QuantumPhysics.js';

/**
 * DensitySlice: 2D/3D cross-sectional probability density plane.
 * Directly visualizes the Hydrogen Wave Function plots as seen in Image 1:
 * - High-resolution cross-section texture of |psi_{nlm}|^2
 * - Exact color gradient: deep space purple -> magenta -> hot orange -> white-hot core
 * - Explicitly displays radial and angular nodal lines as zero-probability black boundaries
 * - Centered at the atomic nucleus, can be toggled on/off independently
 */
export class DensitySlice extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'density-slice', options = {}) {
    super(id, {
      name: 'Hullámfüggvény Sűrűség-Metszet (1. kép)',
      ...options,
      parameters: {
        n: options.n || 2,
        l: options.l || 1,
        m: options.m !== undefined ? options.m : 0,
        plane: options.plane || 'xy', // 'xy' (vertical plane, standard front-view), 'yz' (side-view), 'xz' (horizontal)
        size: options.size || 16.0,
        opacity: options.opacity || 0.92,
        resolution: options.resolution || 256,
        doubleSided: true,
        ...options.parameters
      }
    });

    this.mesh = null;
    this.geometry = null;
    this.material = null;
    this.texture = null;
    this.canvas = null;
    this.ctx = null;
    this.borderLine = null;
  }

  build() {
    this.rebuildSlice();
  }

  rebuildSlice() {
    if (this.mesh) {
      this.group.remove(this.mesh);
      if (this.geometry) this.geometry.dispose();
      if (this.material) this.material.dispose();
      if (this.texture) this.texture.dispose();
      this.mesh = null;
    }
    if (this.borderLine) {
      this.group.remove(this.borderLine);
      this.borderLine.geometry.dispose();
      this.borderLine.material.dispose();
      this.borderLine = null;
    }

    const { n, l, m, plane, size, opacity, resolution } = this.parameters;

    // 1. Create off-screen canvas and render the 2D density plot
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
    }
    this.canvas.width = resolution;
    this.canvas.height = resolution;
    this.ctx = this.canvas.getContext('2d');

    this.renderDensityTexture(resolution);

    // 2. Texture & Material
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;

    this.geometry = new THREE.PlaneGeometry(size, size);

    // Rotate plane to match requested orientation
    if (plane === 'yz') {
      this.geometry.rotateY(Math.PI / 2);
    } else if (plane === 'xz') {
      this.geometry.rotateX(-Math.PI / 2);
    }
    // 'xy' is default (front facing, vertical Y and horizontal X)

    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.group.add(this.mesh);

    // 3. Subtle framing border
    const borderGeo = new THREE.EdgesGeometry(this.geometry);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x8c1d68,
      transparent: true,
      opacity: 0.45
    });
    this.borderLine = new THREE.LineSegments(borderGeo, borderMat);
    this.group.add(this.borderLine);
  }

  /**
   * Evaluates the quantum probability density on a 2D slice grid and writes pixels to the canvas.
   * Matches the visual representation of Image 1 ("Hydrogen Wave Function").
   */
  renderDensityTexture(res) {
    const imgData = this.ctx.createImageData(res, res);
    const data = imgData.data;
    const { n, l, m } = this.parameters;

    // Physical coordinate extent in Bohr radii: scale proportional to n^2
    const extent = 3.6 * Math.pow(n, 1.45) + 3.0;

    // First pass: find maximum probability density on this slice for auto-normalization
    let maxDensity = 0.0;
    const sampleStep = Math.max(1, Math.floor(res / 64));

    for (let py = 0; py < res; py += sampleStep) {
      const v = (1.0 - (py / res) * 2.0) * extent; // Y coordinate (vertical polar axis)
      for (let px = 0; px < res; px += sampleStep) {
        const u = ((px / res) * 2.0 - 1.0) * extent; // horizontal coordinate
        // Evaluation on cross-section plane (u, v, 0)
        const evalPt = evaluateWavefunctionCartesian(n, l, m, u, v, 0, 1.0);
        if (evalPt.probDensity > maxDensity) {
          maxDensity = evalPt.probDensity;
        }
      }
    }

    if (maxDensity <= 1e-12) maxDensity = 1.0;

    // Second pass: render pixels using Image 1 color palette
    let idx = 0;
    for (let py = 0; py < res; py++) {
      const yCoord = (1.0 - (py / (res - 1)) * 2.0) * extent;
      for (let px = 0; px < res; px++) {
        const xCoord = ((px / (res - 1)) * 2.0 - 1.0) * extent;

        const evalPt = evaluateWavefunctionCartesian(n, l, m, xCoord, yCoord, 0, 1.0);
        const normProb = Math.min(1.0, evalPt.probDensity / maxDensity);

        // Apply non-linear gamma curve to bring out faint outer shells and nodes clearly
        const gammaProb = Math.pow(normProb, 0.55);

        const col = getWavefunctionColorRGB(gammaProb);

        // Alpha falloff towards the outer boundary of the tile
        const rNorm = Math.sqrt(xCoord * xCoord + yCoord * yCoord) / extent;
        const outerFade = rNorm > 0.88 ? Math.max(0.0, 1.0 - (rNorm - 0.88) / 0.12) : 1.0;

        // If density is near zero, keep alpha translucent to let 3D objects behind show through
        const alpha = Math.min(1.0, (0.15 + 0.85 * gammaProb) * outerFade);

        data[idx]     = Math.floor(col.r * 255);
        data[idx + 1] = Math.floor(col.g * 255);
        data[idx + 2] = Math.floor(col.b * 255);
        data[idx + 3] = Math.floor(alpha * 255);

        idx += 4;
      }
    }

    this.ctx.putImageData(imgData, 0, 0);
  }

  onUpdate(time, deltaTime, syncEngine) {
    // DensitySlice is a static spatial wave function density plot; no per-frame recalculation needed
  }

  onParametersChanged(params) {
    if (params.n !== undefined || params.l !== undefined || params.m !== undefined ||
        params.plane !== undefined || params.size !== undefined) {
      this.rebuildSlice();
    }
    if (params.opacity !== undefined && this.material) {
      this.material.opacity = params.opacity;
    }
  }

  dispose() {
    super.dispose();
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
    this.mesh = null;
    this.borderLine = null;
  }
}
