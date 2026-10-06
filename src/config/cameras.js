/**
 * Camera View and Level Target Configurations
 * Centralized declarative positions and targets for 3D camera controls.
 */

export const CAMERA_PRESETS = {
  perspective: {
    position: { x: 0, y: 7, z: 22 },
    target: { x: 0, y: 0, z: 0 }
  },
  total: {
    position: { x: 22, y: -6, z: 26 },
    target: { x: 0, y: -9, z: 0 }
  },
  side: {
    position: { x: 28, y: 2, z: 0 },
    target: { x: 0, y: 0, z: 0 }
  },
  top: {
    position: { x: 0, y: 28, z: 0.001 },
    target: { x: 0, y: 0, z: 0 }
  },
  front: {
    position: { x: 0, y: 2, z: 28 },
    target: { x: 0, y: 0, z: 0 }
  },
  orbital: {
    position: { x: 16, y: 14, z: 18 },
    target: { x: 0, y: 0, z: 0 }
  }
};

export const LEVEL_CAMERA_TARGETS = {
  atom: {
    position: { x: 0, y: 7, z: 22 },
    target: { x: 0, y: 0, z: 0 }
  },
  nucleon: {
    position: { x: 0, y: 4, z: 13 },
    target: { x: 0, y: 0, z: 0 }
  },
  quark: {
    position: { x: 0, y: 3, z: 10 },
    target: { x: 0, y: 0, z: 0 }
  },
  janus: {
    position: { x: 0, y: -6, z: 20 },
    target: { x: 0, y: -3, z: 0 }
  }
};
