import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * ExternalBeamSystem: Level 0 / Scattering & Radiation Continuum.
 * Features:
 * - Hyperbolic trajectory of incoming test electron (E_kin = 15.0 eV)
 * - QED Scattering Vertex spark & virtual photon exchange bridge
 * - Deflected, slowed outgoing electron (E_kin = 4.8 eV)
 * - Emitted real Lyman-α photon wavepacket (λ = 121.6 nm, 10.2 eV) with transverse E/B oscillations
 * - Fully synchronized with ProcessSimulator state
 */
export class ExternalBeamSystem extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'external-beam', options = {}) {
    super(id, {
      name: 'Szórási Kontinuum & Külső Nyaláb',
      ...options,
      parameters: {
        beamEnergyEV: options.beamEnergyEV || 15.0,
        scatterAngleDeg: options.scatterAngleDeg || 52,
        impactParam: options.impactParam || 2.4, // b ~ 1-2 Å
        showTrack: options.showTrack !== undefined ? options.showTrack : true,
        showBeam: options.showBeam !== undefined ? options.showBeam : (options.visible !== undefined ? options.visible : true),
        ...options.parameters
      }
    });

    this.processSim = null; // Reference to ProcessSimulator

    // Trajectory curves & markers
    this.trackLine = null;
    this.electronMesh = null;
    this.electronAura = null;
    this.vertexSpark = null;
    this.virtualBridge = null;

    // Outgoing Lyman-alpha photon wavepacket
    this.photonWaveGroup = new THREE.Group();
    this.photonPoints = [];
    this.photonLine = null;
    this.isPhotonActive = false;
    this.photonProgress = 0.0;

    this.group.add(this.photonWaveGroup);

    // Hyperbolic path points cached
    this.inCurve = null;
    this.outCurve = null;
    this.vertexPoint = new THREE.Vector3(1.6, 0.8, 1.4);

