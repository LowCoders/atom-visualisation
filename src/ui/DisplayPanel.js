import { BasePanel } from './BasePanel.js';
import { getNodalStructure, calculateCurvatureMetrics, calculateSpaceQuantization, PROTON_MASS_KG } from '../core/QuantumPhysics.js';
import { i18n } from '../core/I18n.js';

/**
 * DisplayPanel: Glassmorphic real-time telemetry with full support for
 * Level 1 (Atom), Level 2 (Nucleon), Level 3 (Quark/Wormhole), and Janus Antimatter.
 */
export class DisplayPanel extends BasePanel {
  constructor(id = 'display-panel', options = {}) {
    super(id, {
      title: i18n.t('displayPanel.title', 'Quantum Telemetry'),
      icon: '📊',
      position: 'top-right',
      width: 350,
      ...options
    });

    this.currentLevel = 'atom';
    this.levelDetails = {};
    this.cachedTelemetry = null;
    this.cachedProcTele = null;
    this.cachedSyncEngine = null;

    i18n.on('languageChange', () => {
      this.applyTranslations();
    });
  }

  setLevelState(level, details = {}) {
    this.currentLevel = level;
    this.levelDetails = details;
    if (this.panelElement) {
      const body = this.panelElement.querySelector('.panel-body');
      if (body) {
        this.renderContent(body);
        if (this.cachedTelemetry) {
          this.updateTelemetry(this.cachedTelemetry, this.cachedSyncEngine);
        }
        if (this.cachedProcTele) {
          this.updateProcessTelemetry(this.cachedProcTele);
        }
      }
    }
  }

  renderContent(body) {
    switch (this.currentLevel) {
      case 'nucleon':
        this.renderNucleonContent(body);
        break;
      case 'quark':
        this.renderQuarkContent(body);
        break;
      case 'janus':
        this.renderJanusContent(body);
        break;
      case 'atom':
      default:
        this.renderAtomContent(body);
        break;
    }
    this.setupAccordions(body);
  }

