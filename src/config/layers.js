/**
 * Central Layer and Dependency Configuration
 * Declarative single source of truth for all layers, groups, presets, and dependencies.
 */

export const LAYER_GROUPS = [
  {
    id: 'nucleus',
    order: 1,
    i18nKey: 'controlPanel.layerGroupNucleus'
  },
  {
    id: 'shells',
    order: 2,
    i18nKey: 'controlPanel.layerGroupShells'
  },
  {
    id: 'interactions',
    order: 4,
    i18nKey: 'controlPanel.layerGroupInteractions'
  },
  {
    id: 'wormhole',
    order: 5,
    i18nKey: 'controlPanel.layerGroupWormhole'
  },
  {
    id: 'vacuum',
    order: 6,
    i18nKey: 'controlPanel.layerGroupVacuum'
  },
  {
    id: 'janus',
    order: 7,
    i18nKey: 'controlPanel.layerGroupJanus'
  },
  {
    id: 'membranes',
    order: 8,
    i18nKey: 'controlPanel.layerGroupMembranes'
  },
];

export const LAYER_DEFINITIONS = [
  // Shells & Wavefunctions
  {
    id: 'electrons',
    group: 'shells',
    checkboxId: 'chk-layer-electrons',
    i18nKey: 'controlPanel.layers.electrons',
    container: 'electrons',
    default: true
  },
  {
    id: 'tracks',
    group: 'shells',
    checkboxId: 'chk-layer-tracks',
    i18nKey: 'controlPanel.layers.tracks',
    container: 'electrons',
    dependsOn: ['electrons'],
    default: true
  },
  {
    id: 'cloud',
    group: 'shells',
    checkboxId: 'chk-layer-cloud',
    i18nKey: 'controlPanel.layers.cloud',
    container: 'cloud',
    default: false
  },
  {
    id: 'slice',
    group: 'shells',
    checkboxId: 'chk-layer-slice',
    i18nKey: 'controlPanel.layers.slice',
    container: 'slice',
    default: false
  },
  {
    id: 'shapesReal',
    group: 'shells',
    checkboxId: 'chk-layer-shapes-real',
    i18nKey: 'controlPanel.layers.shapesReal',
    container: 'shapes',
    default: false
  },
  {
    id: 'shapesComplex',
    group: 'shells',
    checkboxId: 'chk-layer-shapes-complex',
    i18nKey: 'controlPanel.layers.shapesComplex',
    container: 'shapes',
    default: false
  },
  {
    id: 'nodalSurfaces',
    group: 'shells',
    checkboxId: 'chk-layer-nodal',
    i18nKey: 'controlPanel.layers.nodal',
    container: 'shapes',
    default: false
  },
  {
    id: 'nodalPanels',
    group: 'shells',
    checkboxId: 'chk-layer-nodal-panels',
    i18nKey: 'controlPanel.layers.nodalPanels',
    container: 'shapes',
    default: false
  },
  {
    id: 'spinDoubleCover',
    group: 'shells',
    checkboxId: 'chk-layer-spin-double-cover',
    i18nKey: 'controlPanel.layers.spinDoubleCover',
    container: 'shapes',
    default: false
  },
  {
    id: 'vortexRings',
    group: 'shells',
    checkboxId: 'chk-layer-vortex-rings',
    i18nKey: 'controlPanel.layers.vortexRings',
    container: 'shapes',
    default: false
  },

  // Membrane Surfaces
  {
    id: 'drum',
    group: 'membranes',
    checkboxId: 'chk-layer-drum',
    i18nKey: 'controlPanel.layers.drum',
    container: 'drum',
    default: false
  },
  {
    id: 'membraneP',
    group: 'membranes',
    checkboxId: 'chk-layer-membrane-p',
    i18nKey: 'controlPanel.layers.membraneP',
    container: 'drum',
    default: false
  },
  {
    id: 'membraneMReal',
    group: 'membranes',
    checkboxId: 'chk-layer-membrane-m-real',
    i18nKey: 'controlPanel.layers.membraneMReal',
    container: 'drum',
    default: false
  },
  {
    id: 'membraneMComplex',
    group: 'membranes',
    checkboxId: 'chk-layer-membrane-m-complex',
    i18nKey: 'controlPanel.layers.membraneMComplex',
    container: 'drum',
    default: false
  },

  // Nucleus
  {
    id: 'shell',
    group: 'nucleus',
    checkboxId: 'chk-layer-shell',
    i18nKey: 'controlPanel.layers.shell',
    container: 'nucleus',
    default: false
  },
  {
    id: 'nucleons',
    group: 'nucleus',
    checkboxId: 'chk-layer-nucleons',
    i18nKey: 'controlPanel.layers.nucleons',
    container: 'nucleus',
    default: true
  },
  {
    id: 'nucInterior',
    group: 'nucleus',
    checkboxId: 'chk-layer-nuc-interior',
    i18nKey: 'controlPanel.layers.nucInterior',
    container: 'nucleus',
    dependsOn: ['nucleons'],
    default: false
  },
  {
    id: 'nucleusWire',
    group: 'nucleus',
    checkboxId: 'chk-layer-nucleus-wire',
    i18nKey: 'controlPanel.layers.nucleusWire',
    container: 'nucleus',
    default: true
  },
  {
    id: 'nucleonWire',
    group: 'nucleus',
    checkboxId: 'chk-layer-nucleon-wire',
    i18nKey: 'controlPanel.layers.nucleonWire',
    container: 'nucleus',
    dependsOn: ['nucleons'],
    default: false
  },

  // Interactions, Photons & Beams
  {
    id: 'beam',
    group: 'interactions',
    checkboxId: 'chk-layer-beam',
    i18nKey: 'controlPanel.layers.beam',
    container: 'externalBeam',
    default: false
  },
  {
    id: 'energyFlow',
    group: 'interactions',
    checkboxId: 'chk-layer-energy-flow',
    i18nKey: 'controlPanel.layers.energyFlow',
    container: 'energyFlow',
    default: false
  },
  {
    id: 'virtualPairs',
    group: 'interactions',
    checkboxId: 'chk-layer-virtual-pairs',
    i18nKey: 'controlPanel.layers.virtualPairs',
    container: 'energyFlow',
    default: false
  },

  // Wormhole & Throat
  {
    id: 'quarkThroat',
    group: 'wormhole',
    checkboxId: 'chk-layer-quark-throat',
    i18nKey: 'controlPanel.layers.quarkThroat',
    container: 'nucleus',
    default: false
  },
  {
    id: 'wormholeBridge',
    group: 'wormhole',
    checkboxId: 'chk-layer-wormhole-bridge',
    i18nKey: 'controlPanel.layers.wormholeBridge',
    container: 'projectedJanus',
    default: false
  },

  // Vacuum Structure & Spacetime
  {
    id: 'vacuum',
    group: 'vacuum',
    checkboxId: 'chk-layer-vacuum',
    i18nKey: 'controlPanel.layers.vacuum',
    container: 'vacuumSheet',
    default: true
  },
  {
    id: 'vacuumWire',
    group: 'vacuum',
    checkboxId: 'chk-vacuum-wire',
    i18nKey: 'controlPanel.layers.vacuumWire',
    container: 'vacuumSheet',
    default: true
  },

  // Janus Mirror World
  {
    id: 'janusSheet',
    group: 'janus',
    checkboxId: 'chk-layer-janus-sheet',
    i18nKey: 'controlPanel.layers.janusSheet',
    container: 'projectedJanus',
    default: false
  },
  {
    id: 'janusAntiproton',
    group: 'janus',
    checkboxId: 'chk-layer-janus-antiproton',
    i18nKey: 'controlPanel.layers.janusAntiproton',
    container: 'projectedJanus',
    default: false
  },
  {
    id: 'janusPositrons',
    group: 'janus',
    checkboxId: 'chk-layer-janus-positrons',
    i18nKey: 'controlPanel.layers.janusPositrons',
    container: 'projectedJanus',
    default: false
  }
];

