/**
 * ProcessSimulator: Manages the 6-phase dynamic physical process:
 * 1. Incoming external electron (E_kin = 15.0 eV) approaching along a hyperbolic trajectory
 * 2. QED scattering vertex: exchange of virtual photon (Q² transfer), outgoing slowed electron (4.8 eV)
 * 3. Quantum orbital jump on the conformal scale fibre (1s -> 2p_z dipole lobe deformation)
 * 4. Nuclear recoil impulse & collective Yukawa pion-exchange excitation
 * 5. Deep dimensional dissipation towards quark wormhole throat & Heisenberg bounce (+1/r³)
 * 6. Spontaneous radiative relaxation (2p_z -> 1s) with Lyman-α photon wavepacket emission (121.6 nm, 10.2 eV)
 */

import {
  calculateEntropyFlux,
  calculateRecoilDynamics,
  calculateEntropicTimeStep,
  PROTON_MASS_KG
} from './QuantumPhysics.js';
import { EventEmitter } from './EventEmitter.js';

const RYDBERG_EV_PS = 13.6057; // eV (local copy for orbital energy display)

export const PROCESS_PHASES = [
  {
    id: 0,
    key: 'idle',
    title: 'Alapállapot (1s)',
    subtitle: 'Stabil, nyugalmi atomi állapot (E = -13.6 eV)',
    duration: 1.0,
    cameraPreset: 'perspective',
    description: 'Az atom a legalacsonyabb energiaszinten tartózkodik, a hullámfüggvény gömbszimmetrikus 1s pálya.'
  },
  {
    id: 1,
    key: 'incoming',
    title: '1. Fázis: Beeső elektron',
    subtitle: 'Külső szabadelektron közeledik (E_kin = 15.0 eV)',
    duration: 3.2,
    cameraPreset: 'perspective',
    description: 'Nagy energiájú szabad elektron közeledik a kontinuumból hiperbolikus Coulomb-pályán az atom felé.'
  },
  {
    id: 2,
    key: 'scattering',
    title: '2. Fázis: QED szórási vertex',
    subtitle: 'Virtuális foton átadás (Q² > 0) & Szórt elektron',
    duration: 2.8,
    cameraPreset: 'side',
    description: 'A legkisebb megközelítésnél (b ~ 1 Å) QED vertex keletkezik. Egy virtuális foton közvetíti a 10.2 eV-os gerjesztési energiát, a szórt elektron (4.8 eV) eltérülve távozik.'
  },
  {
    id: 3,
    key: 'orbital_jump',
    title: '3. Fázis: Kvantumugrás & Orbitális torzulás',
    subtitle: '1s ➔ 2p_z átrendeződés a konformális skálaszálon',
    duration: 3.5,
    cameraPreset: 'side',
    description: 'A virtuális foton elnyelésével az elektron hullámfüggvénye dipól-oszcillációba kezd, és kétlebenyű 2p_z pályává alakul át (Δl = 1).'
  },
  {
    id: 4,
    key: 'nuclear_recoil',
    title: '4. Fázis: Nukleáris visszalökődés & Yukawa-válasz',
    subtitle: 'Impulzusmegmaradás & virtuális pioncsere megerősödése',
    duration: 3.0,
    cameraPreset: 'orbital',
    description: 'Az atommag átveszi a szórási visszalökési impulzust (Δp_mag = -q). A nukleonok közötti Yukawa pioncsere (π⁰, π⁺, π⁻) filamensek frekvenciája megnő.'
  },
  {
    id: 5,
    key: 'deep_dissipation',
    title: '5. Fázis: Mélységi disszipáció & Heisenberg-pajzs',
    subtitle: 'Kvark féregjárat-torkolat & vákuum deformáció (δg₀₀)',
    duration: 3.2,
    cameraPreset: 'perspective',
    description: 'A virtuális impulzustöbblet mélységi hullámként lecsatolódik a kvarkok belső mikro-torkolatához. A Heisenberg-visszapattanás (+1/r³) pajzsa megakadályozza az összeomlást, lokális vákuumgörbületet keltve.'
  },
  {
    id: 6,
    key: 'relaxation',
    title: '6. Fázis: Spontán relaxáció & Lyman-α foton',
    subtitle: '2p ➔ 1s emisszió: λ = 121.6 nm (10.2 eV)',
    duration: 4.0,
    cameraPreset: 'perspective',
    description: 'A gerjesztett állapot spontán átmenettel lecseng (A₂₁ valószínűséggel). Az atom egy valódi Lyman-α fotoncsomagot sugároz ki fénysebességgel, és visszaáll a stabil 1s alapállapot.'
  }
];