    // Dynamic references
    this.vacuumSheet = null;
    this.atomSystem = null;
    this.energyShockwave = null;
    this.departCurve = null;
  }

  setVacuumSheet(vacuumSheet) {
    this.vacuumSheet = vacuumSheet;
  }

  setAtomSystem(atomSystem) {
    this.atomSystem = atomSystem;
  }

  /**
   * Sets the current element's excitation channel so the beam energetics
   * (transferred energy, residual electron energy, emitted photon color/wavelength)
   * match the selected atom instead of the fixed hydrogen Lyman-alpha values.
   * @param {Object} channel - result of getExcitationChannel()
   */
  setExcitationChannel(channel) {
    if (!channel) return;
    this.channel = channel;
    this.parameters.deltaEV = channel.deltaE;
    this.parameters.residualEV = channel.residualEnergyEV;

    // Recolor the emitted photon wavepacket to match the transition wavelength
    if (this.photonLine && this.photonLine.geometry) {
      const col = this.photonLine.geometry.attributes.color;
      if (col) {
        const c = new THREE.Color(channel.photonColor.hex);
        for (let i = 0; i < col.count; i++) {
          c.toArray(col.array, i * 3);
        }
        col.needsUpdate = true;
      }
    }
  }

  setProcessSimulator(sim) {
    this.processSim = sim;
    sim.on('photonEmitted', () => {
      this.triggerPhotonEmission();
    });
    sim.on('reset', () => {
      this.resetPhoton();
    });
  }

  build() {
    this.initHyperbolicTrack();
    this.initElectronParticle();
    this.initQEDVertex();
    this.initPhotonWavepacket();
  }

  initHyperbolicTrack() {
    const b = this.parameters.impactParam;
    const startPt = new THREE.Vector3(-24, 2.5, -12);
    const midCtrl = new THREE.Vector3(-6, 1.2, -3);
    const vPt = this.vertexPoint;
    const outCtrl = new THREE.Vector3(8, 2.0, 5);
    const endPt = new THREE.Vector3(26, 6.0, 15);

    this.inCurve = new THREE.QuadraticBezierCurve3(startPt, midCtrl, vPt);
    this.outCurve = new THREE.QuadraticBezierCurve3(vPt, outCtrl, endPt);

    const fullPoints = [
      ...this.inCurve.getPoints(36),
      ...this.outCurve.getPoints(36)
    ];

    const trackGeo = new THREE.BufferGeometry().setFromPoints(fullPoints);
    const trackMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      dashSize: 0.5,
      gapSize: 0.3,
      depthWrite: false
    });

    this.trackLine = new THREE.Line(trackGeo, trackMat);
    this.trackLine.computeLineDistances();
    this.trackLine.visible = false; // Hidden until process starts
    this.group.add(this.trackLine);
  }

  initElectronParticle() {
    const eGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const eMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
    this.electronMesh = new THREE.Mesh(eGeo, eMat);

    // Cyan glowing wavepacket aura
    const auraGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.electronAura = new THREE.Mesh(auraGeo, auraMat);
    this.electronMesh.add(this.electronAura);

    this.electronMesh.visible = false;
    this.group.add(this.electronMesh);
  }

  initQEDVertex() {
    // Concentrated absorption spark at closest approach (intense, focused glow, not an exploding shell)
    const vGeo = new THREE.SphereGeometry(0.36, 16, 16);
    const vMat = new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.vertexSpark = new THREE.Mesh(vGeo, vMat);
    this.vertexSpark.position.copy(this.vertexPoint);
    this.vertexSpark.visible = false;
    this.group.add(this.vertexSpark);

    // Inward virtual photon energy channel from collision vertex directly to atom nucleus (0,0,0)
    const bridgeGeo = new THREE.BufferGeometry().setFromPoints([
      this.vertexPoint.clone(),
      new THREE.Vector3(0, 0, 0)
    ]);
    const bridgeMat = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.0,
      dashSize: 0.35,
      gapSize: 0.20,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.virtualBridge = new THREE.Line(bridgeGeo, bridgeMat);
    this.virtualBridge.computeLineDistances();
    this.virtualBridge.visible = false;
    this.group.add(this.virtualBridge);
  }

  updateRendezvousTrack() {
    let rendezvousPt = null;
    if (this.atomSystem && this.atomSystem.getPrimaryAtom) {
      const primaryAtom = this.atomSystem.getPrimaryAtom();
      if (primaryAtom && primaryAtom.electrons && primaryAtom.electrons.electrons && primaryAtom.electrons.electrons.length > 0) {
        const es = primaryAtom.electrons;
        const idx = Math.min(es.activeIndex || 0, es.electrons.length - 1);
        const e = es.electrons[idx];
        const curPhase = this.processSim ? this.processSim.getCurrentPhase() : null;
        const progress = this.processSim ? this.processSim.getPhaseProgress() : 0.0;
        const duration = curPhase ? curPhase.duration : 3.2;

        const remainingTime = Math.max(0, (1.0 - progress) * duration);
        let targetAngle = e.currentAngle + e.speed * remainingTime;

        // Ensure collision occurs in the approaching phase (head-on quadrant: moving towards incoming beam)
        // Incoming beam approaches from quadrant III/IV towards origin (roughly from -X, -Z).
        // The electron moves counter-clockwise. In quadrant II (x < 0, z > 0, angle in [PI/2, PI]),
        // its velocity vector is (-speed*sin, +speed*cos) which heads towards negative X and negative Z,
        // directly meeting the incoming beam head-on (Doppler blue-shifted approaching sector).
        const r = e.radius || 2.2;
        const ex = Math.cos(targetAngle) * r;
        const ez = Math.sin(targetAngle) * r;
        const ey = Math.sin(targetAngle * (e.deBroglieN || 2)) * 0.15;

        rendezvousPt = new THREE.Vector3(ex, ey, ez);
        if (e.planeGroup) {
          rendezvousPt.applyEuler(e.planeGroup.rotation);
        }
      }
    }

    if (!rendezvousPt) {
      rendezvousPt = new THREE.Vector3(1.6, 0.8, 1.4);
    }

    // Only update if changed noticeably to avoid excessive allocation
    if (this.vertexPoint.distanceToSquared(rendezvousPt) > 0.001) {
      this.vertexPoint.copy(rendezvousPt);

      const startPt = new THREE.Vector3(-24, 2.5, -12);
      const midCtrl = new THREE.Vector3(-8, 1.4, -4);
      const vPt = this.vertexPoint;
      const outCtrl = vPt.clone().add(new THREE.Vector3(6, 1.2, 4));
      const endPt = new THREE.Vector3(26, 6.0, 15);

      this.inCurve = new THREE.QuadraticBezierCurve3(startPt, midCtrl, vPt);
      this.outCurve = new THREE.QuadraticBezierCurve3(vPt, outCtrl, endPt);

      if (this.trackLine) {
        // During approach, draw ONLY the incoming leg (start -> contact vertex).
        // The outgoing leg is drawn later, from the real contact point, at departure time.
        const fullPoints = this.inCurve.getPoints(48);
        this.trackLine.geometry.setFromPoints(fullPoints);
        this.trackLine.computeLineDistances();
      }

      if (this.vertexSpark) {
        this.vertexSpark.position.copy(vPt);
      }
      if (this.virtualBridge) {
        this.virtualBridge.geometry.setFromPoints([
          vPt.clone(),
          new THREE.Vector3(0, 0, 0)
        ]);
        this.virtualBridge.computeLineDistances();
      }
    }
  }

  /**
   * Rebuild the guide track so its outgoing leg matches the actual departure curve.
   * Draws: incoming leg (start -> real contact point) + departure leg (contact -> exit).
   * @param {THREE.Vector3} contactPt - the real collision point where departure begins
   */
  rebuildTrackWithDeparture(contactPt) {
    if (!this.trackLine || !this.departCurve) return;

    // Incoming leg re-aimed to end exactly at the real contact point
    const startPt = new THREE.Vector3(-24, 2.5, -12);
    const midCtrl = new THREE.Vector3(-8, 1.4, -4);
    const inLeg = new THREE.QuadraticBezierCurve3(startPt, midCtrl, contactPt.clone());

    const fullPoints = [
      ...inLeg.getPoints(40),
      ...this.departCurve.getPoints(40)
    ];
    this.trackLine.geometry.setFromPoints(fullPoints);
    this.trackLine.computeLineDistances();
  }

  initPhotonWavepacket() {
    // Lyman-alpha transverse sine wave packet (E-field / B-field)
    const segments = 48;
    const waveGeo = new THREE.BufferGeometry();
    const pos = new Float32Array((segments + 1) * 3);
    const col = new Float32Array((segments + 1) * 3);

    const uvColor = new THREE.Color(0xa855f7); // Violet/UV

    for (let i = 0; i <= segments; i++) {
      pos[i * 3 + 0] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      uvColor.toArray(col, i * 3);
    }

    waveGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    waveGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const waveMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.photonLine = new THREE.Line(waveGeo, waveMat);
    this.photonWaveGroup.add(this.photonLine);
    this.photonWaveGroup.visible = false;
  }

  triggerPhotonEmission() {
    this.isPhotonActive = true;
    this.photonProgress = 0.0;
    this.photonWaveGroup.visible = true;
  }

  resetPhoton() {
    this.isPhotonActive = false;
    this.photonProgress = 0.0;
    this.photonWaveGroup.visible = false;
  }

  getLiveElectronPos() {
    if (this.atomSystem && this.atomSystem.getPrimaryAtom) {
      const primaryAtom = this.atomSystem.getPrimaryAtom();
      if (primaryAtom && primaryAtom.electrons && primaryAtom.electrons.worldPositions && primaryAtom.electrons.worldPositions.length > 0) {
        const es = primaryAtom.electrons;
        const idx = Math.min(es.activeIndex || 0, es.worldPositions.length - 1);
        return es.worldPositions[idx];
      }
    }
    return null;
  }

  onUpdate(time, deltaTime, syncEngine) {
    if (!this.group.visible) return;

    if (!this.processSim) {
      this.electronMesh.visible = false;
      return;
    }

    const curPhase = this.processSim.getCurrentPhase();
    const progress = this.processSim.getPhaseProgress();

    // 1. Position Electron according to current phase
    if (curPhase.key === 'idle') {
      this.electronMesh.visible = false;
      this.vertexSpark.visible = false;
      this.virtualBridge.visible = false;
      if (this.trackLine) this.trackLine.visible = false;
      if (this.vacuumSheet) {
        this.vacuumSheet.setProjectileSource(0, 0, false, 0);
        this.vacuumSheet.setSplitProgress(0.0);
      }
    } else if (curPhase.key === 'incoming') {
      // Continuously synchronize target endpoint with bound electron's real trajectory
      this.updateRendezvousTrack();

      // Do NOT pre-draw any path before the collision
      if (this.trackLine) this.trackLine.visible = false;
      this.electronMesh.visible = true;
      this.vertexSpark.visible = false;
      this.virtualBridge.visible = false;

      // Incoming particle: bright white-cyan, high energy (15.0 eV), full speed
      this.electronMesh.material.color.setHex(0x00f0ff);
      this.electronMesh.material.emissive.setHex(0x0284c7);
      this.electronAura.material.color.setHex(0x38bdf8);
      this.electronAura.material.opacity = 0.32;

      // Smooth approach: reaches the vertex (electron) exactly at end of incoming (progress 1.0)
      const pos = this.inCurve.getPoint(progress);
      this.electronMesh.position.copy(pos);
      this.electronMesh.scale.setScalar(1.0);

      if (this.vacuumSheet) {
        const sag = THREE.MathUtils.lerp(1.1, 2.2, progress);
        this.vacuumSheet.setProjectileSource(pos.x, pos.z, true, sag);
        this.vacuumSheet.setSplitProgress(0.0);
      }

      const scale = 1.0 + Math.sin(time * 12.0) * 0.15;
      this.electronAura.scale.setScalar(scale);

      // Clear any prior departure curve so it is rebuilt fresh at the next collision
      this.departCurve = null;
    } else if (curPhase.key === 'scattering') {
      // Track stays hidden until the collision happens; then both legs are revealed.
      if (this.trackLine) this.trackLine.visible = false;
      this.electronMesh.visible = true;

      const liveElectron = this.getLiveElectronPos();

      // CONTACT PHASE [0, 0.22]: The incoming particle rides EXACTLY on the bound electron
      // (zero separation) - the energy is being transferred at direct contact.
      // DEPARTURE PHASE [0.22, 1.0]: The now energy-depleted particle deflects away.
      const contactEnd = 0.22;

      if (progress < contactEnd) {
        // Sit exactly on the live electron -> unmistakable direct impact
        if (liveElectron) {
          this.electronMesh.position.copy(liveElectron);
        } else {
          this.electronMesh.position.copy(this.vertexPoint);
        }
        this.departCurve = null;

        // Incoming color still (bright cyan) up to contact
        this.electronMesh.material.color.setHex(0x00f0ff);
        this.electronMesh.material.emissive.setHex(0x0284c7);
        this.electronAura.material.color.setHex(0x38bdf8);
      } else {
        // Build the departure curve once, starting from the actual contact point
        if (!this.departCurve) {
          const startPt = (liveElectron ? liveElectron.clone() : this.vertexPoint.clone());
          const dir = startPt.clone().normalize();
          const outCtrl = startPt.clone().add(new THREE.Vector3(dir.x * 5 + 4, 2.0, dir.z * 5 + 3));
          const endPt = startPt.clone().add(new THREE.Vector3(28, 7, 18));
          this.departCurve = new THREE.QuadraticBezierCurve3(startPt, outCtrl, endPt);

          // Reveal the full incoming + outgoing photon paths only AFTER the collision moment
          this.rebuildTrackWithDeparture(startPt);
        }

        // Now that the collision has occurred, show the guide paths
        if (this.trackLine) this.trackLine.visible = !!this.parameters.showTrack;
        const depFrac = (progress - contactEnd) / (1.0 - contactEnd) * 0.35;
        const pos = this.departCurve.getPoint(depFrac);
        this.electronMesh.position.copy(pos);

        // ENERGY LOSS: scattered particle is red-shifted (orange/amber), dimmer, and smaller
        // 15.0 eV -> 4.8 eV: loses 68% of its energy
        this.electronMesh.material.color.setHex(0xf97316);
        this.electronMesh.material.emissive.setHex(0xea580c);
        this.electronAura.material.color.setHex(0xf97316);
        this.electronMesh.scale.setScalar(0.78);
        this.electronAura.material.opacity = 0.20;
      }

      // Secondary well tracks the projectile's actual position
      if (this.vacuumSheet) {
        const pp = this.electronMesh.position;
        this.vacuumSheet.setProjectileSource(pp.x, pp.z, true, 2.2);
        this.vacuumSheet.setSplitProgress(progress, this.vertexPoint);
      }

      // Sharp contact flash peaking right at the moment of impact (progress ~ 0.11)
      const flash = Math.pow(Math.max(0, Math.sin((progress / contactEnd) * Math.PI)), 3.0);
      this.vertexSpark.visible = (flash > 0.04);
      this.vertexSpark.position.copy(this.electronMesh.position);
      this.vertexSpark.material.opacity = flash * 0.95;
      this.vertexSpark.scale.setScalar(0.35 + flash * 0.4);

      // Virtual energy bridge from contact point to nucleus (energy flooding inward)
      this.virtualBridge.visible = (flash > 0.02);
      this.virtualBridge.material.opacity = flash * 0.90;
      if (this.virtualBridge.geometry) {
        this.virtualBridge.geometry.setFromPoints([
          this.electronMesh.position.clone(),
          new THREE.Vector3(0, 0, 0)
        ]);
        this.virtualBridge.computeLineDistances();
      }
    } else if (curPhase.key === 'orbital_jump' || curPhase.key === 'nuclear_recoil' || curPhase.key === 'deep_dissipation') {
      if (this.trackLine) this.trackLine.visible = !!this.parameters.showTrack;
      this.electronMesh.visible = true;
      this.vertexSpark.visible = false;
      this.virtualBridge.visible = false;

      // Scattered particle keeps its energy-depleted look (orange, dim, smaller)
      this.electronMesh.material.color.setHex(0xf97316);
      this.electronMesh.material.emissive.setHex(0xea580c);
      this.electronAura.material.color.setHex(0xf97316);
      this.electronMesh.scale.setScalar(0.78);
      this.electronAura.material.opacity = 0.20;

      // Continue along the departure curve built during scattering (0.35 -> 1.0)
      let depFrac = 0.35;
      if (curPhase.key === 'orbital_jump') depFrac = 0.35 + progress * 0.30;
      else if (curPhase.key === 'nuclear_recoil') depFrac = 0.65 + progress * 0.22;
      else depFrac = 0.87 + progress * 0.13;
      depFrac = Math.min(1.0, depFrac);

      const curve = this.departCurve || this.outCurve;
      const pos = curve.getPoint(depFrac);
      this.electronMesh.position.copy(pos);

      if (this.vacuumSheet) {
        const active = (depFrac < 0.95);
        const sag = THREE.MathUtils.lerp(2.0, 0.2, depFrac);
        this.vacuumSheet.setProjectileSource(pos.x, pos.z, active, sag);
        this.vacuumSheet.setSplitProgress(1.0, this.vertexPoint);
      }
    } else if (curPhase.key === 'relaxation') {
      // Outgoing electron has left the view
      this.electronMesh.visible = false;
      this.vertexSpark.visible = false;
      this.virtualBridge.visible = false;
      if (this.trackLine) this.trackLine.visible = false;
      if (this.vacuumSheet) {
        this.vacuumSheet.setProjectileSource(0, 0, false, 0);
        this.vacuumSheet.setSplitProgress(0.0);
      }
    }

    // 2. Animate Emitted Lyman-alpha Photon Wavepacket
    if (this.isPhotonActive) {
      this.photonProgress += deltaTime * 1.4;
      if (this.photonProgress > 1.0) {
        this.resetPhoton();
      } else {
        // Photon shoots diagonally outward: direction (14, 18, -10)
        const dir = new THREE.Vector3(14, 18, -10).normalize();
        const dist = this.photonProgress * 32.0;
        const center = dir.clone().multiplyScalar(dist);

        // Update transverse oscillations in wavepacket
        const posAttr = this.photonLine.geometry.getAttribute('position');
        const segments = 48;
        const envelopeLength = 4.2;

        for (let i = 0; i <= segments; i++) {
          const tRel = (i / segments - 0.5) * envelopeLength;
          // Gaussian envelope: exp(-t^2 / 2)
          const env = Math.exp(-Math.pow(tRel / 1.1, 2));
          // Transverse oscillation: E-field along Y/cross
          const osc = Math.sin(tRel * 14.0 + time * 20.0) * env * 0.55;

          const pPos = center.clone().add(dir.clone().multiplyScalar(tRel));
          pPos.y += osc;
          pPos.x += osc * 0.3;

          posAttr.setXYZ(i, pPos.x, pPos.y, pPos.z);
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  dispose() {
    super.dispose();
    if (this.trackLine) this.trackLine.geometry.dispose();
    if (this.electronMesh) this.electronMesh.geometry.dispose();
    if (this.vertexSpark) this.vertexSpark.geometry.dispose();
    if (this.energyShockwave) this.energyShockwave.geometry.dispose();
    if (this.virtualBridge) this.virtualBridge.geometry.dispose();
    if (this.photonLine) this.photonLine.geometry.dispose();
  }
}
