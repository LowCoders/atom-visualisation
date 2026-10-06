import * as THREE from 'three';
import { VisualComponent } from '../core/VisualComponent.js';

/**
 * ProjectedJanusSystem: Embedded visualization of the Janus Antimatter Sector (r < 0, dS/dt < 0)
 * in the Atom view coordinates.
 * Features:
 * - Coordinates projected: r' = |r| mapped positively along the vertical axis (y < 0 space)
 * - Upward-arching inverted spacetime polar vacuum sheet (delta g_00 > 0, repulsive gravity)
 * - Vertical Einstein-Rosen wormhole bridge connecting the matter vacuum to the Janus sector
 * - Antiproton nucleus (deep ruby / crimson) with inner anti-quarks (anti-u, anti-d)
 * - Counter-rotating positron orbits (+1e leptons with glowing halos)
 * - Clickable interactive targets that smoothly navigate to LEVELS.JANUS or LEVELS.QUARK
 */
export class ProjectedJanusSystem extends VisualComponent {
  /**
   * @param {string} id
   * @param {Object} [options={}]
   */
  constructor(id = 'projected-janus', options = {}) {
    super(id, {
      name: 'Janus-világ Beágyazott Vetület',
      ...options,
      parameters: {
        yCenter: options.yCenter !== undefined ? options.yCenter : -14.0,
        bridgeTopY: options.bridgeTopY !== undefined ? options.bridgeTopY : -8.0,
        bridgeBottomY: options.bridgeBottomY !== undefined ? options.bridgeBottomY : -12.0,
        positronCount: options.positronCount || 2,
        showSheet: options.showSheet !== undefined ? options.showSheet : true,
        showBridge: options.showBridge !== undefined ? options.showBridge : true,
        showAntiproton: options.showAntiproton !== undefined ? options.showAntiproton : true,
        showPositrons: options.showPositrons !== undefined ? options.showPositrons : true,
        scale: options.scale || 1.0,
        ...options.parameters
      }
    });

    this.bridgeGroup = new THREE.Group();
    this.janusGroup = new THREE.Group();
    this.positronGroup = new THREE.Group();
    this.group.add(this.bridgeGroup);
    this.group.add(this.janusGroup);
    this.janusGroup.add(this.positronGroup);

    this.mirrorSheet = null;
    this.antiNucleus = null;
    this.positrons = [];
    this.bridgeFunnel = null;
    this.bridgeParticles = null;
    this.bridgeParticleData = [];
    this.upperGateRing = null;
    this.lowerGateRing = null;
    this.bridgeExcitation = 0.0;
    this.targetBridgeExcitation = 0.0;

    this.anchorX = 0;
    this.anchorZ = 0;
    this.targetAnchorX = 0;
    this.targetAnchorZ = 0;
    this.currentSagDepth = 2.8;

    this.interactiveObjects = [];
    this.lodLevel = 0;
  }

  setNucleusAnchor(x, z, sagDepth = 2.8) {
    this.targetAnchorX = x;
    this.targetAnchorZ = z;
    if (sagDepth !== undefined) {
      this.currentSagDepth = sagDepth;
    }
  }

  build() {
    this.rebuildSystem();
  }