  setupAccordions(container) {
    container.querySelectorAll('.section-header-collapsible').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
        const sec = header.closest('.control-section');
        if (sec) {
          sec.classList.toggle('is-collapsed');
          const isCollapsed = sec.classList.contains('is-collapsed');
          const icon = header.querySelector('.section-toggle-icon');
          if (icon) icon.textContent = isCollapsed ? '▸' : '▾';
          if (!isCollapsed) {
            if (this.cachedTelemetry) {
              this.updateTelemetry(this.cachedTelemetry, this.cachedSyncEngine);
            }
            if (this.cachedProcTele) {
              this.updateProcessTelemetry(this.cachedProcTele);
            }
          }
          this.emit('accordionToggle', { sectionId: sec.id, isCollapsed, states: this.getAccordionStates() });
        }
      });
    });
  }

  renderAtomContent(body) {
    body.innerHTML = `
      <div class="level-telemetry-block">
        <!-- 0. ENTRÓPIKUS IDŐNYÍL & TACHOMÉTER (ROVELLI-BARONTINI) -->
        <div class="control-section is-collapsed" id="sec-tele-entropy" style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.28); border-radius: 8px; padding: 8px; margin-bottom: 10px;">
          <div class="section-header-collapsible">
            <div class="section-title" style="color: #c084fc; display: flex; justify-content: space-between; align-items: center; flex: 1; margin-right: 6px;">
              <span data-i18n="displayPanel.entropyTitle">⏳ Entrópikus Időnyíl & Sebesség</span>
              <span id="tele-dw-badge" style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.2); color: #38bdf8;">f_DW = 0.0 (Szabad)</span>
            </div>
            <span class="section-toggle-icon">▸</span>
          </div>

          <div class="section-content">
            <div style="display: flex; align-items: baseline; justify-content: space-between; margin: 6px 0 4px 0;">
              <div>
                <span style="font-size: 11px; color: #94a3b8;" data-i18n="displayPanel.relationalTime">Relációs Idő: </span>
                <span id="tele-tau-time" style="font-size: 16px; font-weight: bold; color: #e879f9; font-family: monospace;">0.00 τ</span>
              </div>
              <div>
                <span style="font-size: 11px; color: #94a3b8;" data-i18n="displayPanel.timeSpeed">Idősebesség v_τ: </span>
                <span id="tele-tau-speed" style="font-size: 14px; font-weight: bold; color: #38bdf8; font-family: monospace;">1.25x</span>
              </div>
            </div>

            <!-- Tachometer Bar -->
            <div style="background: rgba(15, 23, 42, 0.6); height: 7px; border-radius: 4px; overflow: hidden; position: relative; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.08);">
              <div id="tele-tau-meter-bar" style="height: 100%; width: 20%; background: linear-gradient(90deg, #38bdf8, #a855f7, #f43f5e); transition: width 0.15s ease-out;"></div>
            </div>

            <!-- Component entropy breakdown -->
            <div style="font-size: 10px; color: #94a3b8; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              <div><span data-i18n="displayPanel.recoilKick">Recoil lökés (S_rec):</span> <b id="tele-s-recoil" style="color: #f43f5e;">0.00</b></div>
              <div><span data-i18n="displayPanel.qedVertex">QED vertex (S_qed):</span> <b id="tele-s-qed" style="color: #38bdf8;">0.00</b></div>
              <div><span data-i18n="displayPanel.decoh">Dekoherencia (S_dec):</span> <b id="tele-s-decoh" style="color: #fbbf24;">0.00</b></div>
              <div><span data-i18n="displayPanel.throatFlux">Torkolat flux (S_thr):</span> <b id="tele-s-throat" style="color: #c084fc;">0.00</b></div>
            </div>
          </div>
        </div>

        <!-- 0.5. FOLYAMAT DINAMIKA & SZÓRÁS -->
        <div class="control-section is-collapsed" id="sec-tele-process" style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22); border-radius: 8px; padding: 8px; margin-bottom: 10px;">
          <div class="section-header-collapsible">
            <div class="section-title" style="color: #38bdf8;" data-i18n="displayPanel.processTitle">⚡ Folyamat: Szórás ➔ Relaxáció</div>
            <span class="section-toggle-icon">▸</span>
          </div>
          <div class="section-content">
            <table class="tele-table">
              <tr>
                <td data-i18n="displayPanel.phaseLabel">Fázis:</td>
                <td class="text-right" id="tele-proc-phase" style="color: #38bdf8;">0. Alapállapot (1s)</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.incomingEin">Beeső E_in:</td>
                <td class="text-right" id="tele-proc-ein" style="color: #fbbf24;">0.0 eV</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.transferredQ2">Átadott Energia / Q²:</td>
                <td class="text-right" id="tele-proc-q2" style="color: #f43f5e;">0.0 eV</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.magRecoil">Mag Visszalökődés:</td>
                <td class="text-right" id="tele-proc-recoil" style="color: #10b981;">0.0 km/s</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.radiatedPhoton">Kisugárzott Hullám:</td>
                <td class="text-right" id="tele-proc-photon" style="color: #a855f7; font-size: 10.5px;">Nincs emisszió</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.exciteChannel">Gerjesztési csatorna:</td>
                <td class="text-right" id="tele-proc-channel" style="color: #38bdf8; font-size: 10.5px;">1s ➔ 2p (ΔE = 10.2 eV)</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.coreContraction">Mag-relaxáció (Δr/r):</td>
                <td class="text-right" id="tele-proc-contraction" style="color: #10b981; font-size: 10.5px;">nincs</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 0.8. TÉRIDŐ-GÖRBÜLET & KOZMOLÓGIA (POPŁAWSKI / LQC / HUBBLE) -->
        <div class="control-section is-collapsed" id="sec-tele-curvature" style="background: rgba(15, 23, 42, 0.45); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 8px; padding: 8px; margin-bottom: 10px;">
          <div class="section-header-collapsible">
            <div class="section-title" style="color: #38bdf8;" data-i18n="displayPanel.curvTitle">🌌 Téridő-görbület & Kozmológia</div>
            <span class="section-toggle-icon">▸</span>
          </div>
          <div class="section-content">
            <table class="tele-table">
              <tr>
                <td data-i18n="displayPanel.hubbleRate">Hubble Brán-rezsi (H₀):</td>
                <td class="text-right" style="color: #38bdf8;">70.0 km/s/Mpc (2.27·10⁻¹⁸ s⁻¹)</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.poplawskiBounce">Popławski LQC Bounce:</td>
                <td class="text-right" id="tele-lqc-bounce" style="color: #10b981;">f_LQC ≈ 1.0 (összeomlásmentes)</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.planckDensity">Planck Kritikus Sűrűség (ρ_c):</td>
                <td class="text-right" style="color: #94a3b8;">2.1 × 10⁹⁶ kg/m³</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.gravWell">Mag Gravitációs Kút (δg₀₀):</td>
                <td class="text-right" id="tele-metric-dg00" style="color: #f43f5e;">-2.44 (vonzó kút)</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.kretschmann">Kretschmann Skalár (K):</td>
                <td class="text-right" id="tele-kretschmann" style="color: #fbbf24; font-size: 10px;">~10⁻¹⁴⁰ m⁻⁴</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.janusCurv">Janus Tükörszektor görbülete:</td>
                <td class="text-right" style="color: #f43f5e; font-size: 10.5px;">+2.40 δg₀₀ (taszítás, r &lt; 0)</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- 1. ELEM & NUKLEON ADATOK -->
        <div class="control-section" id="sec-tele-element">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="displayPanel.elemTitle">⚛️ Elem & Nukleon Szerkezet</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="telemetry-hero">
              <div class="tele-symbol-box" id="tele-sym-box">
                <span class="tele-sym" id="tele-sym">He</span>
                <span class="tele-z-sub" id="tele-z-sub">2</span>
                <span class="tele-a-sup" id="tele-a-sup">4</span>
              </div>
              <div class="tele-identity">
                <div class="tele-name" id="tele-name">Hélium</div>
                <div class="tele-sub" id="tele-particles">2 proton (p⁺) · 2 neutron (n⁰)</div>
                <div class="tele-notation" id="tele-notation">1s²</div>
              </div>
            </div>

            <!-- 2. METRIKA RÁCS -->
            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label" data-i18n="displayPanel.shells">Héjak (K, L, M)</div>
                <div class="metric-val" id="tele-shells" style="color: #38bdf8;">[ 2 ]</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="displayPanel.totalElectrons">Össz. e⁻</div>
                <div class="metric-val" id="tele-electrons" style="color: #10b981;">2 e⁻</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="displayPanel.valenceSub">Valencia Alhéj</div>
                <div class="metric-val" id="tele-valence-sub" style="color: #fbbf24;">1s</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="displayPanel.vacCurv">Vákuum Görbület</div>
                <div class="metric-val" id="tele-sag" style="color: #f43f5e;">-2.44 δg₀₀</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. KVANTUMSZÁMOK ÉS CSOMÓFELÜLETEK -->
        <div class="control-section is-collapsed" id="sec-tele-quantum">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="displayPanel.quantumStateTitle">📐 Kvantumállapot & Csomók</div>
            <span class="section-toggle-icon">▸</span>
          </div>
          <div class="section-content">
            <div class="quantum-numbers-row">
              <div class="qn-badge"><span class="qn-key">n</span><span class="qn-val" id="qn-n">1</span></div>
              <div class="qn-badge"><span class="qn-key">l</span><span class="qn-val" id="qn-l">0 (s)</span></div>
              <div class="qn-badge"><span class="qn-key">m</span><span class="qn-val" id="qn-m">0</span></div>
              <div class="qn-badge"><span class="qn-key">s</span><span class="qn-val" id="qn-s">+½</span></div>
            </div>

            <div class="nodal-summary-row" style="margin-top: 8px;">
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="displayPanel.radNodes">Radiális csomó:</span>
                <span class="chip-val" id="chip-rad-nodes">0</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="displayPanel.angNodes">Szögfüggő csomó:</span>
                <span class="chip-val" id="chip-ang-nodes">0</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="displayPanel.totalNodes">Összes csomófelület:</span>
                <span class="chip-val" id="chip-tot-nodes">0</span>
              </div>
            </div>

            <!-- Pályavonalak & Térbeli Megkvantáltsági Dőlésszögek -->
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1);">
              <div style="font-size: 10px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;" data-i18n="displayPanel.spaceQuantTitle">💫 Pályavonal Dőlésszög & Tér-kvantáltság:</div>
              <table class="tele-table">
                <tr>
                  <td data-i18n="displayPanel.angMomL">|L| impulzusmomentum:</td>
                  <td class="text-right" id="tele-quant-totall" style="color: #fbbf24;">0 ħ</td>
                </tr>
                <tr>
                  <td data-i18n="displayPanel.lzProj">L_z vetület (m·ħ):</td>
                  <td class="text-right" id="tele-quant-lz" style="color: #38bdf8;">0 ħ</td>
                </tr>
                <tr>
                  <td data-i18n="displayPanel.planeTilt">Pályasík dőlésszöge (θ):</td>
                  <td class="text-right" id="tele-quant-theta" style="color: #10b981; font-weight: bold;">0.0° (Izotróp s)</td>
                </tr>
                <tr>
                  <td data-i18n="displayPanel.quantRatio">Térkvantáltság arány (cos θ):</td>
                  <td class="text-right" id="tele-quant-costheta" style="color: #c084fc;">m / √(l(l+1))</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <!-- 4. FIZIKAI SKÁLÁK & ENERGIA -->
        <div class="control-section is-collapsed" id="sec-tele-scales">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="displayPanel.scalesTitle">⚡ Fizikai Skálák & Idő</div>
            <span class="section-toggle-icon">▸</span>
          </div>
          <div class="section-content">
            <table class="tele-table">
              <tr>
                <td data-i18n="displayPanel.meanRadius">Várható Pályasugár ⟨r⟩:</td>
                <td class="text-right" id="tele-radius">0.529 Å</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.bindingEnergy">Kötési Energia:</td>
                <td class="text-right" id="tele-energy" style="color: #fbbf24;">-13.61 eV</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.quantumPhase">Belső Kvantumfázis Φ(t):</td>
                <td class="text-right" id="tele-phase" style="color: #a78bfa;">◴ 0.00 rad</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.simTime">Szimulációs Idő:</td>
                <td class="text-right" id="tele-time">0.00 s</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderNucleonContent(body) {
    const isProton = this.levelDetails.isProton !== undefined ? this.levelDetails.isProton : true;
    const name = isProton ? 'Proton (p⁺)' : 'Neutron (n⁰)';
    const comp = isProton ? 'uud (up-up-down)' : 'udd (up-down-down)';
    const qNet = isProton ? '+1 e' : '0 e';
    const mass = isProton ? '938.27 MeV/c²' : '939.57 MeV/c²';

    body.innerHTML = `
      <div class="level-telemetry-block">
        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.nucleon.title">⚛️ Nukleon Azonosító & Töltés</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="telemetry-hero">
              <div class="tele-symbol-box" style="border-color: ${isProton ? '#ef4444' : '#3b82f6'};">
                <span class="tele-sym" style="font-size: 20px;">${isProton ? 'p⁺' : 'n⁰'}</span>
                <span class="tele-z-sub">B=1</span>
                <span class="tele-a-sup">${isProton ? '+1' : '0'}</span>
              </div>
              <div class="tele-identity">
                <div class="tele-name">${name}</div>
                <div class="tele-sub" data-i18n="telemetryLevels.nucleon.baryonSub">Barion (Fermion, Spin ½)</div>
                <div class="tele-notation" style="color: #fbbf24;">${comp}</div>
              </div>
            </div>

            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.nucleon.netCharge">Nettó Töltés</div>
                <div class="metric-val" style="color: ${isProton ? '#ef4444' : '#94a3b8'};">${qNet}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.nucleon.restMass">Nyugalmi Tömeg</div>
                <div class="metric-val" style="color: #38bdf8;">${mass}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.nucleon.su3Charge">SU(3) Színtöltés</div>
                <div class="metric-val" style="color: #10b981;" data-i18n="telemetryLevels.nucleon.colorSinglet">Fehér (Szinglett)</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.nucleon.stringTension">Gluon Húrfeszültség</div>
                <div class="metric-val" style="color: #f59e0b;">~1.0 GeV/fm</div>
              </div>
            </div>
          </div>
        </div>

        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.nucleon.qcdTitle">🔬 Kvantum-színdinamika (QCD)</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="nodal-summary-row">
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.nucleon.valenceQuarks">Valenciakvarkok:</span>
                <span class="chip-val" style="color: #fbbf24;">${isProton ? '2× up (+⅔), 1× down (-⅓)' : '1× up (+⅔), 2× down (-⅓)'}</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.nucleon.seaQuarks">Tenger-kvarkok:</span>
                <span class="chip-val" style="color: #f43f5e;">uū, dđ, sš fluktuáció</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.nucleon.asymptoticFreedom">Aszimptotikus szabadság:</span>
                <span class="chip-val" style="color: #38bdf8;" data-i18n="telemetryLevels.nucleon.asymptoticText">α_s csökken kis távon</span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.nucleon.scalesTitle">⚡ Belső Skálák & Idő</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <table class="tele-table">
              <tr>
                <td data-i18n="telemetryLevels.nucleon.chargeRadius">Nukleon Töltéssugár:</td>
                <td class="text-right">0.841 fm</td>
              </tr>
              <tr>
                <td data-i18n="telemetryLevels.nucleon.mitBagPressure">MIT Bag Nyomás B^(1/4):</td>
                <td class="text-right">205 MeV</td>
              </tr>
              <tr>
                <td data-i18n="telemetryLevels.nucleon.su3CyclePhase">SU(3) Ciklusfázis:</td>
                <td class="text-right" id="tele-phase" style="color: #a78bfa;">◴ 0.00 rad</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.simTime">Szimulációs Idő:</td>
                <td class="text-right" id="tele-time">0.00 s</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderQuarkContent(body) {
    const qType = this.levelDetails.type || 'up';
    const isUp = qType === 'up';
    const charge = isUp ? '+⅔ e' : '-⅓ e';
    const flavor = isUp ? 'Up kvark' : 'Down kvark';

    body.innerHTML = `
      <div class="level-telemetry-block">
        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.quark.title">🌀 Kvark Állapot & Paraméterek</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="telemetry-hero">
              <div class="tele-symbol-box" style="border-color: #a855f7;">
                <span class="tele-sym" style="font-size: 22px;">${isUp ? 'u' : 'd'}</span>
                <span class="tele-z-sub">${charge}</span>
                <span class="tele-a-sup">s=½</span>
              </div>
              <div class="tele-identity">
                <div class="tele-name">${flavor}</div>
                <div class="tele-sub" data-i18n="telemetryLevels.quark.sub">Mikro-féregjárat & Kerr-torkolat</div>
                <div class="tele-notation" style="color: #a855f7;">Kaluza-Klein / Calabi-Yau 6D</div>
              </div>
            </div>

            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.quark.throatRadius">Torkolat Sugár (r₀)</div>
                <div class="metric-val" style="color: #38bdf8;">~10⁻¹⁹ m</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.quark.heisenbergRepulsion">Heisenberg Taszítás</div>
                <div class="metric-val" style="color: #fbbf24;">+ħ² / (m·r³)</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.quark.hawkingTemp">Hawking Hőmérséklet</div>
                <div class="metric-val" style="color: #f43f5e;">~10³² K</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.quark.spacetimeDim">Téridő Dimenzió</div>
                <div class="metric-val" style="color: #10b981;">10D (4D + 6D CY)</div>
              </div>
            </div>
          </div>
        </div>

        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.quark.topologyTitle">🌀 Extra Dimenziós Topológia</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="nodal-summary-row">
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.quark.kerrRing">Kerr Gyűrű Szingularitás:</span>
                <span class="chip-val" style="color: #38bdf8;">x² + y² = a², z = 0</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.quark.riemannZeta">Riemann-zéta Regularizáció:</span>
                <span class="chip-val" style="color: #a855f7;">ζ(-1) = -1/12</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.quark.diracBelt">Dirac-öv Topológiai Spin:</span>
                <span class="chip-val" style="color: #10b981;" data-i18n="telemetryLevels.quark.diracBeltText">4π fázisfordulási szimmetria</span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.quark.scalesTitle">⚡ Belső Skálák & Idő</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <table class="tele-table">
              <tr>
                <td data-i18n="telemetryLevels.quark.planckLength">Planck Hossz (ℓ_P):</td>
                <td class="text-right">1.616 × 10⁻³⁵ m</td>
              </tr>
              <tr>
                <td data-i18n="telemetryLevels.quark.schwingerThreshold">Schwinger Küszöb E_cr:</td>
                <td class="text-right">1.32 × 10¹⁸ V/m</td>
              </tr>
              <tr>
                <td data-i18n="telemetryLevels.quark.quantumPhase">Kvantumrezgési Fázis:</td>
                <td class="text-right" id="tele-phase" style="color: #a78bfa;">◴ 0.00 rad</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.simTime">Szimulációs Idő:</td>
                <td class="text-right" id="tele-time">0.00 s</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  renderJanusContent(body) {
    body.innerHTML = `
      <div class="level-telemetry-block">
        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.janus.title">🌌 Janus Tükörszektor Állapot</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="telemetry-hero">
              <div class="tele-symbol-box" style="border-color: #f43f5e; background: rgba(244, 63, 94, 0.15);">
                <span class="tele-sym" style="font-size: 20px; color: #f43f5e;">e⁺ / p̄</span>
                <span class="tele-z-sub">r &lt; 0</span>
                <span class="tele-a-sup">CPT</span>
              </div>
              <div class="tele-identity">
                <div class="tele-name" data-i18n="telemetryLevels.janus.name">Janus-világ (Antianyag)</div>
                <div class="tele-sub" data-i18n="telemetryLevels.janus.sub">Inverz időnyíl & Tükörgeometria</div>
                <div class="tele-notation" style="color: #f43f5e;">λ ⟷ 1/λ, dS/dt &lt; 0</div>
              </div>
            </div>

            <div class="metric-grid">
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.janus.entropyArrow">Időnyíl Entrópia</div>
                <div class="metric-val" style="color: #f43f5e;" data-i18n="telemetryLevels.janus.reverseEntropy">dS/dt &lt; 0 (Fordított)</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.janus.shellParticles">Héj Részecskék</div>
                <div class="metric-val" style="color: #fb7185;" data-i18n="telemetryLevels.janus.positrons">Pozitronok (+1 e)</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.janus.coreCharge">Mag Töltés</div>
                <div class="metric-val" style="color: #38bdf8;" data-i18n="telemetryLevels.janus.antiproton">Antiproton (-1 e)</div>
              </div>
              <div class="metric-box">
                <div class="metric-label" data-i18n="telemetryLevels.janus.curvature">Téridő Görbület</div>
                <div class="metric-val" style="color: #a855f7;" data-i18n="telemetryLevels.janus.mirrorCone">+δg₀₀ (Tükörkúp)</div>
              </div>
            </div>
          </div>
        </div>

        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.janus.cptTitle">🎭 CPT Szimmetria & Állapot</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <div class="nodal-summary-row">
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.janus.chargeConj">Töltéstükrözés (C):</span>
                <span class="chip-val" style="color: #f43f5e;">q ⟼ -q</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.janus.parity">Paritás (P):</span>
                <span class="chip-val" style="color: #38bdf8;">x ⟼ -x</span>
              </div>
              <div class="nodal-chip">
                <span class="chip-label" data-i18n="telemetryLevels.janus.timeRev">Időtükrözés (T):</span>
                <span class="chip-val" style="color: #fbbf24;">t ⟼ -t</span>
              </div>
            </div>
          </div>
        </div>

        <div class="control-section">
          <div class="section-header-collapsible">
            <div class="section-title" data-i18n="telemetryLevels.janus.scalesTitle">⚡ Belső Skálák & Idő</div>
            <span class="section-toggle-icon">▾</span>
          </div>
          <div class="section-content">
            <table class="tele-table">
              <tr>
                <td data-i18n="telemetryLevels.janus.deflationScale">Deflációs Skálafaktor:</td>
                <td class="text-right">1 / λ</td>
              </tr>
              <tr>
                <td data-i18n="telemetryLevels.janus.annihilation">PET Annihiláció:</td>
                <td class="text-right">e⁻ + e⁺ ➔ 2γ (511 keV)</td>
              </tr>
              <tr>
                <td data-i18n="telemetryLevels.janus.mirrorPhase">Tükör Kvantumfázis:</td>
                <td class="text-right" id="tele-phase" style="color: #a78bfa;">◴ 0.00 rad</td>
              </tr>
              <tr>
                <td data-i18n="displayPanel.simTime">Szimulációs Idő:</td>
                <td class="text-right" id="tele-time">0.00 s</td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  updateTelemetry(telemetry, syncEngine) {
    if (!this.panelElement) return;
    if (telemetry) this.cachedTelemetry = telemetry;
    if (syncEngine) this.cachedSyncEngine = syncEngine;

    const secScales = this.panelElement.querySelector('#sec-tele-scales');
    if (!secScales || !secScales.classList.contains('is-collapsed')) {
      const elPhase = this.panelElement.querySelector('#tele-phase');
      const elTime = this.panelElement.querySelector('#tele-time');

      if (elPhase && syncEngine) {
        const pRad = (syncEngine.quantumPhase % (Math.PI * 2)).toFixed(2);
        elPhase.textContent = `◴ ${pRad} rad`;
      }
      if (elTime && syncEngine) {
        elTime.textContent = `${syncEngine.simTime.toFixed(2)} s`;
      }
    }

    if (this.currentLevel !== 'atom' || !telemetry) return;

    const elem = telemetry.element;
    const valSub = telemetry.valenceSubshell;
    const phys = telemetry.physicals;

    const secElem = this.panelElement.querySelector('#sec-tele-element');
    if (secElem && elem) {
      const elSym = this.panelElement.querySelector('#tele-sym');
      const elZ = this.panelElement.querySelector('#tele-z-sub');
      const elA = this.panelElement.querySelector('#tele-a-sup');
      const elName = this.panelElement.querySelector('#tele-name');
      const elParts = this.panelElement.querySelector('#tele-particles');
      const elNotation = this.panelElement.querySelector('#tele-notation');

      if (elSym && elem) elSym.textContent = elem.sym;
      if (elZ && elem) elZ.textContent = elem.Z;
      if (elA && elem) elA.textContent = elem.mass;
      const localizedName = i18n.getElementName(elem.sym, elem.name);
      if (elName && elem) elName.textContent = localizedName;
      if (elParts && elem) {
        elParts.textContent = i18n.getLanguage() === 'hu'
          ? `${elem.Z} proton (p⁺) · ${Math.max(0, elem.mass - elem.Z)} neutron (n⁰)`
          : `${elem.Z} protons (p⁺) · ${Math.max(0, elem.mass - elem.Z)} neutrons (n⁰)`;
      }
      if (elNotation) elNotation.textContent = telemetry.notation;

      const elShells = this.panelElement.querySelector('#tele-shells');
      const elElectrons = this.panelElement.querySelector('#tele-electrons');
      const elValSub = this.panelElement.querySelector('#tele-valence-sub');
      const elSag = this.panelElement.querySelector('#tele-sag');

      if (elShells && elem) elShells.textContent = `[ ${elem.shells.join(', ')} ]`;
      if (elElectrons) elElectrons.textContent = `${telemetry.activeElectrons} e⁻`;
      if (elValSub && valSub) elValSub.textContent = `${valSub.label} (${valSub.count} e⁻)`;
      if (elSag && telemetry.sagDepth) elSag.textContent = `-${telemetry.sagDepth.toFixed(2)} δg₀₀`;
    }

    const secQuantum = this.panelElement.querySelector('#sec-tele-quantum');
    if (!secQuantum || !secQuantum.classList.contains('is-collapsed')) {
      const selOrb = telemetry.selectedOrbital || valSub;
      const qnN = this.panelElement.querySelector('#qn-n');
      const qnL = this.panelElement.querySelector('#qn-l');
      const qnM = this.panelElement.querySelector('#qn-m');
      const qnS = this.panelElement.querySelector('#qn-s');

      const lNames = ['s', 'p', 'd', 'f'];
      if (qnN && selOrb) qnN.textContent = selOrb.n;
      if (qnL && selOrb) qnL.textContent = `${selOrb.l} (${lNames[selOrb.l] || '?'})`;
      if (qnM && selOrb) qnM.textContent = selOrb.m !== undefined ? selOrb.m : 0;
      if (qnS) {
        if (selOrb && selOrb.ms !== undefined) {
          qnS.textContent = selOrb.ms > 0 ? '+½' : (selOrb.ms < 0 ? '-½' : '±½');
        } else {
          qnS.textContent = '+½';
        }
      }

      if (selOrb) {
        const nodes = getNodalStructure(selOrb.n, selOrb.l);
        const chipRad = this.panelElement.querySelector('#chip-rad-nodes');
        const chipAng = this.panelElement.querySelector('#chip-ang-nodes');
        const chipTot = this.panelElement.querySelector('#chip-tot-nodes');

        if (chipRad) chipRad.textContent = nodes.radialNodes;
        if (chipAng) chipAng.textContent = nodes.angularNodes;
        if (chipTot) chipTot.textContent = nodes.totalNodes;

        // Space quantization & inclination angles
        const sq = calculateSpaceQuantization(selOrb.l, selOrb.m !== undefined ? selOrb.m : 0);
        const elTotalL = this.panelElement.querySelector('#tele-quant-totall');
        const elLz = this.panelElement.querySelector('#tele-quant-lz');
        const elTheta = this.panelElement.querySelector('#tele-quant-theta');
        const elCosTheta = this.panelElement.querySelector('#tele-quant-costheta');

        if (elTotalL) elTotalL.textContent = sq.totalLNorm;
        if (elLz) elLz.textContent = sq.lzNorm;
        if (elTheta) elTheta.textContent = sq.l === 0 ? i18n.t('displayPanel.isotropicLabel', '0.0° (Izotróp gömb)') : `${sq.thetaDeg.toFixed(1)}°`;
        if (elCosTheta) elCosTheta.textContent = sq.l === 0 ? 'n/a (l=0)' : `${sq.cosTheta.toFixed(3)}`;
      }
    }

    if (!secScales || !secScales.classList.contains('is-collapsed')) {
      const elRadius = this.panelElement.querySelector('#tele-radius');
      const elEnergy = this.panelElement.querySelector('#tele-energy');

      if (elRadius && phys) elRadius.textContent = `${phys.meanRadiusAngstrom.toFixed(3)} Å (${phys.meanRadiusPm.toFixed(1)} pm)`;
      if (elEnergy && phys) elEnergy.textContent = `${phys.energyEV.toFixed(2)} eV`;
    }

    // Dynamic curvature and Kretschmann scalar
    const secCurv = this.panelElement.querySelector('#sec-tele-curvature');
    if (!secCurv || !secCurv.classList.contains('is-collapsed')) {
      const elMetricDg00 = this.panelElement.querySelector('#tele-metric-dg00');
      const elKretschmann = this.panelElement.querySelector('#tele-kretschmann');
      if (elem) {
        const massKg = elem.mass * PROTON_MASS_KG;
        const curv = calculateCurvatureMetrics(1.0, massKg, elem.Z, false);
        const wellText = i18n.getLanguage() === 'hu' ? ' (vonzó kút)' : ' (attractive well)';
        if (elMetricDg00) elMetricDg00.textContent = `-${telemetry.sagDepth ? telemetry.sagDepth.toFixed(2) : '2.44'}${wellText}`;
        if (elKretschmann) elKretschmann.textContent = `${curv.kretschmann.toExponential(2)} m⁻⁴`;
      }
    }
  }

  updateProcessTelemetry(procTele) {
    if (!this.panelElement || !procTele) return;
    this.cachedProcTele = procTele;

    // 1. Process Section
    const secProc = this.panelElement.querySelector('#sec-tele-process');
    if (!secProc || !secProc.classList.contains('is-collapsed')) {
      const elPhase = this.panelElement.querySelector('#tele-proc-phase');
      const elEin = this.panelElement.querySelector('#tele-proc-ein');
      const elQ2 = this.panelElement.querySelector('#tele-proc-q2');
      const elRecoil = this.panelElement.querySelector('#tele-proc-recoil');
      const elPhoton = this.panelElement.querySelector('#tele-proc-photon');

      const phaseTitle = i18n.t(`phases.${procTele.phase.id}.title`, procTele.phase.title || procTele.phase.key);
      if (elPhase) elPhase.textContent = `${procTele.phase.id}. ${phaseTitle}`;
      if (elEin) elEin.textContent = `${procTele.eKinIn} eV`;
      if (elQ2) elQ2.textContent = `${procTele.momentumTransferQ2}`;
      if (elRecoil) {
        if (procTele.recoilDynamics && procTele.phase.key === 'nuclear_recoil') {
          elRecoil.textContent = `${procTele.recoilDynamics.vRecoil.toFixed(2)} m/s (${procTele.recoilDynamics.eRecoilEV.toExponential(2)} eV)`;
        } else {
          elRecoil.textContent = `${procTele.recoilVelocity}`;
        }
      }
      if (elPhoton) {
        if (!procTele.radiatedWave || procTele.radiatedWave === 'Nincs emisszió') {
          elPhoton.textContent = i18n.t('displayPanel.noEmission', 'No emission');
        } else {
          elPhoton.textContent = `${procTele.radiatedWave}`;
        }
      }

      const elChannel = this.panelElement.querySelector('#tele-proc-channel');
      const elContraction = this.panelElement.querySelector('#tele-proc-contraction');
      const ch = procTele.channel;
      if (elChannel) {
        if (ch) {
          elChannel.textContent = `${ch.source.label} ➔ ${ch.target.label} (ΔE = ${ch.deltaE.toFixed(2)} eV, λ = ${ch.lambdaNm.toFixed(0)} nm)`;
        } else {
          elChannel.textContent = '1s ➔ 2p (ΔE = 10.2 eV)';
        }
      }
      if (elContraction) {
        if (ch && ch.spectatorShifts) {
          // Show the strongest inner-shell contraction (most negative relShift)
          const contracting = ch.spectatorShifts
            .filter((s) => !s.isSource && s.relShift < -1e-4)
            .sort((a, b) => a.relShift - b.relShift);
          if (contracting.length > 0) {
            const parts = contracting.slice(0, 3).map((s) =>
              `${s.label}: ${(s.relShift * 100).toFixed(1)}%`
            );
            elContraction.textContent = parts.join(', ');
          } else {
            elContraction.textContent = i18n.t('displayPanel.negligible', 'negligible');
          }
        } else {
          elContraction.textContent = i18n.t('displayPanel.none', 'none');
        }
      }
    }

    // 2. Entropic time and tachometer updates
    const secEntropy = this.panelElement.querySelector('#sec-tele-entropy');
    if (!secEntropy || !secEntropy.classList.contains('is-collapsed')) {
      const elTau = this.panelElement.querySelector('#tele-tau-time');
      const elSpeed = this.panelElement.querySelector('#tele-tau-speed');
      const elMeterBar = this.panelElement.querySelector('#tele-tau-meter-bar');
      const elDwBadge = this.panelElement.querySelector('#tele-dw-badge');
      const elSRecoil = this.panelElement.querySelector('#tele-s-recoil');
      const elSQed = this.panelElement.querySelector('#tele-s-qed');
      const elSDecoh = this.panelElement.querySelector('#tele-s-decoh');
      const elSThroat = this.panelElement.querySelector('#tele-s-throat');

      if (elTau && procTele.entropicTime !== undefined) {
        elTau.textContent = `${procTele.entropicTime.toFixed(2)} τ`;
      }
      if (elSpeed && procTele.entropicVelocity !== undefined) {
        elSpeed.textContent = `${procTele.entropicVelocity.toFixed(2)}x`;
        if (elMeterBar) {
          const pct = Math.min(100, Math.max(5, (procTele.entropicVelocity / 7.5) * 100));
          elMeterBar.style.width = `${pct}%`;
          if (pct > 60) {
            elMeterBar.style.background = 'linear-gradient(90deg, #f59e0b, #ef4444, #dc2626)';
          } else if (pct > 30) {
            elMeterBar.style.background = 'linear-gradient(90deg, #38bdf8, #a855f7, #f59e0b)';
          } else {
            elMeterBar.style.background = 'linear-gradient(90deg, #38bdf8, #818cf8)';
          }
        }
      }
      if (elDwBadge && procTele.fDebyeWaller !== undefined) {
        const isLattice = procTele.fDebyeWaller > 0.5;
        elDwBadge.textContent = isLattice ? i18n.t('displayPanel.latticeBadge', 'f_DW = 0.8 (Rács)') : i18n.t('displayPanel.freeBadge', 'f_DW = 0.0 (Szabad)');
        elDwBadge.style.background = isLattice ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)';
        elDwBadge.style.color = isLattice ? '#10b981' : '#38bdf8';
      }
      if (procTele.entropyFlux && procTele.entropyFlux.components) {
        const comps = procTele.entropyFlux.components;
        if (elSRecoil) elSRecoil.textContent = comps.recoil.toFixed(2);
        if (elSQed) elSQed.textContent = comps.qed.toFixed(2);
        if (elSDecoh) elSDecoh.textContent = comps.decoh.toFixed(2);
        if (elSThroat) elSThroat.textContent = comps.throat.toFixed(2);
      }
    }

    // 3. Curvature updates (LQC status)
    const secCurv = this.panelElement.querySelector('#sec-tele-curvature');
    if (!secCurv || !secCurv.classList.contains('is-collapsed')) {
      const elLqc = this.panelElement.querySelector('#tele-lqc-bounce');
      if (elLqc) {
        if (procTele.phase && procTele.phase.key === 'deep_dissipation') {
          elLqc.textContent = 'H² ➔ 0 (Planck Bounce!)';
          elLqc.style.color = '#f59e0b';
        } else {
          elLqc.textContent = 'f_LQC ≈ 1.0 (összeomlásmentes)';
          elLqc.style.color = '#10b981';
        }
      }
    }
  }

  applyTranslations() {
    if (!this.panelElement) return;
    this.setTitle(i18n.t('displayPanel.title', 'Quantum Telemetry'));

    this.panelElement.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = i18n.t(key, el.textContent);
    });

    this.panelElement.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle;
      el.title = i18n.t(key, el.title);
    });

    if (this.cachedTelemetry) {
      this.updateTelemetry(this.cachedTelemetry, this.cachedSyncEngine);
    }
    if (this.cachedProcTele) {
      this.updateProcessTelemetry(this.cachedProcTele);
    }
  }
}
