import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import { Nucleus } from './Nucleus.js';
import { OrbitalCloud } from './OrbitalCloud.js';
import { DensitySlice } from './DensitySlice.js';
import { OrbitalShapes } from './OrbitalShapes.js';
import { DrumModes } from './DrumModes.js';
import { ElectronSystem } from './ElectronSystem.js';
import { ProjectedJanusSystem } from './ProjectedJanusSystem.js';
import {
  ELEMENTS,
  getElement,
  buildElectronConfiguration,
  getOrbitalPhysicals,
  getElementValenceOrbital,
  getRepresentativeElementForOrbital,
  calculateSlaterZeff
} from '../core/QuantumPhysics.js';
import {
  getDefaultLayerState,
  getPresetLayerState,
  resolveContainerVisibilities
} from '../config/layers.js';

/**
 * Atom: Composite visual component orchestrating the complete atomic structure:
 * - Nucleus (protons, neutrons, valence quarks, embedded LOD interior, wormhole throat)
 * - OrbitalCloud (Born probability cloud |psi|^2 accurately matching Image 1)
 * - DensitySlice (2D/3D wave function cross-section plane matching Image 1)
 * - OrbitalShapes (Real spdf superpositions & complex m-eigenstates as independent layers)
 * - DrumModes (s-type membrane Bessel modes)
 * - ElectronSystem (quantized electron orbits, de Broglie waves, spin)
 * - ProjectedJanusSystem (embedded Janus antimatter sector r < 0, upward vacuum dome)
 *
 * Supports two-way bidirectional synchronization between chemical elements and orbital states!
 */
