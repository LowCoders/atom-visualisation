import * as THREE from 'three';
import { LEVEL_CAMERA_TARGETS } from '../config/cameras.js';
import { EventEmitter } from './EventEmitter.js';

export const LEVELS = {
  ATOM: 'atom',          // 1. Szint: Atomi méret
  NUCLEON: 'nucleon',    // 2. Szint: Nukleon belső folyamatok (uud / udd)
  QUARK: 'quark',        // 3. Szint: Kvark belseje, féregjárat és Heisenberg-fal
  JANUS: 'janus'         // Antianyag oldal: Janus-tükörvilág
};

/**
 * LevelManager: Coordinates the 3-level hierarchical zoom and Janus antimatter sector.
 * Manages active component visibility, camera transitions, and state history.
 */
export class LevelManager extends EventEmitter {
  /**
   * @param {import('./Engine.js').Engine} engine
   */
  constructor(engine) {
    super();
    this.engine = engine;
    this.currentLevel = LEVELS.ATOM;
    this.activeDetails = null; // e.g. { nucleonType: 'proton', quarkType: 'up' }
    this.history = [LEVELS.ATOM];

    this.currentLOD = 0;

    // Camera animation state
    this.isTransitioning = false;
    this.transitionTime = 0;
    this.transitionDuration = 1.1; // seconds
    this.camStartPos = new THREE.Vector3();
    this.camEndPos = new THREE.Vector3();
    this.targetStartPos = new THREE.Vector3();
    this.targetEndPos = new THREE.Vector3();

    // Registered level components
    this.components = {
      atom: null,
      energyFlow: null,
      vacuumSheet: null,
      nucleonInterior: null,
      quarkInterior: null,
      janusSector: null
    };
  }

  /**
   * Register components to be toggled by level.
   */
  registerComponents(components) {
    this.components = { ...this.components, ...components };
    this.updateVisibility();
  }

  /**
   * Switch to a specific level with optional context details.
   * @param {string} level - One of LEVELS
   * @param {Object} [details={}]
   * @param {boolean} [pushHistory=true]
   */
  setLevel(level, details = {}, pushHistory = true) {
    if (this.currentLevel === level && JSON.stringify(this.activeDetails) === JSON.stringify(details)) {
      return;
    }

    const prevLevel = this.currentLevel;
    this.currentLevel = level;
    this.activeDetails = details;

    if (pushHistory) {
      this.history.push(level);
    }

    // Set target camera setups for the new level
    this.planCameraTransition(level);

    // Update component visibility and internal data
    this.updateVisibility();

    // Notify listeners (UI Breadcrumb, Telemetry, Controls)
    this.emit('levelChange', {
      level: this.currentLevel,
      prevLevel,
      details: this.activeDetails,
      canGoBack: this.history.length > 1
    });
  }

  /**
   * Navigate one level back in history.
   */
  goBack() {
    if (this.history.length > 1) {
      this.history.pop(); // Pop current
      const prev = this.history[this.history.length - 1];
      this.setLevel(prev, {}, false);
    }
  }

  /**
   * Return directly to the root Atom level.
   */
  goToRoot() {
    this.history = [LEVELS.ATOM];
    this.setLevel(LEVELS.ATOM, {}, false);
  }

  /**
   * Update component visibility based on active level.
   */
  updateVisibility() {
    const lvl = this.currentLevel;

    // Level 1: Atom + Energy Flow + Vacuum + External Beam
    const showLvl1 = (lvl === LEVELS.ATOM);
    if (this.components.atom) this.components.atom.setVisible(showLvl1);
    if (this.components.energyFlow) {
      const efParams = this.components.energyFlow.parameters || {};
      const efVisible = !!(efParams.showPhotons || efParams.showVirtualPairs);
      this.components.energyFlow.setVisible(showLvl1 && efVisible);
    }
    if (this.components.vacuumSheet) {
      const vsParams = this.components.vacuumSheet.parameters || {};
      const vsVisible = !!(vsParams.showSurface || vsParams.showWireframe);
      this.components.vacuumSheet.setVisible(showLvl1 && vsVisible);
    }
    if (this.components.externalBeam) {
      const ebParams = this.components.externalBeam.parameters || {};
      const ebVisible = ebParams.showBeam !== undefined ? !!ebParams.showBeam : this.components.externalBeam.visible;
      this.components.externalBeam.setVisible(showLvl1 && ebVisible);
    }

    // Level 2: Nucleon Interior
    const showLvl2 = (lvl === LEVELS.NUCLEON);
    if (this.components.nucleonInterior) {
      this.components.nucleonInterior.setVisible(showLvl2);
      if (showLvl2 && this.activeDetails) {
        this.components.nucleonInterior.setNucleonConfig(
          this.activeDetails.isProton !== undefined ? this.activeDetails.isProton : true
        );
      }
    }

    // Level 3: Quark Interior (Wormhole, Calabi-Yau, Heisenberg bounce)
    const showLvl3 = (lvl === LEVELS.QUARK);
    if (this.components.quarkInterior) {
      this.components.quarkInterior.setVisible(showLvl3);
      if (showLvl3 && this.activeDetails) {
        this.components.quarkInterior.setQuarkConfig(this.activeDetails);
      }
    }

    // Janus Antimatter Sector
    const showJanus = (lvl === LEVELS.JANUS);
    if (this.components.janusSector) {
      this.components.janusSector.setVisible(showJanus);
    }
  }

  /**
   * Setup smooth camera transition path.
   */
  planCameraTransition(level) {
    if (!this.engine || !this.engine.camera || !this.engine.controls) return;

    this.camStartPos.copy(this.engine.camera.position);
    this.targetStartPos.copy(this.engine.controls.target);

    const cfg = LEVEL_CAMERA_TARGETS[level] || LEVEL_CAMERA_TARGETS.atom;
    this.camEndPos.set(cfg.position.x, cfg.position.y, cfg.position.z);
    this.targetEndPos.set(cfg.target.x, cfg.target.y, cfg.target.z);

    this.transitionTime = 0;
    this.isTransitioning = true;
  }

  /**
   * Frame update for camera interpolation.
   */
  update(deltaTime) {
    if (this.isTransitioning) {
      this.transitionTime += deltaTime;
      const progress = Math.min(1.0, this.transitionTime / this.transitionDuration);

      // Smooth cubic easeInOut
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.engine.camera.position.lerpVectors(this.camStartPos, this.camEndPos, ease);
      this.engine.controls.target.lerpVectors(this.targetStartPos, this.targetEndPos, ease);
      this.engine.controls.update();

      if (progress >= 1.0) {
        this.isTransitioning = false;
      }
    }

    // Dynamic LOD calculation based on camera distance to atom/nucleus
    if (this.currentLevel === LEVELS.ATOM && this.components.atom && this.engine && this.engine.camera) {
      const camPos = this.engine.camera.position;
      const targetPos = (this.engine.controls && this.engine.controls.target)
        ? this.engine.controls.target
        : new THREE.Vector3(0, 0, 0);
      const dist = camPos.distanceTo(targetPos);

      let newLod = 0;
      if (dist <= 3.8) {
        newLod = 2; // Quark & Throat scale
      } else if (dist <= 9.5) {
        newLod = 1; // Nucleon scale
      } else {
        newLod = 0; // Macro atom
      }

      if (this.currentLOD !== newLod) {
        this.currentLOD = newLod;
        this.emit('lodChange', { lod: newLod, distance: dist });
      }

      if (this.components.atom.setLOD) {
        this.components.atom.setLOD(newLod, dist);
      }
    }
  }
}
