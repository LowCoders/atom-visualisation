import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SyncEngine } from './SyncEngine.js';
import { CAMERA_PRESETS } from '../config/cameras.js';

/**
 * Core Engine: Manages the WebGL rendering context, camera, lighting,
 * orbit controls, frame loop, and coordinates the SyncEngine.
 */
export class Engine {
  /**
   * @param {HTMLElement} container - DOM container element for the WebGL canvas
   * @param {Object} [options={}]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.syncEngine = new SyncEngine(options.syncOptions || {});

    this.clock = new THREE.Clock();
    this.animationFrameId = null;
    this.isRunning = false;

    this.defaultCamPosition = new THREE.Vector3(0, 7, 22);
    this.defaultCamTarget = new THREE.Vector3(0, 0, 0);

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x04060d, 0.015);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.copy(this.defaultCamPosition);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.container.appendChild(this.renderer.domElement);

    // 4. Orbit Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 120;
    this.controls.minDistance = 2.0;
    this.controls.target.copy(this.defaultCamTarget);

    // 5. Lighting
    this.setupLighting();

    // 6. Resize listener
    this._onResize = this.onWindowResize.bind(this);
    window.addEventListener('resize', this._onResize);
  }

  setupLighting() {
    // Ambient soft base
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambientLight);

    // Key cyan accent light
    const keyLight = new THREE.PointLight(0x38bdf8, 2.2, 80);
    keyLight.position.set(12, 16, 14);
    this.scene.add(keyLight);

    // Warm amber fill light
    const fillLight = new THREE.PointLight(0xf59e0b, 1.8, 80);
    fillLight.position.set(-14, 10, -10);
    this.scene.add(fillLight);

    // Magenta bottom rim light (illuminates vacuum well and nucleon contours)
    const rimLight = new THREE.PointLight(0xf43f5e, 1.4, 60);
    rimLight.position.set(0, -8, 8);
    this.scene.add(rimLight);
  }

  onWindowResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * Starts the animation / render loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    const loop = () => {
      if (!this.isRunning) return;
      this.animationFrameId = requestAnimationFrame(loop);

      const rawDt = this.clock.getDelta();
      // Step simulation clock and components
      this.syncEngine.update(rawDt);

      if (this.onFrame) {
        this.onFrame(rawDt);
      }

      // Update camera damping
      if (this.controls) {
        this.controls.update();
      }

      // Render
      this.renderer.render(this.scene, this.camera);
    };

    loop();
  }

  /**
   * Pauses the render loop.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Register a component into the scene and sync engine.
   * @param {import('./VisualComponent.js').VisualComponent} component
   */
  addComponent(component) {
    component.init(this.scene, this.syncEngine);
    this.syncEngine.registerComponent(component);
  }

  /**
   * Remove a component.
   * @param {import('./VisualComponent.js').VisualComponent} component
   */
  removeComponent(component) {
    this.syncEngine.unregisterComponent(component.id);
    component.dispose();
  }

  /**
   * Camera position presets.
   * @param {'perspective'|'total'|'top'|'side'|'front'|'orbital'} preset
   */
  setCameraPreset(preset) {
    const cfg = CAMERA_PRESETS[preset] || CAMERA_PRESETS.perspective;
    this.camera.position.set(cfg.position.x, cfg.position.y, cfg.position.z);

    if (this.controls) {
      this.controls.target.set(cfg.target.x, cfg.target.y, cfg.target.z);
      this.controls.update();
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }
}