  rebuildSystem() {
    // Clear existing children
    while (this.bridgeGroup.children.length > 0) {
      const child = this.bridgeGroup.children[0];
      this.bridgeGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    while (this.janusGroup.children.length > 0) {
      const child = this.janusGroup.children[0];
      this.janusGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    this.positronGroup = new THREE.Group();
    this.janusGroup.add(this.positronGroup);

    this.positrons = [];
    this.interactiveObjects = [];
    this.bridgeParticleData = [];

    const yCenter = this.parameters.yCenter;
    const bridgeTopY = this.parameters.bridgeTopY !== undefined ? this.parameters.bridgeTopY : -8.0;
    const bridgeBottomY = this.parameters.bridgeBottomY !== undefined ? this.parameters.bridgeBottomY : -12.0;
    this.janusGroup.position.set(0, yCenter, 0);

    // =========================================================================
    // 1. VERTICAL WORMHOLE BRIDGE / EINSTEIN-ROSEN CORRIDOR
    // =========================================================================
    if (this.parameters.showBridge) {
      const bridgeHeight = Math.abs(bridgeTopY - bridgeBottomY);
      const bridgeMidY = (bridgeTopY + bridgeBottomY) / 2;

      // Hyperboloid bridge tube
      const bGeo = new THREE.CylinderGeometry(1.5, 1.5, bridgeHeight, 32, 24, true);
      const bPos = bGeo.attributes.position;
      const r0 = 0.65; // Waist radius at center
      const rGate = 1.5; // Top & bottom docking gateway radius
      const halfH = bridgeHeight / 2;
      const flare = (rGate * rGate - r0 * r0) / (halfH * halfH);

      for (let i = 0; i < bPos.count; i++) {
        const yLocal = bPos.getY(i);
        const curR = Math.sqrt(bPos.getX(i) * bPos.getX(i) + bPos.getZ(i) * bPos.getZ(i));
        const targetR = Math.sqrt(r0 * r0 + flare * yLocal * yLocal);
        const scale = curR > 0.0001 ? targetR / curR : 1.0;
        bPos.setX(i, bPos.getX(i) * scale);
        bPos.setZ(i, bPos.getZ(i) * scale);
      }
      bGeo.computeVertexNormals();

      const bMat = new THREE.MeshStandardMaterial({
        color: 0x4a044e,
        emissive: 0x86198f,
        emissiveIntensity: 0.45,
        roughness: 0.2,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.bridgeFunnel = new THREE.Mesh(bGeo, bMat);
      this.bridgeFunnel.position.set(0, bridgeMidY, 0);
      this.bridgeFunnel.userData = {
        interactiveType: 'wormhole',
        interactiveData: { type: 'janus_bridge', label: 'Einstein-Rosen híd (Janus átjáró)' }
      };
      this.bridgeGroup.add(this.bridgeFunnel);
      this.interactiveObjects.push(this.bridgeFunnel);

      // Wireframe overlay on bridge
      const bWireMat = new THREE.MeshBasicMaterial({
        color: 0xd946ef,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });
      const bWire = new THREE.Mesh(bGeo, bWireMat);
      bWire.position.copy(this.bridgeFunnel.position);
      this.bridgeGroup.add(bWire);

      // Upper gateway ring (at matter vacuum sheet level, y = -8.0)
      const ringTopGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 48);
      const ringTopMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      this.upperGateRing = new THREE.Mesh(ringTopGeo, ringTopMat);
      this.upperGateRing.rotation.x = Math.PI / 2;
      this.upperGateRing.position.set(0, bridgeTopY, 0);
      this.bridgeGroup.add(this.upperGateRing);

      // Lower gateway ring (at Janus world entrance / mirror sheet throat, y = -12.0)
      const ringBotGeo = new THREE.TorusGeometry(1.5, 0.08, 16, 48);
      const ringBotMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      this.lowerGateRing = new THREE.Mesh(ringBotGeo, ringBotMat);
      this.lowerGateRing.rotation.x = Math.PI / 2;
      this.lowerGateRing.position.set(0, bridgeBottomY, 0);
      this.bridgeGroup.add(this.lowerGateRing);

      // Virtual particle streams traversing the wormhole
      const pCount = 36;
      const pGeo = new THREE.BufferGeometry();
      const pPositions = new Float32Array(pCount * 3);
      for (let p = 0; p < pCount; p++) {
        pPositions[p * 3 + 0] = (Math.random() - 0.5) * 0.8;
        pPositions[p * 3 + 1] = bridgeBottomY + Math.random() * bridgeHeight;
        pPositions[p * 3 + 2] = (Math.random() - 0.5) * 0.8;
        this.bridgeParticleData.push({
          speed: 1.8 + Math.random() * 2.2,
          radius: 0.3 + Math.random() * 0.45,
          angle: Math.random() * Math.PI * 2,
          direction: p % 2 === 0 ? -1 : 1
        });
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xf472b6,
        size: 0.16,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });
      this.bridgeParticles = new THREE.Points(pGeo, pMat);
      this.bridgeGroup.add(this.bridgeParticles);
    }

    // =========================================================================
    // 2. INVERTED SPACETIME POLAR VACUUM SHEET (UPWARD ARCHING, delta g_00 > 0)
    // =========================================================================
    if (this.parameters.showSheet) {
      const innerR = 1.5;
      const outerR = 18.0;
      const thetaSegs = 48;
      const phiSegs = 32;

      const sheetGeo = new THREE.RingGeometry(innerR, outerR, thetaSegs, phiSegs);
      sheetGeo.rotateX(-Math.PI / 2);
      const sPos = sheetGeo.attributes.position;
      const vertexCount = sPos.count;
      const colors = new Float32Array(vertexCount * 3);

      const baseLevel = -2.5; // Asymptotic base plane at world y = -16.5 (-14.0 - 2.5)
      const domeHeight = 4.5; // Reaches world y = -12.0 at innerR = 1.5 (-14.0 - 2.5 + 4.5)
      const k = 0.12;

      for (let i = 0; i < vertexCount; i++) {
        const x = sPos.getX(i);
        const z = sPos.getZ(i);
        const r = Math.sqrt(x * x + z * z);

        // Upward arching Lorentzian dome: delta g_00 > 0 (repulsive gravity)
        // Passes through yLocal = +2.0 at r = innerR (1.5), decaying to baseLevel (-2.5) at large r
        const rDeltaSq = Math.max(0, r * r - innerR * innerR);
        const upwardArch = baseLevel + domeHeight / (1.0 + k * rDeltaSq);
        sPos.setY(i, upwardArch);

        // Bright, radiant color gradient: Apex is luminous white-rose, fading to vivid violet/magenta
        const normH = Math.max(0.0, Math.min(1.0, (upwardArch - baseLevel) / domeHeight));
        const col = new THREE.Color();
        if (normH > 0.6) {
          col.setHex(0xfda4af).lerp(new THREE.Color(0xffffff), (normH - 0.6) / 0.4);
        } else if (normH > 0.2) {
          col.setHex(0xd946ef).lerp(new THREE.Color(0xfda4af), (normH - 0.2) / 0.4);
        } else {
          col.setHex(0x8b5cf6).lerp(new THREE.Color(0xd946ef), normH / 0.2);
        }
        colors[i * 3 + 0] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
      sPos.needsUpdate = true;
      sheetGeo.computeVertexNormals();
      sheetGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const sheetMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xd946ef,
        emissiveIntensity: 0.35,
        vertexColors: true,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
        roughness: 0.25,
        metalness: 0.2,
        side: THREE.DoubleSide
      });
      this.mirrorSheet = new THREE.Mesh(sheetGeo, sheetMat);
      this.janusGroup.add(this.mirrorSheet);
    }

    // =========================================================================
    // 3. PROJECTED ANTIPROTON NUCLEUS (r' = |r| mapped on apex)
    // =========================================================================
    if (this.parameters.showAntiproton) {
      const antiNucGeo = new THREE.SphereGeometry(0.9, 24, 24);
      const antiNucMat = new THREE.MeshStandardMaterial({
        color: 0x831843,       // Deep ruby
        emissive: 0xbe185d,    // Crimson glow
        emissiveIntensity: 0.6,
        roughness: 0.25,
        transparent: true,
        opacity: 0.85
      });
      this.antiNucleus = new THREE.Mesh(antiNucGeo, antiNucMat);
      this.antiNucleus.position.set(0, 0, 0); // At center of Janus atom (world y = -14.0)

      this.antiNucleus.userData = {
        interactiveType: 'janus',
        interactiveData: {
          type: 'antiproton',
          label: 'Janus Antiproton Mag (r < 0)',
          mass: '-1.67e-27 kg (effektív)'
        }
      };
      this.janusGroup.add(this.antiNucleus);
      this.interactiveObjects.push(this.antiNucleus);

      // Inner wireframe shell
      const wireGeo = new THREE.SphereGeometry(0.93, 14, 14);
      const wireMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        wireframe: true,
        transparent: true,
        opacity: 0.35
      });
      const wireMesh = new THREE.Mesh(wireGeo, wireMat);
      this.antiNucleus.add(wireMesh);

      // 3 Anti-quarks inside antiproton: anti-u (bar{u}), anti-u (bar{u}), anti-d (bar{d})
      const antiQGeo = new THREE.SphereGeometry(0.20, 10, 10);
      for (let q = 0; q < 3; q++) {
        const isAntiUp = q < 2;
        const qMat = new THREE.MeshBasicMaterial({
          color: isAntiUp ? 0xfbbf24 : 0xec4899 // Inverted anti-quark colors
        });
        const qMesh = new THREE.Mesh(antiQGeo, qMat);
        const qAngle = (q / 3) * Math.PI * 2;
        qMesh.position.set(
          Math.cos(qAngle) * 0.42,
          Math.sin(qAngle) * 0.42,
          0
        );
        this.antiNucleus.add(qMesh);
      }
    }