export const LAYER_PRESETS = [
  {
    id: 'default',
    i18nKey: 'controlPanel.presetDefault',
    cameraPreset: 'perspective',
    autoLOD: false,
    activeLayers: ['electrons', 'tracks', 'nucleons', 'nucleusWire', 'beam', 'vacuum', 'vacuumWire']
  },
  {
    id: 'wavefunction',
    i18nKey: 'controlPanel.presetWavefunction',
    cameraPreset: 'side',
    autoLOD: true,
    activeLayers: ['electrons', 'tracks', 'cloud', 'beam', 'energyFlow', 'nucleons', 'vacuum', 'vacuumWire']
  },
  {
    id: 'wavefunctionWithJanus',
    i18nKey: 'controlPanel.presetWavefunctionJanus',
    cameraPreset: 'side',
    autoLOD: true,
    activeLayers: [
      'electrons',
      'tracks',
      'cloud',
      'beam',
      'energyFlow',
      'virtualPairs',
      'nucleons',
      'vacuum',
      'vacuumWire',
      'wormholeBridge',
      'janusSheet',
      'janusAntiproton',
      'janusPositrons'
    ]
  },
  {
    id: 'shapes',
    i18nKey: 'controlPanel.presetShapes',
    cameraPreset: 'perspective',
    autoLOD: false,
    activeLayers: ['shapesReal', 'nodalPanels', 'tracks', 'nucleons', 'vacuum', 'beam', 'vacuumWire']
  },
  {
    id: 'hydrogen421',
    i18nKey: 'controlPanel.presetHydrogen421',
    cameraPreset: 'perspective',
    autoLOD: false,
    orbitalState: { n: 4, l: 2, m: 1 },
    cutawayAngle: Math.PI / 2,
    activeLayers: [
      'shapesComplex',
      'vortexRings',
      'nodalSurfaces',
      'vacuum',
      'vacuumWire',
      'nucleons'
    ]
  },
  {
    id: 'toponium',
    i18nKey: 'controlPanel.presetToponium',
    cameraPreset: 'orbital',
    autoLOD: false,
    orbitalState: { n: 2, l: 1, m: 1, ms: 0.5 },
    activeLayers: [
      'tracks',
      'electrons',
      'vortexRings',
      'nodalPanels',
      'nucleons',
      'vacuum',
      'vacuumWire'
    ]
  },
  {
    id: 'electrons',
    i18nKey: 'controlPanel.presetElectrons',
    cameraPreset: 'orbital',
    autoLOD: false,
    activeLayers: ['electrons', 'tracks', 'nucleons', 'beam', 'vacuum', 'vacuumWire']
  },
  {
    id: 'nucleusHierarchy',
    i18nKey: 'controlPanel.presetNucleus',
    cameraPreset: 'side',
    autoLOD: false,
    activeLayers: ['shell', 'nucleons', 'nucInterior', 'nucleusWire', 'nucleonWire', 'quarkThroat', 'beam']
  },
  {
    id: 'wormholeJanus',
    i18nKey: 'controlPanel.presetJanus',
    cameraPreset: 'total',
    autoLOD: false,
    activeLayers: [
      'wormholeBridge',
      'vacuum',
      'vacuumWire',
      'janusSheet',
      'janusAntiproton',
      'janusPositrons',
      'virtualPairs',
      'energyFlow',
      'beam'
    ]
  },
  {
    id: 'wireframes',
    i18nKey: 'controlPanel.presetWireframes',
    cameraPreset: 'perspective',
    autoLOD: false,
    activeLayers: ['tracks', 'nucleusWire', 'nucleonWire', 'vacuumWire', 'wormholeBridge', 'beam']
  },
  {
    id: 'minimal',
    i18nKey: 'controlPanel.presetMinimal',
    cameraPreset: 'perspective',
    autoLOD: false,
    activeLayers: ['electrons', 'nucleons', 'beam']
  },
  {
    id: 'totalStructure',
    i18nKey: 'controlPanel.presetTotalStructure',
    cameraPreset: 'total',
    autoLOD: false,
    activeLayers: LAYER_DEFINITIONS
      .filter(def => def.group !== 'membranes' && !['shapesReal', 'shapesComplex', 'nodalSurfaces', 'nodalPanels', 'spinDoubleCover', 'vortexRings', 'slice'].includes(def.id))
      .map(def => def.id)
  },
  {
    id: 'all',
    i18nKey: 'controlPanel.presetAll',
    cameraPreset: 'perspective',
    autoLOD: false,
    activeLayers: LAYER_DEFINITIONS.map(def => def.id)
  }
];

