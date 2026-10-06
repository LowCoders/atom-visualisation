/**
 * StorageManager: Centralized LocalStorage persistence manager for the Quantum Visualisation.
 * Saves and restores:
 * - Layer configurations (all 3D components and wireframe toggles)
 * - Panel state (collapsed/visible state and individual accordion section states)
 * - Playback and simulation state (selected Z, orbital state, speed, pause, color modes, Debye-Waller)
 * Features:
 * - 300 ms debounced saves to prevent disk/quota thrashing
 * - Schema validation and safe fallbacks against corrupted data or private browsing exceptions
 */

import { APP_CONFIG } from '../config.js';
import { getDefaultLayerState } from '../config/layers.js';

export const STORAGE_KEY = 'quantum_vis_state_v1';

export const DEFAULT_APP_STATE = {
  version: 2,
  settings: {
    language: APP_CONFIG.defaultLanguage || 'en',
    fontSize: APP_CONFIG.defaultFontSize || 'medium' // 'small' | 'medium' | 'large'
  },
  playback: {
    Z: 2,
    selectedOrbital: { n: 1, l: 0, m: 0, ms: 0.5 },
    su2Angle: 0,
    preset: 'default',
    isPaused: false,
    timeScale: 1.0,
    currentLevel: 'atom',
    arrangement: 'single',
    drumModeIndex: 2,
    flowSpeed: 1.6,
    dipDepth: 3.2,
    vacuumColorMode: 'depth',
    vacuumWire: true,
    fDebyeWaller: 0.0
  },
  layers: getDefaultLayerState(),
  panels: {
    controlPanel: {
      isCollapsed: false,
      isVisible: true,
      accordions: {}
    },
    displayPanel: {
      isCollapsed: false,
      isVisible: true,
      accordions: {
        'sec-tele-entropy': true,
        'sec-tele-process': true,
        'sec-tele-curvature': true,
        'sec-tele-element': false,
        'sec-tele-quantum': true,
        'sec-tele-scales': true
      }
    }
  }
};

export class StorageManager {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.state = this.load();
    this.saveTimeout = null;
    this.debounceMs = 300;
  }

  /**
   * Loads state from localStorage with safe fallback to DEFAULT_APP_STATE.
   * @returns {Object}
   */
  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
      }
      const parsed = JSON.parse(raw);
      return this.mergeWithDefaults(parsed);
    } catch (err) {
      console.warn('[StorageManager] Failed to read localStorage, using defaults:', err);
      return JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
    }
  }

  /**
   * Deep merges loaded state with defaults to ensure all fields and new toggles exist.
   */
  mergeWithDefaults(loaded) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
    if (!loaded || typeof loaded !== 'object') return merged;

    if (!loaded.version || loaded.version < 2) {
      if (loaded.settings && typeof loaded.settings === 'object') {
        Object.assign(merged.settings, loaded.settings);
      }
      if (loaded.panels && typeof loaded.panels === 'object') {
        Object.assign(merged.panels, loaded.panels);
      }
      return merged;
    }

    if (loaded.settings && typeof loaded.settings === 'object') {
      Object.assign(merged.settings, loaded.settings);
    }
    if (loaded.playback && typeof loaded.playback === 'object') {
      Object.assign(merged.playback, loaded.playback);
    }
    if (loaded.layers && typeof loaded.layers === 'object') {
      Object.assign(merged.layers, loaded.layers);
    }
    if (loaded.panels && typeof loaded.panels === 'object') {
      if (loaded.panels.controlPanel) {
        Object.assign(merged.panels.controlPanel, loaded.panels.controlPanel);
      }
      if (loaded.panels.displayPanel) {
        Object.assign(merged.panels.displayPanel, loaded.panels.displayPanel);
      }
    }
    return merged;
  }

  /**
   * Updates state partially and triggers a debounced save.
   * @param {Object} partialState
   */
  update(partialState = {}) {
    if (partialState.settings) {
      if (!this.state.settings) this.state.settings = {};
      Object.assign(this.state.settings, partialState.settings);
    }
    if (partialState.playback) {
      Object.assign(this.state.playback, partialState.playback);
    }
    if (partialState.layers) {
      Object.assign(this.state.layers, partialState.layers);
    }
    if (partialState.panels) {
      if (partialState.panels.controlPanel) {
        Object.assign(this.state.panels.controlPanel, partialState.panels.controlPanel);
      }
      if (partialState.panels.displayPanel) {
        Object.assign(this.state.panels.displayPanel, partialState.panels.displayPanel);
      }
    }

    this.scheduleSave();
  }

  /**
   * Schedules a debounced save to localStorage.
   */
  scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate();
    }, this.debounceMs);
  }

  /**
   * Immediately commits state to localStorage.
   */
  saveImmediate() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (err) {
      console.warn('[StorageManager] Failed to write localStorage:', err);
    }
  }

  /**
   * Clears saved state and resets to default.
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      this.state = JSON.parse(JSON.stringify(DEFAULT_APP_STATE));
    } catch (err) {
      console.warn('[StorageManager] Failed to clear localStorage:', err);
    }
  }

  getState() {
    return this.state;
  }
}
