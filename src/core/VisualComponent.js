import * as THREE from 'three';

/**
 * Base class for all 3D visual components in the universal quantum visualisation system.
 * Provides uniform lifecycle methods: init, update, setParameters, setVisible, and dispose.
 */
export class VisualComponent {
  /**
   * @param {string} id - Unique identifier for the component
   * @param {Object} [options={}] - Configuration options
   */
  constructor(id, options = {}) {
    this.id = id;
    this.name = options.name || id;
    this.options = { ...options };
    this.parameters = { ...(options.parameters || {}) };

    // The root Three.js container for this component
    this.group = new THREE.Group();
    this.group.name = `Component_${this.id}`;

    this.scene = null;
    this.syncEngine = null;
    this.isInitialized = false;
    this.visible = options.visible !== undefined ? options.visible : true;
    this.group.visible = this.visible;
  }

  /**
   * Initializes the component and adds its group to the scene or parent container.
   * @param {THREE.Scene|THREE.Group} parentScene
   * @param {import('./SyncEngine.js').SyncEngine} syncEngine
   */
  init(parentScene, syncEngine) {
    this.scene = parentScene;
    this.syncEngine = syncEngine;

    if (this.scene && !this.scene.children.includes(this.group)) {
      this.scene.add(this.group);
    }

    this.build();
    this.isInitialized = true;
  }

  /**
   * Override this method in subclasses to build geometries, meshes, materials, and lights.
   */
  build() {
    // Subclasses implement their 3D hierarchy here
  }

  /**
   * Frame update called by the render loop.
   * @param {number} time - Total elapsed simulation time in seconds
   * @param {number} deltaTime - Delta time since last frame in seconds
   * @param {import('./SyncEngine.js').SyncEngine} syncEngine - The sync bus
   */
  update(time, deltaTime, syncEngine) {
    if (!this.visible || !this.isInitialized) return;
    this.onUpdate(time, deltaTime, syncEngine);
  }

  /**
   * Subclass-specific update logic.
   * @param {number} time
   * @param {number} deltaTime
   * @param {import('./SyncEngine.js').SyncEngine} syncEngine
   */
  onUpdate(time, deltaTime, syncEngine) {
    // Subclasses implement per-frame motion/deformation here
  }

  /**
   * Updates component parameters and triggers necessary re-computation.
   * @param {Object} params
   */
  setParameters(params = {}) {
    Object.assign(this.parameters, params);
    if (this.isInitialized) {
      this.onParametersChanged(this.parameters);
    }
  }

  /**
   * Hook for reacting to parameter modifications.
   * @param {Object} params
   */
  onParametersChanged(params) {
    // Subclasses handle parameter changes
  }

  /**
   * Toggles visibility of this component.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.visible = !!visible;
    this.group.visible = this.visible;
  }

  /**
   * Cleanly disposes of all geometries, materials, and textures attached to this group.
   * Crucial for zero-leak CPU & GPU memory management.
   */
  dispose() {
    if (this.scene) {
      this.scene.remove(this.group);
    }

    this.group.traverse((obj) => {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => this._disposeMaterial(mat));
        } else {
          this._disposeMaterial(obj.material);
        }
      }
    });

    this.isInitialized = false;
  }

  /**
   * @private
   */
  _disposeMaterial(mat) {
    if (!mat) return;
    Object.keys(mat).forEach((prop) => {
      if (mat[prop] && typeof mat[prop].dispose === 'function') {
        mat[prop].dispose();
      }
    });
    mat.dispose();
  }
}
