import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { VacuumSheet } from './components/VacuumSheet.js';
import { MultiAtomSystem } from './components/MultiAtomSystem.js';
import { EnergyFlowSystem } from './components/EnergyFlowSystem.js';
import { ExternalBeamSystem } from './components/ExternalBeamSystem.js';
import { NucleonInterior } from './components/NucleonInterior.js';
import { QuarkInterior } from './components/QuarkInterior.js';
import { JanusSector } from './components/JanusSector.js';
import { LevelManager, LEVELS } from './core/LevelManager.js';
import { InteractionManager } from './core/InteractionManager.js';
import { ProcessSimulator } from './core/ProcessSimulator.js';
import { ControlPanel } from './ui/ControlPanel.js';
import { DisplayPanel } from './ui/DisplayPanel.js';
import { SettingsModal } from './ui/SettingsModal.js';
import { PeriodicTableModal } from './ui/PeriodicTableModal.js';
import { getElementValenceOrbital, getExcitationChannel } from './core/QuantumPhysics.js';
import { StorageManager } from './core/StorageManager.js';
import { i18n } from './core/I18n.js';
import { APP_CONFIG } from './config.js';
import { LAYER_PRESETS, getPresetLayerState } from './config/layers.js';

/**
 * Universal Quantum Visualisation Application Bootstrap
 * Supports:
 * - 3-Level Embedded Structure: Atom -> Nucleon -> Quark / Wormhole (+ Janus Antimatter)
 * - 6-Phase Dynamic Physical Process Simulator (Incoming electron -> QED scattering -> Jump -> Recoil -> Bounce -> Lyman-α relaxation)
 */
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container element not found!');
    return;
  }

  // 0. Initialize StorageManager (LocalStorage Persistence)
  const storageManager = new StorageManager();
  const savedState = storageManager.getState();

  // Initialize Language & Typography from config / savedState
  const initialLang = (savedState.settings && savedState.settings.language) || APP_CONFIG.defaultLanguage || 'en';
  const initialFontSize = (savedState.settings && savedState.settings.fontSize) || APP_CONFIG.defaultFontSize || 'medium';
  i18n.setLanguage(initialLang);
  document.documentElement.lang = initialLang;
  document.documentElement.setAttribute('data-font-size', initialFontSize);

  // 1. Initialize 3D Engine
  const engine = new Engine(container);
  window.__ENGINE = engine;

  // 2. Instantiate Spacetime Vacuum Sheet (delta g_00)
  const vacuumSheet = new VacuumSheet('vacuum-sheet', {
    yOffset: -5.5,
    baseSagDepth: 2.6,
    showSurface: savedState.layers.vacuum !== undefined ? !!savedState.layers.vacuum : true,
    showWireframe: savedState.layers.vacuumWire !== undefined ? !!savedState.layers.vacuumWire : true,
    colorMode: savedState.playback.vacuumColorMode || 'depth'
  });
  engine.addComponent(vacuumSheet);

  // 3. Instantiate Multi-Atom System
  const multiAtom = new MultiAtomSystem('multi-atom', {
    arrangement: savedState.playback.arrangement || 'single',
    primaryZ: savedState.playback.Z || 2,
    layers: { ...savedState.layers }
  });
  engine.addComponent(multiAtom);

  // Initial vacuum gravity wells synchronization
  vacuumSheet.setSources(multiAtom.getGravitySources());

  // 4. Level 1: Energy Flow System (virtual photons diving into extra dimensions & vacuum pairs)
  const energyFlow = new EnergyFlowSystem('energy-flow', {
    flowSpeed: savedState.playback.flowSpeed || 1.6,
    dipDepth: savedState.playback.dipDepth || 3.2,
    showPhotons: !!savedState.layers.energyFlow,
    showVirtualPairs: !!savedState.layers.virtualPairs,
    visible: !!(savedState.layers.energyFlow || savedState.layers.virtualPairs)
  });
  energyFlow.setAtomSystem(multiAtom);
  engine.addComponent(energyFlow);

  // 5. Level 0: External Beam & Scattering Continuum System (incoming/scattered electron, real photon)
  const externalBeam = new ExternalBeamSystem('external-beam', {
    showBeam: !!savedState.layers.beam,
    visible: !!savedState.layers.beam
  });
  externalBeam.setVacuumSheet(vacuumSheet);
  externalBeam.setAtomSystem(multiAtom);
  engine.addComponent(externalBeam);

  // 6. Level 2: Nucleon Interior (Proton / Neutron, Quarks, Gluon flux tubes, Sea quarks)
  const nucleonInterior = new NucleonInterior('nucleon-interior', {
    isProton: true,
    visible: false
  });
  engine.addComponent(nucleonInterior);

  // 7. Level 3: Quark Interior (Kerr wormhole throat, Calabi-Yau 6D, Heisenberg bounce, Hawking radiation)
  const quarkInterior = new QuarkInterior('quark-interior', {
    quarkType: 'up',
    charge: '+⅔ e',
    visible: false
  });
  engine.addComponent(quarkInterior);

  // 8. Antimatter Mirror Sector: Janus-világ (r < 0, dS/dt < 0)
  const janusSector = new JanusSector('janus-sector', {
    visible: false
  });
  engine.addComponent(janusSector);

  // 9. Instantiate 6-Phase ProcessSimulator
  const processSimulator = new ProcessSimulator();
  if (savedState.playback.fDebyeWaller !== undefined) {
    processSimulator.setDebyeWallerFactor(savedState.playback.fDebyeWaller);
  }
  externalBeam.setProcessSimulator(processSimulator);

  // 10. Instantiate LevelManager
  const levelManager = new LevelManager(engine);
  levelManager.registerComponents({
    atom: multiAtom,
    energyFlow,
    externalBeam,
    vacuumSheet,
    nucleonInterior,
    quarkInterior,
    janusSector
  });

  // Combine level camera updates with process simulator updates on frame
  engine.onFrame = (dt) => {
    levelManager.update(dt);
    processSimulator.update(dt);

    vacuumSheet.setEntropicState(
      processSimulator.entropicVelocity,
      processSimulator.accumulatedEntropicTime,
      processSimulator.getCurrentPhase().key
    );
  };

  // 11. Instantiate InteractionManager (Raycasting on interactive objects)
  const interactionManager = new InteractionManager(engine.camera, engine.renderer.domElement);

  const refreshInteractiveTargets = (level) => {
    interactionManager.clear();

    if (level === LEVELS.ATOM) {
      // 1. Register all nucleons from the primary atom
      const nucleons = multiAtom.getInteractiveNucleons();
      nucleons.forEach((item) => {
        interactionManager.register(item.mesh, 'nucleon', {
          isProton: item.isProton,
          index: item.index
        });
      });

      // 2. Register embedded valence quarks inside nucleons
      const quarks = multiAtom.getInteractiveQuarks();
      quarks.forEach((item) => {
        const qData = item.mesh.userData.interactiveData || {};
        interactionManager.register(item.mesh, 'quark', qData);
      });

      // 3. Register embedded micro-wormhole throat
      const wormholes = multiAtom.getInteractiveWormholes();
      wormholes.forEach((item) => {
        interactionManager.register(item.mesh, 'wormhole', item.mesh.userData.interactiveData || { type: 'throat' });
      });

      // 4. Register projected Janus world elements
      const janusItems = multiAtom.getInteractiveJanus();
      janusItems.forEach((item) => {
        interactionManager.register(item.mesh, item.type || 'janus', item.data || {});
      });
    } else if (level === LEVELS.NUCLEON) {
      // Register valence quarks inside the nucleon
      const quarks = nucleonInterior.getInteractiveQuarks();
      quarks.forEach((qMesh) => {
        interactionManager.register(qMesh, 'quark', qMesh.userData.interactiveData);
      });
    }
  };

  // Initial interaction registration
  refreshInteractiveTargets(LEVELS.ATOM);

  // Handle 3D Click interactions (Seamless hierarchical navigation!)
  interactionManager.on('click', ({ type, data }) => {
    if (type === 'nucleon') {
      levelManager.setLevel(LEVELS.NUCLEON, { isProton: data.isProton });
    } else if (type === 'quark') {
      levelManager.setLevel(LEVELS.QUARK, {
        type: data.type || 'up',
        charge: data.charge || '+⅔ e',
        isProton: data.isProton !== undefined ? data.isProton : true
      });
    } else if (type === 'wormhole') {
      levelManager.setLevel(LEVELS.QUARK, {
        type: 'up',
        charge: '+⅔ e',
        isProton: true
      });
    } else if (type === 'janus') {
      levelManager.setLevel(LEVELS.JANUS);
    }
  });

  // 12. Instantiate Glassmorphic UI Panels & Modals
  const initialZ = savedState.playback.Z || 2;
  const ctrlPanel = new ControlPanel('control-panel', {
    initialZ
  });
  ctrlPanel.mount(document.body);

  const displayPanel = new DisplayPanel('display-panel');
  displayPanel.mount(document.body);

  const settingsModal = new SettingsModal();
  settingsModal.setValues(savedState.playback);

  const periodicTableModal = new PeriodicTableModal(initialZ);

  // Initialize Shapes panel with saved or default element valence orbital
  const groundValOrb = getElementValenceOrbital(initialZ);
  const initValOrb = { ...groundValOrb, ms: savedState.playback.selectedOrbital?.ms !== undefined ? savedState.playback.selectedOrbital.ms : 0.5 }; // Always synchronize with ground state valence orbital on load
  multiAtom.setOrbitalConfig(initValOrb.n, initValOrb.l, initValOrb.m || 0, false, initValOrb.ms);
  ctrlPanel.setOrbitalState(initValOrb.n, initValOrb.l, initValOrb.m || 0, initValOrb.ms);
  storageManager.update({ playback: { selectedOrbital: initValOrb } });

  // Restore panel & layer states from StorageManager
  ctrlPanel.setLayers(savedState.layers);
  ctrlPanel.setPlaybackUI(savedState.playback);

  if (savedState.panels.controlPanel) {
    if (savedState.panels.controlPanel.isCollapsed) ctrlPanel.setCollapsed(true);
    if (savedState.panels.controlPanel.isVisible === false) ctrlPanel.hide();
    if (savedState.panels.controlPanel.accordions) {
      ctrlPanel.setAccordionStates(savedState.panels.controlPanel.accordions);
    }
  }

  if (savedState.panels.displayPanel) {
    if (savedState.panels.displayPanel.isCollapsed) displayPanel.setCollapsed(true);
    if (savedState.panels.displayPanel.isVisible === false) displayPanel.hide();
    if (savedState.panels.displayPanel.accordions) {
      displayPanel.setAccordionStates(savedState.panels.displayPanel.accordions);
    }
  }

  // Restore drum mode if set
  if (savedState.playback.drumModeIndex) {
    multiAtom.atoms.forEach(atom => atom.setDrumMode(savedState.playback.drumModeIndex));
  }

  // Restore timeScale and pause state
  engine.syncEngine.setTimeScale(savedState.playback.timeScale !== undefined ? savedState.playback.timeScale : 1.0);
  engine.syncEngine.setPaused(!!savedState.playback.isPaused);
  ctrlPanel.setPauseState(!!savedState.playback.isPaused);

  // Restore initial level if set
  if (savedState.playback.currentLevel && savedState.playback.currentLevel !== LEVELS.ATOM) {
    levelManager.setLevel(savedState.playback.currentLevel, {}, false);
  }

  // Excitation channel state (which electron absorbs & where it goes). Recomputed on element change.
  const BEAM_ENERGY_EV = 15.0;
  let preferredSubshell = null; // null = auto (valence)
  let currentChannel = null;

  const refreshExcitationChannel = () => {
    const Z = multiAtom.parameters.primaryZ;
    currentChannel = getExcitationChannel(Z, BEAM_ENERGY_EV, preferredSubshell);
    processSimulator.setChannel(currentChannel);
    multiAtom.setExcitationChannel(currentChannel);
    externalBeam.setExcitationChannel(currentChannel);
    ctrlPanel.updateChannelInfo(currentChannel);
    return currentChannel;
  };

  refreshExcitationChannel();

  // Set initial play state: Simulation time & camera starts playing, process simulator starts idle/paused
  const initialProcTele = processSimulator.getTelemetry();
  ctrlPanel.updateProcessUI(initialProcTele);
  displayPanel.updateProcessTelemetry(initialProcTele);

  // 13. ProcessSimulator Phase Transitions -> Atomic State Sync & Gravitational Dynamic Vacuum
  processSimulator.on('phaseChange', ({ phase, prevIndex, index }) => {
    if (levelManager.currentLevel !== LEVELS.ATOM && index > 0) {
      // Return to atom view when process is started so the full sequence is visible
      levelManager.setLevel(LEVELS.ATOM);
    }

    switch (phase.key) {
      case 'idle': {
        const src = currentChannel ? currentChannel.source : { n: 1, l: 0 };
        multiAtom.setOrbitalConfig(src.n, src.l, 0, false);
        ctrlPanel.setOrbitalState(src.n, src.l, 0);
        energyFlow.setParameters({ dipDepth: 3.2, flowSpeed: 1.6 });
        energyFlow.setInwardFlowBias(0.0, 1.0, 0.0);
        vacuumSheet.setExcitationLevel(0.0);
        vacuumSheet.setSplitProgress(0.0);
        break;
      }

      case 'incoming': {
        const src = currentChannel ? currentChannel.source : { n: 1, l: 0 };
        multiAtom.setOrbitalConfig(src.n, src.l, 0, false);
        ctrlPanel.setOrbitalState(src.n, src.l, 0);
        energyFlow.setInwardFlowBias(0.0, 1.0, 0.0);
        vacuumSheet.setExcitationLevel(0.0);
        vacuumSheet.setSplitProgress(0.0);
        break;
      }

      case 'scattering':
        // QED vertex event: energy begins transferring, virtual photons surge inward to nucleus
        energyFlow.triggerInwardSurge();
        energyFlow.setInwardFlowBias(0.92, 2.4, 0.0);
        vacuumSheet.setExcitationLevel(0.4);
        break;

      case 'orbital_jump': {
        // Quantum jump to the dipole-allowed target orbital on the conformal scale fibre!
        const tgt = currentChannel ? currentChannel.target : { n: 2, l: 1 };
        multiAtom.setOrbitalConfig(tgt.n, tgt.l, 0, false);
        ctrlPanel.setOrbitalState(tgt.n, tgt.l, 0);
        energyFlow.setInwardFlowBias(0.0, 1.4, 0.85);
        vacuumSheet.setExcitationLevel(1.0);
        vacuumSheet.setSplitProgress(1.0);
        break;
      }

      case 'nuclear_recoil':
        // Trigger momentum-conserving recoil and Yukawa pion exchange pulse
        multiAtom.triggerNuclearRecoil(new THREE.Vector3(0.55, -0.15, 0.65), 0.5);
        energyFlow.setInwardFlowBias(0.0, 1.2, 1.0);
        vacuumSheet.setExcitationLevel(0.95);
        vacuumSheet.triggerEntropicShockwave(2.4);
        break;

      case 'deep_dissipation':
        // Accelerate flow towards extra dimension, activate maximum throat and bridge excitation
        energyFlow.setParameters({ dipDepth: 5.2, flowSpeed: 3.2 });
        energyFlow.setInwardFlowBias(0.0, 1.5, 1.0);
        vacuumSheet.setExcitationLevel(0.95);
        multiAtom.setWormholeExcitation(1.0);
        multiAtom.setBridgeExcitation(1.0);
        break;

      case 'relaxation':
        // Will reset orbital back to 1s when Lyman-alpha photon triggers
        break;
    }
  });

  processSimulator.on('photonEmitted', () => {
    // Spontaneous transition back to the ground-state source orbital
    const src = currentChannel ? currentChannel.source : { n: 1, l: 0 };
    multiAtom.setOrbitalConfig(src.n, src.l, 0, false);
    ctrlPanel.setOrbitalState(src.n, src.l, 0);
    multiAtom.setTransitionProgress(0.0);
    multiAtom.setImpactKick(0.0);
    multiAtom.setWormholeExcitation(0.0);
    multiAtom.setBridgeExcitation(0.0);
    energyFlow.setParameters({ dipDepth: 3.2, flowSpeed: 1.6 });
    energyFlow.setInwardFlowBias(0.0, 1.0, 0.0);
    // Gravitational well releases and snaps back to ground state M0:
    vacuumSheet.setExcitationLevel(0.0, true);
    vacuumSheet.setSplitProgress(0.0);
    // Outgoing gravitational wave ripple travelling at speed of light:
    vacuumSheet.triggerGravitationalWave(0.85);
  });

  processSimulator.on('reset', () => {
    const src = currentChannel ? currentChannel.source : { n: 1, l: 0 };
    multiAtom.setOrbitalConfig(src.n, src.l, 0, false);
    ctrlPanel.setOrbitalState(src.n, src.l, 0);
    multiAtom.setTransitionProgress(0.0);
    multiAtom.setImpactKick(0.0);
    multiAtom.setWormholeExcitation(0.0);
    multiAtom.setBridgeExcitation(0.0);
    energyFlow.setParameters({ dipDepth: 3.2, flowSpeed: 1.6 });
    energyFlow.setInwardFlowBias(0.0, 1.0, 0.0);
    vacuumSheet.setExcitationLevel(0.0, false);
    vacuumSheet.setSplitProgress(0.0);
  });

  // Smooth continuous electron orbital morphing synchronized with process progress
  processSimulator.on('progressUpdate', ({ phase, progress }) => {
    switch (phase.key) {
      case 'idle':
      case 'incoming':
        multiAtom.setTransitionProgress(0.0);
        multiAtom.setImpactKick(0.0);
        multiAtom.setWormholeExcitation(0.0);
        multiAtom.setBridgeExcitation(0.0);
        energyFlow.setInwardFlowBias(0.0, 1.0, 0.0);
        vacuumSheet.setSplitProgress(0.0);
        break;

      case 'scattering':
        if (progress < 0.5) {
          // Pre-collision approach: particle moving in from 0.88 to vertex
          multiAtom.setTransitionProgress(0.0);
          multiAtom.setImpactKick(0.0);
          multiAtom.setWormholeExcitation(progress * 0.2);
          multiAtom.setBridgeExcitation(0.0);
          energyFlow.setInwardFlowBias(progress * 0.35, 1.0, 0.0);
          vacuumSheet.setExcitationLevel(progress * 0.3);
          vacuumSheet.setSplitProgress(progress * 0.5);
        } else {
          // Instant of collision (progress = 0.5) and immediate post-collision:
          // Energy transferred: electron immediately kicks into high speed & white-hot glow,
          // orbital expansion begins IMMEDIATELY, and virtual photons flood inward to nucleus!
          const localP = (progress - 0.5) / 0.5; // 0.0 to 1.0
          multiAtom.setImpactKick(1.0);
          multiAtom.setTransitionProgress(localP * 0.30);
          multiAtom.setWormholeExcitation(0.2 + localP * 0.4);
          multiAtom.setBridgeExcitation(localP * 0.3);
          energyFlow.setInwardFlowBias(1.0, 2.6, 0.0);
          vacuumSheet.setExcitationLevel(0.3 + localP * 0.4);
          vacuumSheet.setSplitProgress(0.5 + localP * 0.5);
        }
        break;

      case 'orbital_jump':
        // Continuous dipole loop expansion (Virial conversion: kinetic energy converts into potential energy)
        // As transitionProgress expands from 0.30 to 1.0, electron naturally cools and slows into 2p_z
        multiAtom.setImpactKick(1.0);
        multiAtom.setTransitionProgress(0.30 + progress * 0.70);
        multiAtom.setWormholeExcitation(0.6 + progress * 0.3);
        multiAtom.setBridgeExcitation(0.3 + progress * 0.4);
        energyFlow.setInwardFlowBias(Math.max(0.0, 1.0 - progress), 1.4, progress);
        vacuumSheet.setExcitationLevel(0.7 + progress * 0.3);
        vacuumSheet.setSplitProgress(1.0);
        break;

      case 'nuclear_recoil':
        multiAtom.setImpactKick(0.0);
        multiAtom.setTransitionProgress(1.0);
        multiAtom.setWormholeExcitation(0.85);
        multiAtom.setBridgeExcitation(0.65);
        energyFlow.setInwardFlowBias(0.0, 1.2, 1.0);
        break;

      case 'deep_dissipation':
        // Accelerate vortex through throat into Einstein-Rosen bridge and Janus antimatter sector
        multiAtom.setImpactKick(0.0);
        multiAtom.setTransitionProgress(1.0);
        multiAtom.setWormholeExcitation(1.0);
        multiAtom.setBridgeExcitation(1.0);
        energyFlow.setInwardFlowBias(0.0, 1.5, 1.0);
        break;

      case 'relaxation':
        multiAtom.setImpactKick(0.0);
        multiAtom.setWormholeExcitation(Math.max(0.0, 1.0 - progress * 2.0));
        multiAtom.setBridgeExcitation(Math.max(0.0, 1.0 - progress * 2.0));
        if (progress > 0.4) {
          const relax = (progress - 0.4) / 0.6;
          multiAtom.setTransitionProgress(Math.max(0.0, 1.0 - relax * 2.2));
          energyFlow.setInwardFlowBias(0.0, Math.max(1.0, 1.2 - relax * 0.2), Math.max(0.0, 1.0 - relax));
        } else {
          multiAtom.setTransitionProgress(1.0);
        }
        break;
    }
  });

  // 14. Connect Breadcrumb Navigation
  const crumbAtom = document.getElementById('crumb-atom');
  const crumbNucleon = document.getElementById('crumb-nucleon');
  const crumbQuark = document.getElementById('crumb-quark');
  const btnJanusToggle = document.getElementById('btn-janus-toggle');
  const btnLevelBack = document.getElementById('btn-level-back');
  const levelHint = document.getElementById('level-hint');

  crumbAtom?.addEventListener('click', () => levelManager.setLevel(LEVELS.ATOM));
  crumbNucleon?.addEventListener('click', () => levelManager.setLevel(LEVELS.NUCLEON, { isProton: true }));
  crumbQuark?.addEventListener('click', () => levelManager.setLevel(LEVELS.QUARK, { type: 'up', charge: '+⅔ e' }));

  btnJanusToggle?.addEventListener('click', () => {
    if (levelManager.currentLevel === LEVELS.JANUS) {
      levelManager.goBack();
    } else {
      levelManager.setLevel(LEVELS.JANUS);
    }
  });

  btnLevelBack?.addEventListener('click', () => {
    levelManager.goBack();
  });

  // Level change synchronizer
  levelManager.on('levelChange', ({ level, prevLevel, details, canGoBack }) => {
    storageManager.update({ playback: { currentLevel: level } });

    // 1. Process simulator is tied to atomic level (ATOM)
    if (level !== LEVELS.ATOM) {
      processSimulator.pause();
      processSimulator.reset();
    }
    // Megjegyzés: A "Szimulációs idő & kamera" (syncEngine) megőrzi állapotát a nézetváltások során!

    const procTele = processSimulator.getTelemetry();
    ctrlPanel.updateProcessUI(procTele);
    displayPanel.updateProcessTelemetry(procTele);

    // 2. Update breadcrumb active states
    crumbAtom?.classList.toggle('active', level === LEVELS.ATOM);
    crumbNucleon?.classList.toggle('active', level === LEVELS.NUCLEON);
    crumbQuark?.classList.toggle('active', level === LEVELS.QUARK);
    btnJanusToggle?.classList.toggle('active', level === LEVELS.JANUS);

    if (btnLevelBack) {
      btnLevelBack.style.display = canGoBack ? 'inline-block' : 'none';
    }

    // 3. Dynamic helper hint
    updateHint(level);

    // If switching to nucleon level, ensure interior layers are visible
    if (level === LEVELS.NUCLEON) {
      nucleonInterior.setLayerVisibility('showBag', true);
      nucleonInterior.setLayerVisibility('showFluxTubes', true);
      nucleonInterior.setLayerVisibility('showSea', true);
    }

    // 4. Update Control Panel & Display Panel with current level and context
    ctrlPanel.setLevel(level, details);
    displayPanel.setLevelState(level, details);

    // 5. Refresh interactive meshes for Raycaster
    refreshInteractiveTargets(level);
  });

  // 14.5. Language & Font Size Toolbar Controllers
  const updateHint = (lvl) => {
    if (levelHint) {
      levelHint.textContent = i18n.t('tipPrefix', '💡 Tip: ') + i18n.t(`tips.${lvl}`);
    }
  };

  const setAppLanguage = (lang) => {
    i18n.setLanguage(lang);
    document.documentElement.lang = lang;
    document.querySelectorAll('.btn-lang').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    document.querySelectorAll('header [data-i18n]').forEach(el => {
      el.textContent = i18n.t(el.dataset.i18n, el.textContent);
    });
    document.querySelectorAll('header [data-i18n-title]').forEach(el => {
      el.title = i18n.t(el.dataset.i18nTitle, el.title);
    });
    updateHint(levelManager.currentLevel);
    storageManager.update({ settings: { language: lang } });
  };

  // Wire Language Toolbar Buttons
  document.querySelectorAll('.btn-lang').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === initialLang);
    btn.addEventListener('click', () => setAppLanguage(btn.dataset.lang));
  });

  // Initial language pass on static header elements
  setAppLanguage(initialLang);

  i18n.on('languageChange', () => {
    updateTopPauseBtn(engine.syncEngine.isPaused);
    dockButtons.forEach(btn => {
      const key = `controlPanel.cam${btn.dataset.cam.charAt(0).toUpperCase() + btn.dataset.cam.slice(1)}`;
      btn.textContent = i18n.t(key, btn.textContent);
    });
  });

  // 15. Connect UI events to 3D components and Engine

  // Process Simulator UI triggers
  ctrlPanel.on('toggleProcessPlay', () => {
    const isPlaying = processSimulator.togglePlay();
    if (isPlaying && engine.syncEngine.isPaused) {
      engine.syncEngine.setPaused(false);
      ctrlPanel.setPauseState(false);
      updateTopPauseBtn(false);
    }
  });

  ctrlPanel.on('nextProcessPhase', () => {
    processSimulator.nextPhase();
    if (processSimulator.isPlaying && engine.syncEngine.isPaused) {
      engine.syncEngine.setPaused(false);
      ctrlPanel.setPauseState(false);
      updateTopPauseBtn(false);
    }
  });

  ctrlPanel.on('prevProcessPhase', () => {
    processSimulator.prevPhase();
  });

  ctrlPanel.on('resetProcess', () => {
    processSimulator.reset();
  });

  ctrlPanel.on('setProcessPhase', (phaseId) => {
    processSimulator.setPhase(phaseId);
    if (processSimulator.isPlaying && engine.syncEngine.isPaused) {
      engine.syncEngine.setPaused(false);
      ctrlPanel.setPauseState(false);
      updateTopPauseBtn(false);
    }
  });

  // Level Switch from ControlPanel
  ctrlPanel.on('changeLevel', (lvl) => {
    if (lvl === LEVELS.ATOM) levelManager.setLevel(LEVELS.ATOM);
    else if (lvl === LEVELS.NUCLEON) levelManager.setLevel(LEVELS.NUCLEON, { isProton: true });
    else if (lvl === LEVELS.QUARK) levelManager.setLevel(LEVELS.QUARK, { type: 'up', charge: '+⅔ e' });
    else if (lvl === LEVELS.JANUS) levelManager.setLevel(LEVELS.JANUS);
  });

  // Change Atomic Number Z (1..126)
  ctrlPanel.on('changeZ', (Z) => {
    const valOrb = getElementValenceOrbital(Z);
    storageManager.update({ playback: { Z, selectedOrbital: valOrb } });
    multiAtom.setPrimaryZ(Z);
    multiAtom.setOrbitalConfig(valOrb.n, valOrb.l, valOrb.m, false);
    vacuumSheet.setSources(multiAtom.getGravitySources());

    ctrlPanel.setOrbitalState(valOrb.n, valOrb.l, valOrb.m);

    // Recompute the element-specific excitation channel & orbital relaxation
    preferredSubshell = null;
    refreshExcitationChannel();

    if (levelManager.currentLevel === LEVELS.ATOM) {
      refreshInteractiveTargets(LEVELS.ATOM);
    }
  });

  // Change which subshell electron absorbs the excitation (null = auto/valence)
  ctrlPanel.on('changeExcitationSubshell', (sub) => {
    preferredSubshell = sub;
    refreshExcitationChannel();
  });

  // Shapes -> Elem synchronization
  ctrlPanel.on('changeShapesConfig', ({ n, l, m, ms, syncElement }) => {
    const msVal = ms !== undefined ? ms : 0.5;
    storageManager.update({ playback: { selectedOrbital: { n, l, m, ms: msVal } } });
    const updatedZ = multiAtom.setOrbitalConfig(n, l, m, syncElement, msVal);
    if (updatedZ !== null) {
      storageManager.update({ playback: { Z: updatedZ } });
      ctrlPanel.updateElementState(updatedZ);
      vacuumSheet.setSources(multiAtom.getGravitySources());
      if (levelManager.currentLevel === LEVELS.ATOM) {
        refreshInteractiveTargets(LEVELS.ATOM);
      }
    }
  });

  // Presets
  ctrlPanel.on('applyPreset', (presetName) => {
    storageManager.update({ playback: { preset: presetName } });
    multiAtom.applyPreset(presetName);

    const presetConfig = LAYER_PRESETS.find(p => p.id === presetName);
    const presetState = getPresetLayerState(presetName);

    if (presetState) {
      storageManager.update({ layers: presetState });

      // Szinkronizáljuk a külső rendszerek (vákuum, nyaláb, energiaáramlás) állapotát
      vacuumSheet.setSurfaceVisible(!!presetState.vacuum);
      vacuumSheet.setWireframeVisible(!!presetState.vacuumWire);

      const efShowPhotons = !!presetState.energyFlow;
      const efShowPairs = !!presetState.virtualPairs;
      layerShowPhotons = efShowPhotons;
      layerShowPairs = efShowPairs;
      energyFlow.setParameters({ showPhotons: efShowPhotons, showVirtualPairs: efShowPairs });
      energyFlow.setVisible(efShowPhotons || efShowPairs);

      externalBeam.setParameters({ showBeam: !!presetState.beam });
      externalBeam.setVisible(!!presetState.beam);
    }

    if (presetConfig && presetConfig.orbitalState) {
      const { n, l, m, ms } = presetConfig.orbitalState;
      const msVal = ms !== undefined ? ms : 0.5;
      ctrlPanel.setOrbitalState(n, l, m, msVal);
      multiAtom.setOrbitalConfig(n, l, m, false, msVal);
      storageManager.update({ playback: { selectedOrbital: { n, l, m, ms: msVal } } });
    }

    if (presetConfig && presetConfig.cutawayAngle !== undefined) {
      multiAtom.setCutawayAngle(presetConfig.cutawayAngle);
      ctrlPanel.setCutawayState(presetConfig.cutawayAngle);
    }

    if (presetConfig && presetConfig.cameraPreset) {
      engine.setCameraPreset(presetConfig.cameraPreset);
      dockButtons.forEach(b => b.classList.toggle('active', b.dataset.cam === presetConfig.cameraPreset));
    }
  });

  // Cutaway change
  ctrlPanel.on('cutawayChange', ({ cutawayAngle }) => {
    multiAtom.setCutawayAngle(cutawayAngle);
  });

  // SU(2) Spinor phase change (5. coordinate)
  ctrlPanel.on('su2PhaseChange', ({ angleRad, angleDeg }) => {
    multiAtom.setSu2Angle(angleRad);
    storageManager.update({ playback: { su2Angle: angleDeg } });
  });

  // Drum modes
  ctrlPanel.on('changeDrumConfig', ({ modeIndex }) => {
    storageManager.update({ playback: { drumModeIndex: modeIndex } });
    multiAtom.atoms.forEach((atom) => {
      atom.setDrumMode(modeIndex);
    });
  });

  let layerShowPhotons = !!savedState.layers.energyFlow;
  let layerShowPairs = !!savedState.layers.virtualPairs;

  // Layer toggles
  ctrlPanel.on('toggleLayer', ({ layer, visible }) => {
    storageManager.update({ layers: { [layer]: visible }, playback: { preset: '' } });
    if (layer === 'vacuum') {
      vacuumSheet.setSurfaceVisible(visible);
    } else if (layer === 'vacuumWire') {
      vacuumSheet.setWireframeVisible(visible);
    } else if (layer === 'energyFlow') {
      layerShowPhotons = !!visible;
      energyFlow.setParameters({ showPhotons: layerShowPhotons });
      energyFlow.setVisible(layerShowPhotons || layerShowPairs);
    } else if (layer === 'virtualPairs') {
      layerShowPairs = !!visible;
      energyFlow.setParameters({ showVirtualPairs: layerShowPairs });
      energyFlow.setVisible(layerShowPhotons || layerShowPairs);
    } else if (layer === 'beam') {
      externalBeam.setParameters({ showBeam: !!visible });
      externalBeam.setVisible(visible);
    } else {
      multiAtom.setLayerVisibility(layer, visible);

      // If in nucleon view, synchronize nucleon interior layers too
      if (levelManager.currentLevel === LEVELS.NUCLEON) {
        if (layer === 'nucInterior') {
          nucleonInterior.setLayerVisibility('showBag', visible);
          nucleonInterior.setLayerVisibility('showFluxTubes', visible);
          nucleonInterior.setLayerVisibility('showSea', visible);
        }
      }
    }
  });

  ctrlPanel.on('toggleVacuumWire', (wireframe) => {
    storageManager.update({ layers: { vacuumWire: wireframe }, playback: { vacuumWire: wireframe } });
    vacuumSheet.setWireframeVisible(wireframe);
  });

  ctrlPanel.on('changeVacuumColorMode', (colorMode) => {
    storageManager.update({ playback: { vacuumColorMode: colorMode } });
    vacuumSheet.setColorMode(colorMode);
    settingsModal.setValues({ vacuumColorMode: colorMode });
  });

  ctrlPanel.on('changeDebyeWaller', (fDW) => {
    storageManager.update({ playback: { fDebyeWaller: fDW } });
    processSimulator.setDebyeWallerFactor(fDW);
    settingsModal.setValues({ fDebyeWaller: fDW });
  });

  ctrlPanel.on('triggerRecoilImpulse', () => {
    multiAtom.triggerNuclearRecoil(new THREE.Vector3(0.65, -0.2, 0.75), 0.75);
    vacuumSheet.triggerEntropicShockwave(2.6);
  });

  ctrlPanel.on('changeFlowSpeed', (flowSpeed) => {
    storageManager.update({ playback: { flowSpeed } });
    energyFlow.setParameters({ flowSpeed });
    settingsModal.setValues({ flowSpeed });
  });

  ctrlPanel.on('changeDipDepth', (dipDepth) => {
    storageManager.update({ playback: { dipDepth } });
    energyFlow.setParameters({ dipDepth });
    settingsModal.setValues({ dipDepth });
  });

  // Arrangement (Single, Diatomic, Triatomic, Lattice)
  ctrlPanel.on('changeArrangement', (arr) => {
    storageManager.update({ playback: { arrangement: arr } });
    multiAtom.setArrangement(arr);
    vacuumSheet.setSources(multiAtom.getGravitySources());
    settingsModal.setValues({ arrangement: arr });
    if (levelManager.currentLevel === LEVELS.ATOM) {
      refreshInteractiveTargets(LEVELS.ATOM);
    }
  });

  // Time & Clock
  ctrlPanel.on('togglePause', () => {
    const isPaused = engine.syncEngine.togglePause();
    ctrlPanel.setPauseState(isPaused);
    updateTopPauseBtn(isPaused);
    storageManager.update({ playback: { isPaused } });
  });

  ctrlPanel.on('resetTime', () => {
    engine.syncEngine.resetTime();
  });

  ctrlPanel.on('changeTimeScale', (scale) => {
    engine.syncEngine.setTimeScale(scale);
    if (topSliderTime) topSliderTime.value = scale;
    if (topValTime) topValTime.textContent = `${scale.toFixed(1)}x`;
    storageManager.update({ playback: { timeScale: scale } });
  });

  // Panel State Persistence (Accordion sections & collapse/visibility)
  ctrlPanel.on('collapse', (isCollapsed) => {
    storageManager.update({ panels: { controlPanel: { isCollapsed } } });
  });
  ctrlPanel.on('visibilityChange', (isVisible) => {
    storageManager.update({ panels: { controlPanel: { isVisible } } });
  });
  ctrlPanel.on('accordionToggle', ({ states }) => {
    storageManager.update({ panels: { controlPanel: { accordions: states } } });
  });

  displayPanel.on('collapse', (isCollapsed) => {
    storageManager.update({ panels: { displayPanel: { isCollapsed } } });
  });
  displayPanel.on('visibilityChange', (isVisible) => {
    storageManager.update({ panels: { displayPanel: { isVisible } } });
  });
  displayPanel.on('accordionToggle', ({ states }) => {
    storageManager.update({ panels: { displayPanel: { accordions: states } } });
  });

  // Nucleon specific controls
  ctrlPanel.on('changeNucleonType', ({ isProton }) => {
    nucleonInterior.setNucleonConfig(isProton);
    displayPanel.setLevelState('nucleon', { isProton });
  });

  ctrlPanel.on('toggleNucleonLayer', ({ layer, visible }) => {
    nucleonInterior.setLayerVisibility(layer, visible);
  });

  // Quark specific controls
  ctrlPanel.on('changeQuarkType', (data) => {
    quarkInterior.setQuarkConfig(data);
    displayPanel.setLevelState('quark', data);
  });

  ctrlPanel.on('toggleQuarkLayer', ({ layer, visible }) => {
    quarkInterior.setLayerVisibility(layer, visible);
  });

  // Janus specific controls
  ctrlPanel.on('toggleJanusLayer', ({ layer, visible }) => {
    janusSector.setLayerVisibility(layer, visible);
  });

  // Open Periodic Table Modal
  ctrlPanel.on('openPeriodicTable', (currentZ) => {
    periodicTableModal.open(currentZ);
  });

  periodicTableModal.on('selectElement', (selectedZ) => {
    const valOrb = getElementValenceOrbital(selectedZ);
    storageManager.update({ playback: { Z: selectedZ, selectedOrbital: valOrb } });
    multiAtom.setPrimaryZ(selectedZ);
    multiAtom.setOrbitalConfig(valOrb.n, valOrb.l, valOrb.m, false);
    vacuumSheet.setSources(multiAtom.getGravitySources());

    ctrlPanel.setOrbitalState(valOrb.n, valOrb.l, valOrb.m);
    ctrlPanel.updateElementState(selectedZ);

    preferredSubshell = null;
    refreshExcitationChannel();

    if (levelManager.currentLevel === LEVELS.ATOM) {
      refreshInteractiveTargets(LEVELS.ATOM);
    }
  });

  // Settings Modal wiring
  const btnHeaderSettings = document.getElementById('btn-header-settings');
  btnHeaderSettings?.addEventListener('click', () => {
    settingsModal.setValues(storageManager.getState().playback);
    settingsModal.open();
  });

  settingsModal.on('changeVacuumColorMode', (colorMode) => {
    storageManager.update({ playback: { vacuumColorMode: colorMode } });
    vacuumSheet.setColorMode(colorMode);
    ctrlPanel.setPlaybackUI({ vacuumColorMode: colorMode });
  });

  settingsModal.on('changeDebyeWaller', (fDW) => {
    storageManager.update({ playback: { fDebyeWaller: fDW } });
    processSimulator.setDebyeWallerFactor(fDW);
    ctrlPanel.setPlaybackUI({ fDebyeWaller: fDW });
  });

  settingsModal.on('triggerRecoilImpulse', () => {
    multiAtom.triggerNuclearRecoil(new THREE.Vector3(0.65, -0.2, 0.75), 0.75);
    vacuumSheet.triggerEntropicShockwave(2.6);
  });

  settingsModal.on('changeFlowSpeed', (flowSpeed) => {
    storageManager.update({ playback: { flowSpeed } });
    energyFlow.setParameters({ flowSpeed });
    ctrlPanel.setPlaybackUI({ flowSpeed });
  });

  settingsModal.on('changeDipDepth', (dipDepth) => {
    storageManager.update({ playback: { dipDepth } });
    energyFlow.setParameters({ dipDepth });
    ctrlPanel.setPlaybackUI({ dipDepth });
  });

  settingsModal.on('changeArrangement', (arr) => {
    storageManager.update({ playback: { arrangement: arr } });
    multiAtom.setArrangement(arr);
    vacuumSheet.setSources(multiAtom.getGravitySources());
    ctrlPanel.setPlaybackUI({ arrangement: arr });
    if (levelManager.currentLevel === LEVELS.ATOM) {
      refreshInteractiveTargets(LEVELS.ATOM);
    }
  });

  settingsModal.on('changeDrumConfig', ({ modeIndex }) => {
    storageManager.update({ playback: { drumModeIndex: modeIndex } });
    multiAtom.atoms.forEach((atom) => {
      atom.setDrumMode(modeIndex);
    });
  });

  // Top Simulation Bar (Header Controls)
  const btnTopPausePlay = document.getElementById('btn-top-pause-play');
  const btnTopResetTime = document.getElementById('btn-top-reset-time');
  const topSliderTime = document.getElementById('top-slider-timescale');
  const topValTime = document.getElementById('top-val-timescale');

  const updateTopPauseBtn = (isPaused) => {
    if (btnTopPausePlay) {
      btnTopPausePlay.textContent = isPaused
        ? i18n.t('controlPanel.play', '▶ Play')
        : i18n.t('controlPanel.pause', '⏸️ Pause');
    }
  };

  updateTopPauseBtn(engine.syncEngine.isPaused);
  if (topSliderTime) topSliderTime.value = engine.syncEngine.timeScale;
  if (topValTime) topValTime.textContent = `${engine.syncEngine.timeScale.toFixed(1)}x`;

  btnTopPausePlay?.addEventListener('click', () => {
    const isPaused = engine.syncEngine.togglePause();
    ctrlPanel.setPauseState(isPaused);
    updateTopPauseBtn(isPaused);
    storageManager.update({ playback: { isPaused } });
  });

  btnTopResetTime?.addEventListener('click', () => {
    engine.syncEngine.resetTime();
  });

  topSliderTime?.addEventListener('input', (e) => {
    const scale = parseFloat(e.target.value);
    if (topValTime) topValTime.textContent = `${scale.toFixed(1)}x`;
    engine.syncEngine.setTimeScale(scale);
    storageManager.update({ playback: { timeScale: scale } });
  });

  // Bottom Floating Camera Dock
  const dockButtons = document.querySelectorAll('#camera-dock .btn-dock-cam');
  dockButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dockButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      engine.setCameraPreset(btn.dataset.cam);
    });
  });

  // Camera presets
  ctrlPanel.on('changeCamera', (preset) => {
    dockButtons.forEach(b => b.classList.toggle('active', b.dataset.cam === preset));
    engine.setCameraPreset(preset);
  });

  // 16. Real-time Telemetry updates (throttled to ~20 Hz to avoid per-frame DOM layout thrashing)
  let lastTelemetryUpdateTime = 0;
  const TELEMETRY_INTERVAL_MS = 50;

  engine.syncEngine.on('tick', () => {
    const now = performance.now();
    if (now - lastTelemetryUpdateTime >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryUpdateTime = now;
      const primaryAtom = multiAtom.getPrimaryAtom();
      if (primaryAtom) {
        displayPanel.updateTelemetry(primaryAtom.getTelemetry(), engine.syncEngine);
      }
      const procTele = processSimulator.getTelemetry();
      ctrlPanel.updateProcessUI(procTele);
      displayPanel.updateProcessTelemetry(procTele);
    }
  });

  // 17. Start the engine render loop
  engine.start();

  console.log('⚛️ Universal Quantum Visualisation System initialized with 6-Phase Process Simulator & Embedded Topology.');
});
