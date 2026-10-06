import { EventEmitter } from './EventEmitter.js';

/**
 * SyncEngine: Global simulation clock, harmonic phase tracker, and event bus.
 * Synchronizes the motion, phase relationships, and state between distinct visual components.
 */
export class SyncEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.simTime = 0.0;
    this.deltaTime = 0.0;
    this.timeScale = options.timeScale !== undefined ? options.timeScale : 1.0;
    this.isPaused = !!options.paused;

    // Harmonic phase trackers (radians)
    this.baseFrequency = options.baseFrequency || 2.0; // rad/s
    this.quantumPhase = 0.0;     // General quantum de Broglie phase
    this.nucleusPhase = 0.0;     // Nuclear spin & meson exchange phase
    this.vacuumPhase = 0.0;      // Vacuum ZPE pulsation phase
    this.drumPhase = 0.0;        // Membrane harmonic oscillation phase

    // Phase speeds
    this.speedNucleus = 1.6;
    this.speedVacuum = 1.5;
    this.speedDrum = 3.2;

    // Registered components
    this.components = new Map();
  }

  /**
   * Register a VisualComponent for synchronized frame updates.
   * @param {import('./VisualComponent.js').VisualComponent} component
   */
  registerComponent(component) {
    if (!component || !component.id) return;
    this.components.set(component.id, component);
  }

  /**
   * Unregister a VisualComponent.
   * @param {string} componentId
   */
  unregisterComponent(componentId) {
    this.components.delete(componentId);
  }

  /**
   * Advance the simulation clock and synchronize all components.
   * @param {number} rawDeltaTime - Seconds elapsed since previous frame
   */
  update(rawDeltaTime) {
    if (this.isPaused) {
      this.deltaTime = 0;
      return;
    }

    // Clamp delta time to avoid large jumps on tab switch / lag spikes
    const clampedDt = Math.min(rawDeltaTime, 0.1);
    this.deltaTime = clampedDt * this.timeScale;
    this.simTime += this.deltaTime;

    // Update harmonic phases smoothly
    this.quantumPhase = (this.quantumPhase + this.deltaTime * this.baseFrequency) % (Math.PI * 2000);
    this.nucleusPhase = (this.nucleusPhase + this.deltaTime * this.speedNucleus) % (Math.PI * 2000);
    this.vacuumPhase  = (this.vacuumPhase  + this.deltaTime * this.speedVacuum)  % (Math.PI * 2000);
    this.drumPhase    = (this.drumPhase    + this.deltaTime * this.speedDrum)    % (Math.PI * 2000);

    // Synchronize all registered components
    for (const component of this.components.values()) {
      component.update(this.simTime, this.deltaTime, this);
    }

    this.emit('tick', {
      simTime: this.simTime,
      deltaTime: this.deltaTime,
      quantumPhase: this.quantumPhase,
      nucleusPhase: this.nucleusPhase,
      vacuumPhase: this.vacuumPhase,
      drumPhase: this.drumPhase
    });
  }

  /**
   * Sets the time scale multiplier.
   * @param {number} scale
   */
  setTimeScale(scale) {
    this.timeScale = Math.max(0, scale);
    this.emit('timeScaleChange', this.timeScale);
  }

  /**
   * Toggle pause/resume.
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    this.emit('pauseChange', this.isPaused);
    return this.isPaused;
  }

  setPaused(paused) {
    this.isPaused = !!paused;
    this.emit('pauseChange', this.isPaused);
  }

  resetTime() {
    this.simTime = 0.0;
    this.quantumPhase = 0.0;
    this.nucleusPhase = 0.0;
    this.vacuumPhase = 0.0;
    this.drumPhase = 0.0;
    this.emit('timeReset', { simTime: 0 });
  }
}