export class ProcessSimulator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.currentPhaseIndex = 0;
    this.phaseTime = 0.0;
    this.isPlaying = false;
    this.isLooping = true;
    this.playbackSpeed = 1.0;

    // Element-specific excitation channel (defaults to hydrogen-like Lyman-alpha)
    this.channel = null;

    // Entropic time (Rovelli thermal time & Barontini model) and nuclear recoil state
    this.accumulatedEntropicTime = 0.0;
    this.entropicVelocity = 1.0;
    this.fDebyeWaller = 0.0; // 0 = free atom (max recoil), ~0.8 = crystal lattice (Mössbauer recoil-free)
    this.currentEntropyFlux = null;
    this.recoilDynamics = null;
  }

  /**
   * Injects the active element's excitation channel so all phase telemetry,
   * transition labels, transferred energy, and emitted photon wavelength adapt
   * to the selected atom (Z = 1..36) instead of the fixed 1s -> 2p_z / 10.2 eV values.
   * @param {Object} channel - result of getExcitationChannel()
   */
  setChannel(channel) {
    this.channel = channel;
  }

  getCurrentPhase() {
    return PROCESS_PHASES[this.currentPhaseIndex];
  }

  getPhaseProgress() {
    const current = this.getCurrentPhase();
    return Math.min(1.0, Math.max(0.0, this.phaseTime / current.duration));
  }

  play() {
    this.isPlaying = true;
    if (this.currentPhaseIndex === 0) {
      this.setPhase(1);
    }
  }

  pause() {
    this.isPlaying = false;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying && this.currentPhaseIndex === 0) {
      this.setPhase(1);
    }
    return this.isPlaying;
  }

  setPhase(phaseIndex) {
    phaseIndex = Math.max(0, Math.min(PROCESS_PHASES.length - 1, phaseIndex));
    if (this.currentPhaseIndex !== phaseIndex) {
      const prevPhase = this.currentPhaseIndex;
      this.currentPhaseIndex = phaseIndex;
      this.phaseTime = 0.0;
      this.emit('phaseChange', {
        phase: this.getCurrentPhase(),
        prevIndex: prevPhase,
        index: this.currentPhaseIndex
      });
    }
  }

  nextPhase() {
    let nextIdx = this.currentPhaseIndex + 1;
    if (nextIdx >= PROCESS_PHASES.length) {
      nextIdx = 0;
    }
    this.setPhase(nextIdx);
  }

  prevPhase() {
    let prevIdx = this.currentPhaseIndex - 1;
    if (prevIdx < 0) {
      prevIdx = PROCESS_PHASES.length - 1;
    }
    this.setPhase(prevIdx);
  }

  setDebyeWallerFactor(val) {
    this.fDebyeWaller = Math.max(0.0, Math.min(1.0, val));
  }

  reset() {
    this.isPlaying = false;
    this.phaseTime = 0.0;
    this.accumulatedEntropicTime = 0.0;
    this.setPhase(0);
    this.emit('reset', { phase: this.getCurrentPhase() });
  }

  update(deltaTime) {
    const curPhase = this.getCurrentPhase();
    const progress = this.getPhaseProgress();

    // Compute dynamic recoil physics and entropy flux
    const ch = this.channel;
    const deltaE = ch ? ch.deltaE : 10.2;
    const massA = ch && ch.element ? ch.element.mass : 1.0;
    const nuclearMassKg = massA * PROTON_MASS_KG;

    this.recoilDynamics = calculateRecoilDynamics(deltaE, nuclearMassKg, this.fDebyeWaller);
    this.currentEntropyFlux = calculateEntropyFlux(curPhase.key, {
      recoilEV: this.recoilDynamics.eRecoilEV,
      fDebyeWaller: this.fDebyeWaller,
      phaseProgress: progress
    });
    this.entropicVelocity = this.currentEntropyFlux.vTau;

    // Advance entropic time when simulator is active (or slow baseline when paused)
    const effectiveDt = this.isPlaying ? (deltaTime * this.playbackSpeed) : (deltaTime * 0.1);
    this.accumulatedEntropicTime += calculateEntropicTimeStep(effectiveDt, this.entropicVelocity);

    if (!this.isPlaying && this.currentPhaseIndex === 0) return;

    if (this.isPlaying) {
      this.phaseTime += deltaTime * this.playbackSpeed;

      // Check for photon emission trigger at 40% of Phase 6
      if (this.currentPhaseIndex === 6 && this.phaseTime >= curPhase.duration * 0.4 && !this._photonTriggered) {
        this._photonTriggered = true;
        this.emit('photonEmitted', {
          wavelengthNm: ch ? ch.lambdaNm : 121.57,
          energyEV: ch ? ch.deltaE : 10.2,
          transition: ch ? `${ch.target.label} -> ${ch.source.label}` : '2p -> 1s'
        });
      }

      if (this.phaseTime >= curPhase.duration) {
        this.phaseTime = 0.0;
        this._photonTriggered = false;

        let nextIdx = this.currentPhaseIndex + 1;
        if (nextIdx >= PROCESS_PHASES.length) {
          if (this.isLooping) {
            nextIdx = 1; // Loop back to incoming electron (skip idle)
          } else {
            nextIdx = 0;
            this.isPlaying = false;
          }
        }
        this.setPhase(nextIdx);
      }
    }

    this.emit('progressUpdate', {
      phase: this.getCurrentPhase(),
      progress: this.getPhaseProgress(),
      timeInPhase: this.phaseTime,
      totalPhases: PROCESS_PHASES.length,
      entropicTime: this.accumulatedEntropicTime,
      entropicVelocity: this.entropicVelocity,
      entropyFlux: this.currentEntropyFlux,
      recoilDynamics: this.recoilDynamics
    });
  }

  getTelemetry() {
    const p = this.getCurrentPhase();
    const progress = this.getPhaseProgress();

    // Element-specific channel values (fallback to hydrogen-like Lyman-alpha)
    const ch = this.channel;
    const dE = ch ? ch.deltaE : 10.2;
    const beamE = ch ? ch.beamEnergyEV : 15.0;
    const residual = ch ? ch.residualEnergyEV : 4.8;
    const srcLabel = ch ? ch.source.label : '1s';
    const tgtLabel = ch ? ch.target.label : '2p_z';
    const lambda = ch ? ch.lambdaNm : 121.57;
    const band = ch ? ch.photonColor.band : 'UV';
    const groundE = ch ? -RYDBERG_EV_PS * ch.zeffInitial * ch.zeffInitial / (ch.source.n * ch.source.n) : -13.6;
    const excitedE = ch ? -RYDBERG_EV_PS * ch.zeffFinal * ch.zeffFinal / (ch.target.n * ch.target.n) : -3.4;
    const dEs = dE.toFixed(2);

    let eKinIn = 0;
    let eKinOut = 0;
    let momentumTransferQ2 = 0;
    let activeOrbital = srcLabel;
    let recoilVelocity = '0.0 km/s';
    let radiatedWave = 'Nincs emisszió';

    switch (p.key) {
      case 'idle':
        eKinIn = 0;
        eKinOut = 0;
        momentumTransferQ2 = '0.0 eV';
        activeOrbital = `${srcLabel} (alapállapot, E = ${groundE.toFixed(1)} eV)`;
        recoilVelocity = '0.0 km/s';
        break;

      case 'incoming':
        eKinIn = beamE;
        momentumTransferQ2 = (progress * 0.2).toFixed(2) + ' eV';
        activeOrbital = `${srcLabel} (stabil)`;
        recoilVelocity = '0.0 km/s';
        break;

      case 'scattering':
        eKinIn = beamE;
        eKinOut = residual;
        momentumTransferQ2 = `ΔE: ${dEs} eV (off-shell csere)`;
        activeOrbital = `${srcLabel} ➔ ${tgtLabel} polarizáció`;
        recoilVelocity = (progress * 1.8).toFixed(1) + ' km/s';
        break;

      case 'orbital_jump':
        eKinOut = residual;
        momentumTransferQ2 = `ΔE: ${dEs} eV (${tgtLabel} tárolt energia)`;
        activeOrbital = `${tgtLabel} (n=${ch ? ch.target.n : 2}, l=${ch ? ch.target.l : 1}, E = ${excitedE.toFixed(1)} eV)`;
        recoilVelocity = '2.4 km/s';
        break;

      case 'nuclear_recoil':
        momentumTransferQ2 = 'Δp_mag: -q (megmaradt)';
        activeOrbital = `${tgtLabel} (rezonáns)`;
        recoilVelocity = (2.4 * (1.0 - progress * 0.4)).toFixed(1) + ' km/s';
        break;

      case 'deep_dissipation':
        momentumTransferQ2 = 'Disszipálódik (tárolt)';
        activeOrbital = `${tgtLabel} (relaxációra kész)`;
        recoilVelocity = '0.8 km/s';
        break;

      case 'relaxation':
        if (progress > 0.4) {
          activeOrbital = `${srcLabel} (alapállapot)`;
          radiatedWave = `λ = ${lambda.toFixed(1)} nm (${band}, ${dEs} eV)`;
          momentumTransferQ2 = '0.0 eV (emittálva)';
        } else {
          activeOrbital = `${tgtLabel} ➔ ${srcLabel} átmenet`;
          momentumTransferQ2 = `ΔE: ${dEs} eV (leadás)`;
        }
        recoilVelocity = '0.2 km/s';
        break;
    }

    return {
      phase: p,
      progress,
      eKinIn,
      eKinOut,
      momentumTransferQ2,
      activeOrbital,
      recoilVelocity,
      radiatedWave,
      channel: ch,
      isPlaying: this.isPlaying,
      entropicTime: this.accumulatedEntropicTime,
      entropicVelocity: this.entropicVelocity,
      entropyFlux: this.currentEntropyFlux,
      recoilDynamics: this.recoilDynamics,
      fDebyeWaller: this.fDebyeWaller
    };
  }
}