/**
 * Returns the default boolean map for all layers based on definitions.
 * @returns {Record<string, boolean>}
 */
export function getDefaultLayerState() {
  const state = { autoLOD: false };
  for (const def of LAYER_DEFINITIONS) {
    state[def.id] = !!def.default;
  }
  return state;
}

/**
 * Generates an exact boolean map for a named preset.
 * @param {string} presetId
 * @returns {Record<string, boolean>|null}
 */
export function getPresetLayerState(presetId) {
  const preset = LAYER_PRESETS.find(p => p.id === presetId);
  if (!preset) return null;

  const state = { autoLOD: !!preset.autoLOD };
  const activeSet = new Set(preset.activeLayers);

  for (const def of LAYER_DEFINITIONS) {
    state[def.id] = activeSet.has(def.id);
  }

  return state;
}

/**
 * Resolves layer dependencies when toggling a layer.
 * E.g., if tracks is turned on, electrons must be turned on.
 * If nucleons is turned off, nucInterior and nucleonWire must be turned off.
 *
 * @param {string} layerId
 * @param {boolean} visible
 * @param {Record<string, boolean>} currentLayers
 * @returns {Record<string, boolean>} Map of changed layer states (including layerId itself)
 */
export function resolveLayerDependencies(layerId, visible, currentLayers = {}) {
  const changes = { [layerId]: visible };

  if (visible) {
    // If turning on, ensure prerequisite dependencies are turned on
    const def = LAYER_DEFINITIONS.find(d => d.id === layerId);
    if (def && def.dependsOn) {
      for (const depId of def.dependsOn) {
        if (!currentLayers[depId]) {
          changes[depId] = true;
        }
      }
    }
  } else {
    // If turning off, turn off any layers that depend on this layer
    for (const def of LAYER_DEFINITIONS) {
      if (def.dependsOn && def.dependsOn.includes(layerId)) {
        if (currentLayers[def.id] || changes[def.id]) {
          changes[def.id] = false;
        }
      }
    }
  }

  return changes;
}

