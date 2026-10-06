import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';
import { Atom } from './Atom.js';

/**
 * MultiAtomSystem: Reusable multi-atom ensemble manager.
 * Supports:
 * - Single atom (Z = 1..36)
 * - Diatomic molecule (e.g. H2, O2)
 * - Triatomic molecule (e.g. H2O)
 * - Crystal lattice unit cell
 * Couples with VacuumSheet by providing dynamic gravity well source locations!
 */
export class MultiAtomSystem extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'multi-atom-system', options = {}) {
    super(id, {
      name: 'Többatomos Rendszer',
      ...options,
      parameters: {
        arrangement: options.arrangement || 'single', // 'single', 'diatomic', 'triatomic', 'lattice'
        primaryZ: options.primaryZ || 2,
        secondaryZ: options.secondaryZ || 1,
        bondDistance: options.bondDistance || 6.5,
        layers: options.layers || {
          electrons: true,
          tracks: true,
          nucleons: true,
          nucleusWire: true,
          vacuum: true,
          vacuumWire: true
        },
        mode: options.mode || 'full',
        ...options.parameters
      }
    });

    this.atoms = [];
    this.bondLines = [];
    this.bondMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45
    });
  }

  build() {
    this.rebuildSystem();
  }

  rebuildSystem() {
    // Clean up existing atoms
    this.atoms.forEach(atom => atom.dispose());
    this.atoms = [];

    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    this.bondLines = [];

    const arrangement = this.parameters.arrangement;
    const Z1 = this.parameters.primaryZ;
    const Z2 = this.parameters.secondaryZ;
    const dist = this.parameters.bondDistance;
    const layers = { ...this.parameters.layers };
    const mode = this.parameters.mode;

    const atomConfigs = [];

    switch (arrangement) {
      case 'diatomic':
        atomConfigs.push({ id: 'atom-0', Z: Z1, pos: new THREE.Vector3(-dist / 2, 0, 0) });
        atomConfigs.push({ id: 'atom-1', Z: Z2, pos: new THREE.Vector3(dist / 2, 0, 0) });
        break;

      case 'triatomic':
        // H2O geometry with 104.5 degree bond angle
        const angle = (104.5 / 2) * (Math.PI / 180);
        atomConfigs.push({ id: 'atom-0', Z: Z1, pos: new THREE.Vector3(0, 0.8, 0) }); // Central atom (e.g. Oxygen)
        atomConfigs.push({ id: 'atom-1', Z: Z2, pos: new THREE.Vector3(-dist * Math.sin(angle), -dist * Math.cos(angle) + 0.8, 0) });
        atomConfigs.push({ id: 'atom-2', Z: Z2, pos: new THREE.Vector3(dist * Math.sin(angle), -dist * Math.cos(angle) + 0.8, 0) });
        break;

      case 'lattice':
        // 2x2 planar crystal lattice unit cell
        const half = dist * 0.6;
        atomConfigs.push({ id: 'atom-0', Z: Z1, pos: new THREE.Vector3(-half, 0, -half) });
        atomConfigs.push({ id: 'atom-1', Z: Z1, pos: new THREE.Vector3(half, 0, -half) });
        atomConfigs.push({ id: 'atom-2', Z: Z1, pos: new THREE.Vector3(-half, 0, half) });
        atomConfigs.push({ id: 'atom-3', Z: Z1, pos: new THREE.Vector3(half, 0, half) });
        break;

      case 'single':
      default:
        atomConfigs.push({ id: 'atom-0', Z: Z1, pos: new THREE.Vector3(0, 0, 0) });
        break;
    }

    // Instantiate and position atoms
    atomConfigs.forEach((cfg) => {
      const atom = new Atom(cfg.id, {
        Z: cfg.Z,
        mode,
        layers,
        cutawayAngle: this.parameters.cutawayAngle || 0
      });
      atom.init(this.group, this.syncEngine);
      atom.group.position.copy(cfg.pos);
      this.atoms.push(atom);
    });

    // Visual bond filaments between atoms in multi-atom configurations
    if (this.atoms.length > 1) {
      for (let i = 0; i < this.atoms.length; i++) {
        for (let j = i + 1; j < this.atoms.length; j++) {
          const posA = this.atoms[i].group.position;
          const posB = this.atoms[j].group.position;
          if (posA.distanceTo(posB) <= dist * 1.5) {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([posA.clone(), posB.clone()]);
            const line = new THREE.Line(lineGeo, this.bondMat);
            this.group.add(line);
            this.bondLines.push({ line, idxA: i, idxB: j });
          }
        }
      }
    }
  }

  onUpdate(time, deltaTime, syncEngine) {
    // Update all constituent atoms
    for (let i = 0; i < this.atoms.length; i++) {
      this.atoms[i].update(time, deltaTime, syncEngine);
    }
  }

  /**
   * Sets the arrangement type ('single', 'diatomic', 'triatomic', 'lattice')
   */
  setArrangement(arrangement) {
    this.parameters.arrangement = arrangement;
    this.rebuildSystem();
  }

  /**
   * Sets atomic number for primary atom(s)
   */
  setPrimaryZ(Z) {
    this.parameters.primaryZ = Z;
    if (this.atoms.length > 0) {
      this.atoms[0].setAtomicNumber(Z);
      // For lattice or single, update all
      if (this.parameters.arrangement === 'lattice') {
        for (let i = 1; i < this.atoms.length; i++) {
          this.atoms[i].setAtomicNumber(Z);
        }
      }
    }
  }

  /**
   * Returns gravity source parameters for all active atoms to drive the VacuumSheet
   * @returns {Array<{ x: number, z: number, mass: number, sagDepth: number }>}
   */
  getGravitySources() {
    return this.atoms.map((atom) => {
      const tele = atom.getTelemetry();
      const pos = atom.group.position;
      return {
        x: pos.x,
        z: pos.z,
        mass: tele.massNumber,
        sagDepth: tele.sagDepth
      };
    });
  }

  getInteractiveNucleons() {
    const list = [];
    this.atoms.forEach((atom, aIdx) => {
      const nList = atom.getInteractiveNucleons();
      nList.forEach(item => {
        list.push({
          ...item,
          atomIndex: aIdx
        });
      });
    });
    return list;
  }

  getInteractiveQuarks() {
    const list = [];
    this.atoms.forEach((atom, aIdx) => {
      const qList = atom.getInteractiveQuarks ? atom.getInteractiveQuarks() : [];
      qList.forEach(mesh => {
        list.push({
          mesh,
          atomIndex: aIdx
        });
      });
    });
    return list;
  }

  getInteractiveWormholes() {
    const list = [];
    this.atoms.forEach((atom, aIdx) => {
      const wMesh = atom.getInteractiveWormhole ? atom.getInteractiveWormhole() : null;
      if (wMesh) {
        list.push({
          mesh: wMesh,
          atomIndex: aIdx
        });
      }
    });
    return list;
  }

  getInteractiveJanus() {
    const list = [];
    this.atoms.forEach((atom, aIdx) => {
      const jList = atom.getInteractiveJanus ? atom.getInteractiveJanus() : [];
      jList.forEach(item => {
        list.push({
          ...item,
          atomIndex: aIdx
        });
      });
    });
    return list;
  }

  setLOD(lod, distance) {
    this.atoms.forEach(atom => {
      if (atom.setLOD) atom.setLOD(lod, distance);
    });
  }

  /**
   * Return primary atom for telemetry inspect
   * @returns {Atom}
   */
  getPrimaryAtom() {
    return this.atoms[0] || null;
  }

  triggerNuclearRecoil(direction, strength) {
    if (this.atoms.length > 0) {
      this.atoms[0].triggerNuclearRecoil(direction, strength);
    }
  }

  setTransitionProgress(alpha) {
    this.atoms.forEach(atom => atom.setTransitionProgress(alpha));
  }

  setImpactKick(intensity) {
    if (this.atoms.length > 0) {
      this.atoms[0].setImpactKick(intensity);
    }
  }

  setWormholeExcitation(intensity) {
    this.atoms.forEach((atom) => atom.setWormholeExcitation(intensity));
  }

  setBridgeExcitation(intensity) {
    this.atoms.forEach((atom) => atom.setBridgeExcitation(intensity));
  }

  /**
   * Forwards the excitation channel to all atoms in the ensemble.
   * @param {Object} channel - result of getExcitationChannel()
   */
  setExcitationChannel(channel) {
    this.atoms.forEach((atom) => atom.setExcitationChannel(channel));
  }

  /**
   * Set display mode across all atoms
   */
  applyMode(mode) {
    this.parameters.mode = mode;
    this.atoms.forEach(atom => atom.applyMode(mode));
  }

  /**
   * Set layer visibility across all atoms
   */
  setLayerVisibility(layerName, visible) {
    this.parameters.layers[layerName] = !!visible;
    this.atoms.forEach(atom => atom.setLayerVisibility(layerName, visible));
  }

  /**
   * Apply layer preset across all atoms
   */
  applyPreset(presetName) {
    this.atoms.forEach(atom => atom.applyPreset(presetName));
    if (this.atoms[0]) {
      Object.assign(this.parameters.layers, this.atoms[0].parameters.layers);
    }
  }

  /**
   * Configure orbital (n, l, m) across atoms
   * @returns {number|null} Updated Z if synchronized
   */
  setOrbitalConfig(n, l, m, syncElement = false, ms = 0.5) {
    let updatedZ = null;
    this.atoms.forEach((atom, idx) => {
      const resZ = atom.setOrbitalConfig(n, l, m, syncElement && idx === 0, ms);
      if (idx === 0 && resZ !== null) {
        updatedZ = resZ;
        this.parameters.primaryZ = resZ;
      }
    });
    return updatedZ;
  }

  setCutawayAngle(angle) {
    this.parameters.cutawayAngle = angle;
    this.atoms.forEach(atom => atom.setCutawayAngle(angle));
  }

  setSu2Angle(angle) {
    this.parameters.su2Angle = angle;
    this.atoms.forEach(atom => atom.setSu2Angle(angle));
  }

  dispose() {
    super.dispose();
    this.atoms.forEach(atom => atom.dispose());
    this.atoms = [];
    this.bondLines = [];
  }
}