    // =========================================================================
    // 4. POSITRON ORBITALS (+1e Leptons, Counter-Rotating)
    // =========================================================================
    if (this.parameters.showPositrons) {
      const pGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.95
      });

      const haloGeo = new THREE.SphereGeometry(0.40, 12, 12);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfb7185,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const count = this.parameters.positronCount || 2;
      for (let pIdx = 0; pIdx < count; pIdx++) {
        const radius = 2.4 + pIdx * 1.2;
        const tiltX = pIdx === 0 ? 0.35 : -0.35;
        const tiltZ = pIdx === 0 ? -0.25 : 0.25;

        const planeGroup = new THREE.Group();
        planeGroup.position.set(0, 0, 0); // Centered at Janus atom (world y = -14.0)
        planeGroup.rotation.x = tiltX;
        planeGroup.rotation.z = tiltZ;
        this.positronGroup.add(planeGroup);

        // Orbit track ring
        const trackPts = 48;
        const tPts = [];
        for (let i = 0; i <= trackPts; i++) {
          const a = (i / trackPts) * Math.PI * 2;
          tPts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
        }
        const tGeo = new THREE.BufferGeometry().setFromPoints(tPts);
        const tMat = new THREE.LineBasicMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.38
        });
        const tLine = new THREE.Line(tGeo, tMat);
        planeGroup.add(tLine);

        // Positron particle with halo
        const pMesh = new THREE.Mesh(pGeo, pMat);
        const hMesh = new THREE.Mesh(haloGeo, haloMat);
        pMesh.add(hMesh);
        planeGroup.add(pMesh);

        pMesh.userData = {
          interactiveType: 'janus',
          interactiveData: {
            type: 'positron',
            charge: '+1 e',
            label: `Pozitron #${pIdx + 1} (Antianyag)`
          }
        };
        this.interactiveObjects.push(pMesh);

        this.positrons.push({
          mesh: pMesh,
          radius,
          speed: pIdx === 0 ? -1.8 : 1.4, // Counter-rotating
          angle: pIdx * Math.PI
        });
      }
    }

    this.updateSublayerVisibility();
  }

  setLOD(lod, distance) {
    this.lodLevel = lod;
    // Faint overview at LOD 0, radiant at LOD 1 & 2
    const targetOpacity = lod === 0 ? 0.28 : 0.45;
    if (this.mirrorSheet && this.mirrorSheet.material) {
      this.mirrorSheet.material.opacity = targetOpacity;
    }
    if (this.bridgeFunnel && this.bridgeFunnel.material) {
      this.bridgeFunnel.material.opacity = lod === 0 ? 0.30 : 0.55;
    }
  }

  getInteractiveObjects() {
    return this.interactiveObjects.map(mesh => ({
      mesh,
      data: mesh.userData.interactiveData || {},
      type: mesh.userData.interactiveType || 'janus'
    }));
  }

  setBridgeExcitation(intensity = 0.0) {
    this.targetBridgeExcitation = Math.max(0.0, Math.min(1.0, intensity));
  }

  onUpdate(time, deltaTime, syncEngine) {
    // 0. Smooth dynamic collinear alignment with nucleus position & recoil offset
    if (this.targetAnchorX !== undefined) {
      this.anchorX = THREE.MathUtils.lerp(this.anchorX, this.targetAnchorX, Math.min(1.0, deltaTime * 8.0));
      this.anchorZ = THREE.MathUtils.lerp(this.anchorZ, this.targetAnchorZ, Math.min(1.0, deltaTime * 8.0));
      this.group.position.x = this.anchorX;
      this.group.position.z = this.anchorZ;
    }

    // Interpolate bridge excitation
    this.bridgeExcitation = THREE.MathUtils.lerp(
      this.bridgeExcitation,
      this.targetBridgeExcitation,
      Math.min(1.0, deltaTime * 4.0)
    );
    const exc = this.bridgeExcitation;
    const speedBoost = 1.0 + exc * 2.5;

    // 1. Positron counter-rotation
    for (const p of this.positrons) {
      p.angle += deltaTime * p.speed * (1.0 + exc * 0.5);
      p.mesh.position.set(
        Math.cos(p.angle) * p.radius,
        Math.sin(p.angle * 2.0) * 0.12,
        Math.sin(p.angle) * p.radius
      );
    }

    // 2. Gateway torus spin
    if (this.upperGateRing) this.upperGateRing.rotation.z += deltaTime * (1.5 * speedBoost);
    if (this.lowerGateRing) this.lowerGateRing.rotation.z -= deltaTime * (1.5 * speedBoost);

    // 3. Wormhole bridge particle flow (strictly bounded between bridgeTopY and bridgeBottomY)
    if (this.bridgeParticles && this.bridgeParticleData.length > 0) {
      const posAttr = this.bridgeParticles.geometry.attributes.position;
      const bridgeTopY = this.parameters.bridgeTopY !== undefined ? this.parameters.bridgeTopY : -8.0;
      const bridgeBottomY = this.parameters.bridgeBottomY !== undefined ? this.parameters.bridgeBottomY : -12.0;
      const bridgeHeight = Math.abs(bridgeTopY - bridgeBottomY);
      const bridgeMidY = (bridgeTopY + bridgeBottomY) / 2;
      const halfH = bridgeHeight / 2;
      const flare = (1.5 * 1.5 - 0.65 * 0.65) / (halfH * halfH);

      for (let p = 0; p < this.bridgeParticleData.length; p++) {
        const d = this.bridgeParticleData[p];
        d.angle += deltaTime * (2.2 * speedBoost);
        let curY = posAttr.getY(p) + d.direction * d.speed * speedBoost * deltaTime;

        // Wrap around bridge height
        if (curY < bridgeBottomY) curY = bridgeTopY;
        if (curY > bridgeTopY) curY = bridgeBottomY;

        posAttr.setY(p, curY);

        // Hyperbolic radius at height curY
        const yLocal = curY - bridgeMidY;
        const curR = Math.sqrt(0.65 * 0.65 + flare * yLocal * yLocal) * 0.82;
        posAttr.setX(p, Math.cos(d.angle) * curR);
        posAttr.setZ(p, Math.sin(d.angle) * curR);
      }
      posAttr.needsUpdate = true;

      if (this.bridgeParticles.material) {
        this.bridgeParticles.material.size = 0.16 + exc * 0.12;
        this.bridgeParticles.material.opacity = 0.80 + exc * 0.20;
      }
    }

    if (this.bridgeFunnel && this.bridgeFunnel.material) {
      this.bridgeFunnel.material.emissiveIntensity = 0.45 + exc * 0.45;
    }

    // 4. Inverted vacuum sheet pulsation (reverse entropy waves)
    if (this.mirrorSheet) {
      const sPos = this.mirrorSheet.geometry.attributes.position;
      const phase = syncEngine.vacuumPhase || time * 2.0;
      const innerR = 1.5;
      const baseLevel = -2.5;
      const domeHeight = 4.5;
      const k = 0.12;

      for (let i = 0; i < sPos.count; i++) {
        const x = sPos.getX(i);
        const z = sPos.getZ(i);
        const r = Math.sqrt(x * x + z * z);
        const rDeltaSq = Math.max(0, r * r - innerR * innerR);
        const baseArch = baseLevel + domeHeight / (1.0 + k * rDeltaSq);
        // Collar pinning ensures lower gate ring connection stays hermetic
        const collarPin = Math.min(1.0, (r - innerR) / 1.0);
        const wave = 0.08 * Math.sin(r * 1.6 - phase * 1.4) * collarPin;
        sPos.setY(i, baseArch + wave);
      }
      sPos.needsUpdate = true;
    }

    // 5. Antiproton nucleus: continuous CPT time-reversed rotation, precession & breathing
    if (this.antiNucleus) {
      const nPhase = syncEngine.nucleusPhase || time * 2.0;
      const breath = 1.0 + 0.03 * Math.sin(nPhase * 1.8);
      this.antiNucleus.scale.setScalar(breath);

      // CPT counter-rotation (-1.4 rad/s) & subtle precession wobble
      const nucRotSpeed = 1.4 * (1.0 + exc * 0.5);
      this.antiNucleus.rotation.y -= deltaTime * nucRotSpeed;
      this.antiNucleus.rotation.z = Math.sin(time * 0.8) * 0.12;
      this.antiNucleus.rotation.x = Math.cos(time * 0.8) * 0.06;
    }
  }

  updateSublayerVisibility() {
    if (this.bridgeGroup) this.bridgeGroup.visible = !!this.parameters.showBridge;
    if (this.mirrorSheet) this.mirrorSheet.visible = !!this.parameters.showSheet;
    if (this.antiNucleus) this.antiNucleus.visible = !!this.parameters.showAntiproton;
    if (this.positronGroup) this.positronGroup.visible = !!this.parameters.showPositrons;
    this.group.visible = !!(
      this.parameters.showBridge ||
      this.parameters.showSheet ||
      this.parameters.showAntiproton ||
      this.parameters.showPositrons
    );
  }

  onParametersChanged(params) {
    if (
      params.yCenter !== undefined ||
      params.bridgeTopY !== undefined ||
      params.bridgeBottomY !== undefined ||
      params.positronCount !== undefined
    ) {
      this.rebuildSystem();
    } else {
      if (params.showBridge !== undefined) this.parameters.showBridge = !!params.showBridge;
      if (params.showSheet !== undefined) this.parameters.showSheet = !!params.showSheet;
      if (params.showAntiproton !== undefined) this.parameters.showAntiproton = !!params.showAntiproton;
      if (params.showPositrons !== undefined) this.parameters.showPositrons = !!params.showPositrons;
      this.updateSublayerVisibility();
    }
  }

  dispose() {
    super.dispose();
    this.positrons = [];
    this.interactiveObjects = [];
  }
}
