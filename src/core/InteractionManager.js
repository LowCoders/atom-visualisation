import * as THREE from 'three';

/**
 * InteractionManager: Raycaster-based 3D scene interaction system.
 * Handles hovering, cursor updates, and click selection on interactive objects.
 */
export class InteractionManager {
  /**
   * @param {THREE.Camera} camera
   * @param {HTMLElement} domElement
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);

    this.interactiveObjects = []; // Array<{ mesh: THREE.Object3D, type: string, data: any }>
    this.hoveredItem = null;
    this.listeners = {
      click: [],
      hover: []
    };

    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerDown = this.onPointerDown.bind(this);

    this.domElement.addEventListener('pointermove', this._onPointerMove);
    this.domElement.addEventListener('pointerdown', this._onPointerDown);
  }

  /**
   * Register an interactive 3D object.
   * @param {THREE.Object3D} mesh
   * @param {string} type - 'nucleon' | 'quark' | 'wormhole' | 'janus'
   * @param {Object} data - Context data
   */
  register(mesh, type, data = {}) {
    mesh.userData = {
      ...mesh.userData,
      interactiveType: type,
      interactiveData: data
    };
    this.interactiveObjects.push(mesh);
  }

  /**
   * Unregister an interactive 3D object or clear all.
   * @param {THREE.Object3D} [mesh]
   */
  unregister(mesh) {
    if (!mesh) {
      this.interactiveObjects = [];
      return;
    }
    const idx = this.interactiveObjects.indexOf(mesh);
    if (idx !== -1) {
      this.interactiveObjects.splice(idx, 1);
    }
  }

  clear() {
    this.interactiveObjects = [];
    if (this.hoveredItem) {
      this.setHoverState(this.hoveredItem, false);
      this.hoveredItem = null;
    }
  }

  onPointerMove(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover();
  }

  checkHover() {
    if (this.interactiveObjects.length === 0) {
      if (this.hoveredItem) {
        this.setHoverState(this.hoveredItem, false);
        this.hoveredItem = null;
        this.domElement.style.cursor = 'default';
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      // Find outermost ancestor registered in interactiveObjects
      let targetMesh = intersects[0].object;
      while (targetMesh && !targetMesh.userData.interactiveType && targetMesh.parent) {
        targetMesh = targetMesh.parent;
      }

      if (targetMesh && targetMesh.userData.interactiveType) {
        if (this.hoveredItem !== targetMesh) {
          if (this.hoveredItem) this.setHoverState(this.hoveredItem, false);
          this.hoveredItem = targetMesh;
          this.setHoverState(this.hoveredItem, true);
          this.domElement.style.cursor = 'pointer';
          this.emit('hover', { mesh: targetMesh, data: targetMesh.userData });
        }
        return;
      }
    }

    if (this.hoveredItem) {
      this.setHoverState(this.hoveredItem, false);
      this.hoveredItem = null;
      this.domElement.style.cursor = 'default';
      this.emit('hover', null);
    }
  }

  setHoverState(mesh, isHovered) {
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => this._applyHoverMaterial(m, isHovered));
      } else {
        this._applyHoverMaterial(mesh.material, isHovered);
      }
    }
  }

  _applyHoverMaterial(mat, isHovered) {
    if (mat.emissive) {
      if (!mat.userData.origEmissiveIntensity) {
        mat.userData.origEmissiveIntensity = mat.emissiveIntensity || 0.2;
      }
      mat.emissiveIntensity = isHovered
        ? mat.userData.origEmissiveIntensity * 2.8 + 0.3
        : mat.userData.origEmissiveIntensity;
    }
  }

  onPointerDown(event) {
    if (event.button !== 0) return; // Left button only

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let targetMesh = intersects[0].object;
      while (targetMesh && !targetMesh.userData.interactiveType && targetMesh.parent) {
        targetMesh = targetMesh.parent;
      }

      if (targetMesh && targetMesh.userData.interactiveType) {
        this.emit('click', {
          mesh: targetMesh,
          type: targetMesh.userData.interactiveType,
          data: targetMesh.userData.interactiveData
        });
      }
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  dispose() {
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    this.clear();
  }
}