export class Atom extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   * @param {number} [options.Z=2] - Atomic number
   */
  constructor(id = 'atom', options = {}) {
    super(id, {
      name: 'Kvantum Atom',
      ...options,
      parameters: {
        Z: options.Z || 2,
        layers: {
          ...getDefaultLayerState(),
          ...(options.layers || {})
        },
        selectedOrbital: { n: 1, l: 0, m: 0, ...(options.selectedOrbital || {}) },
        shapesLayout: options.shapesLayout || 'center',
        drumModeIndex: options.drumModeIndex || 2,
        ...options.parameters
      }
    });

    this.nucleus = null;
    this.cloud = null;
    this.slice = null;
    this.shapes = null;
    this.drum = null;
    this.electrons = null;
    this.projectedJanus = null;
    this.baseOrbitRadius = 2.2;

    this.elementData = getElement(this.parameters.Z);
    this.configData = buildElectronConfiguration(this.parameters.Z);

    // If initial selectedOrbital is default, align with valence orbital of element
    const valOrb = getElementValenceOrbital(this.parameters.Z);
    this.parameters.selectedOrbital = {
      n: valOrb.n,
      l: valOrb.l,
      m: valOrb.m
    };
  }

  build() {
    const Z = this.parameters.Z;
    const layers = this.parameters.layers;
    const selOrb = this.parameters.selectedOrbital;

    // 1. Nucleus
    const isNucleusInitial = !!(
      layers.shell ||
      layers.nucleons ||
      layers.nucInterior ||
      layers.quarkThroat ||
      layers.nucleusWire ||
      layers.nucleonWire
    );
    this.nucleus = new Nucleus(`${this.id}-nucleus`, {
      Z,
      A: this.elementData.mass,
      showShell: !!layers.shell,
      showNucleons: !!layers.nucleons,
      showNucleusWire: !!layers.nucleusWire,
      showNucleonWire: !!layers.nucleonWire,
      showBag: !!layers.nucInterior,
      showThroat: !!layers.quarkThroat,
      visible: isNucleusInitial
    });
    this.nucleus.init(this.group, this.syncEngine);

    // 2. Quantum Probability Cloud (Image 1 profile)
    const initZeffList = calculateSlaterZeff(Z, this.configData.subshells);
    let initZeffEntry = initZeffList.find((s) => s.n === selOrb.n && s.l === selOrb.l);
    if (!initZeffEntry) {
      initZeffEntry = initZeffList.filter((s) => s.n <= selOrb.n).sort((a, b) => b.n - a.n)[0];
    }
    const initZeff = initZeffEntry ? initZeffEntry.Zeff : 1.0;
    const initOrbitRadius = 2.2 * Math.pow(selOrb.n, 1.4) + selOrb.l * 0.55;

    this.cloud = new OrbitalCloud(`${this.id}-cloud`, {
      Z,
      zeff: initZeff,
      orbitRadius: initOrbitRadius,
      n: selOrb.n,
      l: selOrb.l,
      m: selOrb.m,
      colorMode: 'wavefunction',
      visible: !!layers.cloud
    });
    this.cloud.init(this.group, this.syncEngine);

    // 3. Density Slice (Image 1 2D cross section)
    this.slice = new DensitySlice(`${this.id}-slice`, {
      n: selOrb.n,
      l: selOrb.l,
      m: selOrb.m,
      plane: 'xy',
      visible: !!layers.slice
    });
    this.slice.init(this.group, this.syncEngine);

    // 4. Orbital Shapes (Real & Complex as independent sub-layers)
    this.shapes = new OrbitalShapes(`${this.id}-shapes`, {
      n: selOrb.n,
      l: selOrb.l,
      m: selOrb.m,
      ms: selOrb.ms !== undefined ? selOrb.ms : 0.5,
      su2Angle: this.parameters.su2Angle || 0,
      layout: this.parameters.shapesLayout,
      cutawayAngle: this.parameters.cutawayAngle || 0,
      showReal: !!layers.shapesReal,
      showComplex: !!layers.shapesComplex,
      showNodalSurfaces: !!layers.nodalSurfaces,
      showNodalPanels: !!layers.nodalPanels,
      showSpinDoubleCover: !!layers.spinDoubleCover,
      showVortexRings: !!layers.vortexRings,
      visible: !!(layers.shapesReal || layers.shapesComplex || layers.nodalSurfaces || layers.nodalPanels || layers.spinDoubleCover || layers.vortexRings)
    });
    this.shapes.init(this.group, this.syncEngine);

    // 5. Drum Modes & Membrane Surfaces
    this.drum = new DrumModes(`${this.id}-drum`, {
      modeIndex: this.parameters.drumModeIndex,
      showS: !!layers.drum,
      showP: !!layers.membraneP,
      showMReal: !!layers.membraneMReal,
      showMComplex: !!layers.membraneMComplex,
      visible: !!(layers.drum || layers.membraneP || layers.membraneMReal || layers.membraneMComplex)
    });
    this.drum.init(this.group, this.syncEngine);

    // 6. Electron System
    this.electrons = new ElectronSystem(`${this.id}-electrons`, {
      Z,
      showTracks: !!layers.tracks,
      visible: !!layers.electrons
    });
    this.electrons.init(this.group, this.syncEngine);

    // 7. Embedded Projected Janus System (Antimatter world r < 0, upward vacuum dome)
    this.projectedJanus = new ProjectedJanusSystem(`${this.id}-projected-janus`, {
      visible: !!layers.janusProjected,
      yCenter: -14.0,
      bridgeTopY: -8.0,
      bridgeBottomY: -12.0
    });
    this.projectedJanus.init(this.group, this.syncEngine);

    this.baseOrbitRadius = initOrbitRadius;
    this.updateAllLayerVisibilities();
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (this.nucleus) this.nucleus.update(time, deltaTime, syncEngine);
    if (this.electrons) this.electrons.update(time, deltaTime, syncEngine);
    if (this.projectedJanus && this.projectedJanus.visible) {
      if (this.nucleus) {
        const nucPos = this.nucleus.group.position;
        const sag = 2.4 + 0.12 * Math.sqrt(this.elementData ? this.elementData.mass : 4);
        this.projectedJanus.setNucleusAnchor(nucPos.x, nucPos.z, sag);
      }
      this.projectedJanus.update(time, deltaTime, syncEngine);
    }

    if (this.cloud && this.cloud.visible) {
      // Coordinates update dynamically even if electron spherical meshes are hidden
      const ePositions = this.electrons
        ? this.electrons.getElectronPositions()
        : [];
      this.cloud.onUpdate(time, deltaTime, syncEngine, ePositions);
    }

    if (this.slice && this.slice.visible) this.slice.update(time, deltaTime, syncEngine);
    if (this.shapes && this.shapes.visible) this.shapes.update(time, deltaTime, syncEngine);
    if (this.drum && this.drum.visible) this.drum.update(time, deltaTime, syncEngine);
  }

  /**
   * Updates visibility of all sub-components based on layers state
   */
  updateAllLayerVisibilities() {
    const l = this.parameters.layers;
    const containers = resolveContainerVisibilities(l);

    if (this.nucleus) {
      this.nucleus.setVisible(containers.nucleus);
      this.nucleus.setEmbeddedLayers({
        showShell: !!l.shell,
        showNucleons: !!l.nucleons,
        showNucleusWire: !!l.nucleusWire,
        showNucleonWire: !!l.nucleonWire,
        showMesons: !!l.nucleons,
        showBag: !!l.nucInterior,
        showFluxTubes: !!l.nucInterior,
        showSea: !!l.nucInterior,
        showThroat: !!l.quarkThroat,
        autoLOD: !!l.autoLOD
      });
    }

    if (this.projectedJanus) {
      this.projectedJanus.parameters.showBridge = !!l.wormholeBridge;
      this.projectedJanus.parameters.showSheet = !!l.janusSheet;
      this.projectedJanus.parameters.showAntiproton = !!l.janusAntiproton;
      this.projectedJanus.parameters.showPositrons = !!l.janusPositrons;
      this.projectedJanus.updateSublayerVisibility();
      this.projectedJanus.setVisible(containers.projectedJanus);
    }

    if (this.cloud) this.cloud.setVisible(containers.cloud);
    if (this.slice) this.slice.setVisible(containers.slice);

    if (this.shapes) {
      this.shapes.setRealVisible(!!l.shapesReal);
      this.shapes.setComplexVisible(!!l.shapesComplex);
      this.shapes.setNodalVisible(!!l.nodalSurfaces);
      if (this.shapes.setNodalPanelsVisible) {
        this.shapes.setNodalPanelsVisible(!!l.nodalPanels);
      }
      if (this.shapes.setSpinDoubleCoverVisible) {
        this.shapes.setSpinDoubleCoverVisible(!!l.spinDoubleCover);
      }
      if (this.shapes.setVortexRingsVisible) {
        this.shapes.setVortexRingsVisible(!!l.vortexRings);
      }
      this.shapes.setVisible(containers.shapes);
    }

    if (this.electrons) {
      this.electrons.setShowElectrons(!!l.electrons);
      this.electrons.setShowTracks(!!l.tracks);
      this.electrons.setVisible(true);
    }

    if (this.drum) {
      this.drum.setSublayerVisibility({
        showS: !!l.drum,
        showP: !!l.membraneP,
        showMReal: !!l.membraneMReal,
        showMComplex: !!l.membraneMComplex
      });
      this.drum.setVisible(containers.drum);
    }
  }

  /**
   * Toggle individual layer visibility independently
   * @param {string} layerName
   * @param {boolean} visible
   */
  setLayerVisibility(layerName, visible) {
    this.parameters.layers[layerName] = !!visible;
    this.updateAllLayerVisibilities();
  }

  /**
   * Apply a preset layer configuration (convenience preset buttons in UI)
   * @param {string} presetName
   */
  applyPreset(presetName) {
    const presetState = getPresetLayerState(presetName);
    if (presetState) {
      Object.assign(this.parameters.layers, presetState);
    }
    this.updateAllLayerVisibilities();
  }

  /**
   * Change atomic number Z (1 to 36).
   * Direction 1: Element -> Orbital state
   * @param {number} Z
   * @param {boolean} [syncOrbital=true]
   */
  setAtomicNumber(Z, syncOrbital = true) {
    Z = Math.max(1, Math.min(ELEMENTS.length, Math.floor(Z)));
    this.parameters.Z = Z;
    this.elementData = getElement(Z);
    this.configData = buildElectronConfiguration(Z);

    if (this.nucleus) {
      this.nucleus.setParameters({ Z, A: this.elementData.mass });
    }
    if (this.electrons) {
      this.electrons.setParameters({ Z });
    }
    if (this.cloud) {
      this.cloud.setParameters({ Z });
    }

    if (syncOrbital) {
      const valOrb = getElementValenceOrbital(Z);
      this.setOrbitalConfig(valOrb.n, valOrb.l, valOrb.m, false);
    }
  }

  /**
   * Configure orbital quantum state (n, l, m, ms).
   * Direction 2: Orbital state -> Representative chemical element
   * @param {number} n
   * @param {number} l
   * @param {number} m
   * @param {boolean} [syncElement=false] - Whether to back-propagate to representative chemical element
   * @param {number} [ms=0.5] - Electron spin quantum number (+0.5, -0.5, 0)
   * @returns {number|null} Updated Z if synchronized, null otherwise
   */
  setOrbitalConfig(n, l, m, syncElement = false, ms = 0.5) {
    this.parameters.selectedOrbital = { n, l, m, ms };

    // Effective nuclear charge felt in this orbital (Slater screening). Fall back to
    // the nearest lower-l subshell when the exact (n,l) is unoccupied (excited state).
    const zeffList = calculateSlaterZeff(this.parameters.Z, this.configData.subshells);
    let zeffEntry = zeffList.find((s) => s.n === n && s.l === l);
    if (!zeffEntry) {
      zeffEntry = zeffList.filter((s) => s.n <= n).sort((a, b) => b.n - a.n)[0];
    }
    const zeff = zeffEntry ? zeffEntry.Zeff : 1.0;

    // Electron-orbit radius used by ElectronSystem for this (n, l) shell, so the
    // |psi|^2 cloud can be scaled to line up with the drawn electron orbits.
    const orbitRadius = 2.2 * Math.pow(n, 1.4) + l * 0.55;

    if (this.atomWireMesh) {
      this.atomWireMesh.scale.setScalar(orbitRadius / (this.baseOrbitRadius || 1.0));
    }

    if (this.cloud) {
      this.cloud.setOrbitalConfig(n, l, m, zeff, orbitRadius, true, this.parameters.Z);
    }
    if (this.slice) {
      this.slice.setParameters({ n, l, m });
    }
    if (this.shapes) {
      this.shapes.setParameters({ n, l, m, ms });
    }

    let updatedZ = null;
    if (syncElement) {
      const repZ = getRepresentativeElementForOrbital(n, l);
      if (repZ !== this.parameters.Z) {
        this.setAtomicNumber(repZ, false);
        updatedZ = repZ;
      }
    }

    return updatedZ;
  }

  setDrumMode(modeIndex) {
    this.parameters.drumModeIndex = modeIndex;
    if (this.drum) {
      this.drum.setParameters({ modeIndex });
    }
  }

  setCutawayAngle(angle) {
    this.parameters.cutawayAngle = angle;
    if (this.shapes) {
      this.shapes.setCutawayAngle(angle);
    }
  }

  setSu2Angle(angle) {
    this.parameters.su2Angle = angle;
    if (this.shapes && this.shapes.setSu2Angle) {
      this.shapes.setSu2Angle(angle);
    }
  }

  setLOD(lod, distance) {
    if (this.nucleus && this.nucleus.setLOD) {
      this.nucleus.setLOD(lod, distance);
    }
    if (this.projectedJanus && this.projectedJanus.setLOD) {
      this.projectedJanus.setLOD(lod, distance);
    }
  }

  getInteractiveNucleons() {
    return this.nucleus ? this.nucleus.getNucleonMeshes() : [];
  }

  getInteractiveQuarks() {
    return this.nucleus && this.nucleus.getInteractiveQuarks ? this.nucleus.getInteractiveQuarks() : [];
  }

  getInteractiveWormhole() {
    return this.nucleus && this.nucleus.getInteractiveWormhole ? this.nucleus.getInteractiveWormhole() : null;
  }

  getInteractiveJanus() {
    return this.projectedJanus && this.projectedJanus.getInteractiveObjects ? this.projectedJanus.getInteractiveObjects() : [];
  }

  triggerNuclearRecoil(direction, strength) {
    if (this.nucleus) {
      this.nucleus.triggerRecoil(direction, strength);
    }
  }

  setTransitionProgress(alpha) {
    if (this.electrons) {
      this.electrons.setTransitionProgress(alpha);
    }
    if (this.cloud) {
      this.cloud.setTransitionProgress(alpha);
    }
  }

  /**
   * Applies a multi-electron excitation channel (from getExcitationChannel).
   * Determines which bound electron absorbs the excitation, its target orbital,
   * and the Slater orbital-relaxation shifts imposed on the spectator electrons.
   * @param {Object} channel
   */
  setExcitationChannel(channel) {
    if (!channel) return;
    this.excitationChannel = channel;

    // Find the outermost electron belonging to the source subshell (n_i, l_i)
    const electrons = this.configData.electrons;
    let activeIndex = 0;
    for (let i = 0; i < electrons.length; i++) {
      if (electrons[i].n === channel.source.n && electrons[i].l === channel.source.l) {
        activeIndex = i; // keep last match -> outermost of that subshell
      }
    }

    if (this.electrons) {
      this.electrons.setExcitationState({
        activeIndex,
        targetN: channel.target.n,
        targetL: channel.target.l,
        targetMl: 0,
        spectatorShifts: channel.spectatorShifts
      });
    }

    if (this.cloud) {
      this.cloud.setExcitationChannel(channel);
    }
  }

  setImpactKick(intensity) {
    if (this.electrons) {
      this.electrons.setImpactKick(intensity);
    }
  }

  setWormholeExcitation(intensity) {
    if (this.nucleus && this.nucleus.setWormholeExcitation) {
      this.nucleus.setWormholeExcitation(intensity);
    }
  }

  setBridgeExcitation(intensity) {
    if (this.projectedJanus && this.projectedJanus.setBridgeExcitation) {
      this.projectedJanus.setBridgeExcitation(intensity);
    }
  }

  getTelemetry() {
    const Z = this.parameters.Z;
    const elem = this.elementData;
    const config = this.configData;
    const selOrb = this.parameters.selectedOrbital;
    const physicals = getOrbitalPhysicals(selOrb.n, selOrb.l, Z);

    return {
      element: elem,
      configuration: config,
      notation: config.notation,
      selectedOrbital: selOrb,
      physicals,
      activeElectrons: config.electrons.length,
      massNumber: elem.mass,
      protonCount: Z,
      neutronCount: Math.max(0, elem.mass - Z),
      sagDepth: 2.2 + 0.12 * Math.sqrt(elem.mass),
      orbitalTilts: this.electrons ? this.electrons.getOrbitalTiltData() : []
    };
  }

  dispose() {
    super.dispose();
    if (this.nucleus) this.nucleus.dispose();
    if (this.cloud) this.cloud.dispose();
    if (this.slice) this.slice.dispose();
    if (this.shapes) this.shapes.dispose();
    if (this.drum) this.drum.dispose();
    if (this.electrons) this.electrons.dispose();
    if (this.projectedJanus) this.projectedJanus.dispose();
  }
}