/**
 * Determines which high-level 3D container components must be active
 * based on current layer states.
 *
 * @param {Record<string, boolean>} layers
 * @returns {Record<string, boolean>}
 */
export function resolveContainerVisibilities(layers = {}) {
  return {
    nucleus: !!(
      layers.shell ||
      layers.nucleons ||
      layers.nucInterior ||
      layers.quarkThroat ||
      layers.nucleusWire ||
      layers.nucleonWire
    ),
    shapes: !!(
      layers.shapesReal ||
      layers.shapesComplex ||
      layers.nodalSurfaces ||
      layers.nodalPanels ||
      layers.spinDoubleCover ||
      layers.vortexRings
    ),
    drum: !!(layers.drum || layers.membraneP || layers.membraneMReal || layers.membraneMComplex),
    projectedJanus: !!(
      layers.wormholeBridge ||
      layers.janusSheet ||
      layers.janusAntiproton ||
      layers.janusPositrons ||
      layers.janusProjected
    ),
    energyFlow: !!(layers.energyFlow || layers.virtualPairs),
    externalBeam: !!layers.beam,
    vacuumSheet: !!(layers.vacuum || layers.vacuumWire),
    cloud: !!layers.cloud,
    slice: !!layers.slice,
    electrons: !!layers.electrons
  };
}
