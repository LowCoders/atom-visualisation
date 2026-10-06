import { BasePanel } from './BasePanel.js';
import { ELEMENTS, getElement, getElementValenceOrbital, getRepresentativeElementForOrbital } from '../core/QuantumPhysics.js';
import { i18n } from '../core/I18n.js';
import {
  LAYER_GROUPS,
  LAYER_DEFINITIONS,
  LAYER_PRESETS,
  getPresetLayerState,
  resolveLayerDependencies
} from '../config/layers.js';

/**
 * ControlPanel: Glassmorphic interactive control interface.
 * Features:
 * - Two-way bidirectional synchronization between chemical elements (Z = 1..36) and orbital states (n, l, m)
 * - Permanently visible "The Shapes of Atomic Orbitals" controls with element subshell selector
 * - Fully independent layer toggles for all 3D components:
 *   Nucleus, 3D Cloud, Density Slice (Image 1), Real Shapes, Complex Shapes, Nodal Surfaces, Electrons, Tracks, Drum, Vacuum
 * - "Layer Konfigurációk" presets for quick multi-layer switching without locking individual toggles
 * - Multi-atom arrangements, simulation clock, and camera presets
 */
export class ControlPanel extends BasePanel {
  constructor(id = 'control-panel', options = {}) {
    super(id, {
      title: i18n.t('controlPanel.title', 'Control Panel'),
      icon: '🎛️',
      position: 'top-left',
      width: 370,
      ...options
    });

    this.currentZ = options.initialZ || 2;
    this.currentN = 1;
    this.currentL = 0;
    this.currentM = 0;
    this.isInternalUpdate = false;
    this.cachedProcTele = null;

    i18n.on('languageChange', () => {
      this.applyTranslations();
    });
  }

  renderPresetOptions() {
    return `
      <option value="" data-i18n="controlPanel.presetNone">${i18n.t('controlPanel.presetNone', 'Válasszon elemet')}</option>
      ${LAYER_PRESETS.map(p => `
        <option value="${p.id}" data-i18n="${p.i18nKey}" ${p.id === 'default' ? 'selected' : ''}>${i18n.t(p.i18nKey, p.id)}</option>
      `).join('')}
    `;
  }

  renderLayerGroupsHTML() {
    const sortedGroups = [...LAYER_GROUPS].sort((a, b) => (a.order || 0) - (b.order || 0));
    return sortedGroups.map((group, gIdx) => {
      const defs = LAYER_DEFINITIONS.filter(d => d.group === group.id);
      const header = `<div class="layer-group-header" data-i18n="${group.i18nKey}">${i18n.t(group.i18nKey, group.id)}</div>`;
      const rows = defs.map(def => `
        <label class="checkbox-row" data-i18n-title="${def.i18nKey}">
          <input type="checkbox" id="${def.checkboxId}" ${def.default ? 'checked' : ''}>
          <span data-i18n="${def.i18nKey}">${i18n.t(def.i18nKey, def.id)}</span>
        </label>
      `).join('');
      const divider = gIdx < sortedGroups.length - 1 ? '<div class="layer-group-divider"></div>' : '';
      return header + rows + divider;
    }).join('');
  }

  renderContent(body) {
    body.innerHTML = `
      <!-- NUKLEON BELSŐ VEZÉRLŐK (Csak 2. szinten aktív) -->
      <div class="control-section" id="section-nucleon-ctrl" style="display: none;">
        <div class="section-header-collapsible">
          <div class="section-title" style="color: #38bdf8;">🔬 Nukleon Belső Folyamatok (2. Szint)</div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          <div class="form-row" style="margin-bottom: 8px;">
            <label style="font-size: 11px;">Nukleon Típus:</label>
            <div class="btn-group-toggle" id="nuc-type-group" style="flex: 1; justify-content: flex-end;">
              <button class="btn-toggle-opt active" id="btn-nuc-proton" data-nuc="proton">p⁺ Proton (uud)</button>
              <button class="btn-toggle-opt" id="btn-nuc-neutron" data-nuc="neutron">n⁰ Neutron (udd)</button>
            </div>
          </div>
          <div class="layer-group-header" data-i18n="controlPanel.layersTitle" style="margin-top: 10px; margin-bottom: 6px;">Megjelenített Rétegek</div>
          <div class="form-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
            <label class="checkbox-row">
              <input type="checkbox" id="chk-nuc-bag" checked>
              <span>MIT Bag határfelület</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-nuc-tubes" checked>
              <span>SU(3) Gluon fluxustubusok</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-nuc-sea" checked>
              <span>Virtuális kvark-tenger</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-nuc-wire">
              <span>Nukleon MIT Bag gömbháló</span>
            </label>
          </div>
        </div>
      </div>

      <!-- KVARK & FÉREGJÁRAT VEZÉRLŐK (Csak 3. szinten aktív) -->
      <div class="control-section" id="section-quark-ctrl" style="display: none;">
        <div class="section-header-collapsible">
          <div class="section-title" style="color: #a855f7;">🌀 Kvark & Mikro-féregjárat (3. Szint)</div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          <div class="form-row" style="margin-bottom: 8px;">
            <label style="font-size: 11px;">Kvark Típus:</label>
            <div class="btn-group-toggle" id="quark-type-group" style="flex: 1; justify-content: flex-end;">
              <button class="btn-toggle-opt active" id="btn-quark-up" data-quark="up">Up (+⅔ e)</button>
              <button class="btn-toggle-opt" id="btn-quark-down" data-quark="down">Down (-⅓ e)</button>
            </div>
          </div>
          <div class="layer-group-header" data-i18n="controlPanel.layersTitle" style="margin-top: 10px; margin-bottom: 6px;">Megjelenített Rétegek</div>
          <div class="form-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
            <label class="checkbox-row">
              <input type="checkbox" id="chk-quark-throat" checked>
              <span>Hiperboloid féregjárat-torok</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-quark-kerr" checked>
              <span>Kerr gyűrű-szingularitás</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-quark-cy" checked>
              <span>Calabi-Yau 6D vetület</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-quark-bounce" checked>
              <span>Heisenberg-visszapattanás pajzs</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-quark-hawking" checked>
              <span>Hawking / Schwinger sugárzás</span>
            </label>
          </div>
        </div>
      </div>

      <!-- JANUS ANTIANYAG VEZÉRLŐK (Csak Janus szinten aktív) -->
      <div class="control-section" id="section-janus-ctrl" style="display: none;">
        <div class="section-header-collapsible">
          <div class="section-title" style="color: #f43f5e;">🌌 Janus Antianyag Tükörvilág</div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          <div class="layer-group-header" data-i18n="controlPanel.layersTitle" style="margin-bottom: 6px;">Megjelenített Rétegek</div>
          <div class="form-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
            <label class="checkbox-row">
              <input type="checkbox" id="chk-janus-sheet" checked>
              <span>Invertált tükör-vákuumszövet (+δg₀₀)</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-janus-positrons" checked>
              <span>Pozitronhéjak (+1 e)</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" id="chk-janus-antiproton" checked>
              <span>Antiproton mag (-1 e)</span>
            </label>
          </div>
        </div>
      </div>

      <!-- 0.5. DINAMIKUS FIZIKAI FOLYAMAT (6 FÁZIS) -->
      <div class="control-section is-collapsed" id="section-process-sim">
        <div class="section-header-collapsible">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="section-title" data-i18n="controlPanel.processTitle">⚡ Folyamat szimulátor</div>
            <button class="header-play-btn" id="btn-header-proc-play" title="Start Process / Indítás">▶</button>
          </div>
          <span class="section-toggle-icon">▸</span>
        </div>
        <div class="section-content">
          <div class="process-current-banner" id="proc-phase-title" style="font-size: 11px; font-weight: 700; color: #38bdf8; margin-bottom: 4px; padding: 4px 8px; background: rgba(56, 189, 248, 0.12); border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.25);">
            0. Alapállapot (1s)
          </div>
          <div class="process-progress-container" style="width: 100%; height: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 999px; overflow: hidden; margin-bottom: 8px;">
            <div id="proc-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #38bdf8, #fbbf24); transition: width 0.1s linear;"></div>
          </div>
          <div class="time-controls-row" style="margin-bottom: 6px;">
            <button class="btn-action" id="btn-proc-play" style="flex: 1.4;" data-i18n="controlPanel.processStart">▶ Folyamat Start</button>
            <button class="btn-step" id="btn-proc-prev" title="Előző fázis" style="width: 32px; height: 28px;">⏮</button>
            <button class="btn-step" id="btn-proc-next" title="Következő fázis" style="width: 32px; height: 28px;">⏭</button>
            <button class="btn-action" id="btn-proc-reset" style="flex: 0.8;" title="Vissza alapállapotba" data-i18n="controlPanel.processReset">↺</button>
          </div>
          <div class="form-row" style="margin-bottom: 2px;">
            <label style="font-size: 10.5px; color: var(--text-muted);" data-i18n="controlPanel.jumpPhase">Ugrás fázisra:</label>
            <select id="select-proc-phase" class="select-input" style="font-size: 11px; padding: 4px 6px;">
              <option value="0">0: Alapállapot (1s)</option>
              <option value="1">1: Beeső elektron (15 eV)</option>
              <option value="2">2: QED szórás & Q² transzfer</option>
              <option value="3">3: Kvantumugrás (1s ➔ 2p_z)</option>
              <option value="4">4: Mag visszalökődés & Yukawa pion</option>
              <option value="5">5: Mélységi disszipáció & Heisenberg-fal</option>
              <option value="6">6: Spontán Lyman-α foton relaxáció</option>
            </select>
          </div>
          <div class="form-row" style="margin-bottom: 2px; margin-top: 6px;">
            <label style="font-size: 10.5px; color: var(--text-muted);" data-i18n="controlPanel.exciteSubshell">Gerjesztett alhéj:</label>
            <select id="select-excite-subshell" class="select-input" style="font-size: 11px; padding: 4px 6px;">
              <option value="valence" data-i18n="controlPanel.valenceAuto">Valencia (automatikus)</option>
            </select>
          </div>
          <div id="proc-channel-info" style="font-size: 10px; color: #38bdf8; margin-top: 4px; padding: 3px 6px; background: rgba(56,189,248,0.08); border-radius: 5px;">
            Csatorna: 1s ➔ 2p (ΔE = 10.2 eV, λ = 121.6 nm)
          </div>
          <div style="margin-top: 8px;">
            <button class="btn-action" id="btn-manual-recoil" style="width: 100%; border-color: rgba(244, 63, 94, 0.4); color: #f43f5e;" data-i18n="controlPanel.manualRecoil" title="Manuális impulzusátadás a magba és entrópikus lökéshullám generálás">
              ⚡ Manuális Nukleáris Visszalökődés
            </button>
          </div>
        </div>
      </div>

      <!-- 1. ELEM & ELEKTRONSZÁM SZEKCIÓ -->
      <div class="control-section" id="section-element">
        <div class="section-header-collapsible">
          <div class="section-title" data-i18n="controlPanel.elementTitle">⚛️ Elem & Elektronszám (Z = 1..126)</div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          <div class="element-header-row">
            <div class="element-badge" id="ctrl-elem-badge" style="cursor: pointer;" title="Periódusos rendszer megnyitása / Open Periodic Table (Z = 1..126)">
              <span class="elem-sym">He</span>
              <span class="elem-info">Hélium (Z = 2, A = 4)</span>
            </div>
            <button class="btn-step" id="btn-open-pt" title="Periódusos Rendszer / Periodic Table (Z = 1..126)" style="width: 30px; height: 30px; font-size: 14px;">⊞</button>
            <div class="stepper-group">
              <button class="btn-step" id="btn-z-minus" title="1 elektron levétele">-</button>
              <button class="btn-step" id="btn-z-plus" title="1 elektron hozzáadása">+</button>
            </div>
          </div>

          <div class="slider-row">
            <input type="range" id="slider-z" min="1" max="126" value="${this.currentZ}" step="1">
            <span class="slider-val" id="val-z">${this.currentZ} e⁻</span>
          </div>
        </div>
      </div>

      <!-- 2. PERMANENS "THE SHAPES OF ATOMIC ORBITALS" VEZÉRLŐK -->
      <div class="control-section" id="section-shapes-perm">
        <div class="section-header-collapsible">
          <div class="section-header-flex" style="flex: 1; margin-right: 6px;">
            <div class="section-title" data-i18n="controlPanel.shapesTitle">📐 The Shapes of Atomic Orbitals</div>
            <span class="sync-indicator" title="Kétirányú szinkronizáció az elemmel" data-i18n="controlPanel.syncIndicator">⇄ Szinkron</span>
          </div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          <!-- Aktuális elem betöltött alhéjai -->
          <div class="form-row" style="margin-bottom: 4px;">
            <label style="font-size: 10.5px; color: var(--text-muted);" data-i18n="controlPanel.elemSubshells">Elem alhéjai:</label>
            <div class="elem-subshells-bar" id="elem-subshells-list">
              <!-- Dinamikusan feltöltve -->
            </div>
          </div>

          <!-- Főkvantumszám n -->
          <div class="form-row">
            <label data-i18n="controlPanel.principalN">Főkvantumszám (n):</label>
            <div class="btn-group-toggle" id="shapes-n-group">
              <button class="btn-toggle-opt active" data-n="1">1</button>
              <button class="btn-toggle-opt" data-n="2">2</button>
              <button class="btn-toggle-opt" data-n="3">3</button>
              <button class="btn-toggle-opt" data-n="4">4</button>
            </div>
          </div>

          <!-- Alhéj l -->
          <div class="form-row">
            <label data-i18n="controlPanel.subshellL">Alhéj (l):</label>
            <div class="btn-group-toggle" id="shapes-l-group">
              <button class="btn-toggle-opt active" data-l="0">s</button>
              <button class="btn-toggle-opt" data-l="1">p</button>
              <button class="btn-toggle-opt" data-l="2">d</button>
              <button class="btn-toggle-opt" data-l="3">f</button>
            </div>
          </div>

          <!-- Mágneses kvantumszám m -->
          <div class="form-row">
            <label data-i18n="controlPanel.magneticM">Mágneses (m):</label>
            <select id="select-shapes-m" class="select-input">
              <option value="0" selected>m = 0 (s-gömb)</option>
            </select>
          </div>

          <!-- Spinkvantumszám ms -->
          <div class="form-row">
            <label data-i18n="controlPanel.spinMs">Spinkvantumszám (ms):</label>
            <div class="btn-group-toggle" id="shapes-ms-group">
              <button class="btn-toggle-opt active" data-ms="0.5" title="Spin-Up (+½)">+½</button>
              <button class="btn-toggle-opt" data-ms="-0.5" title="Spin-Down (-½)">-½</button>
              <button class="btn-toggle-opt" data-ms="0" title="Párosított (±½)">±½</button>
            </div>
          </div>

          <!-- Héj-metszet (Cutaway ablak) -->
          <div class="form-row">
            <label data-i18n="controlPanel.cutawayLabel">Héj-metszet (Ablak):</label>
            <div class="btn-group-toggle" id="shapes-cutaway-group">
              <button class="btn-toggle-opt active" data-cutaway="0">360°</button>
              <button class="btn-toggle-opt" data-cutaway="90">90°</button>
              <button class="btn-toggle-opt" data-cutaway="180">180°</button>
            </div>
          </div>

          <!-- 5. koordináta: SU(2) Spinor fázis (χ: 0..720°) -->
          <div class="form-row" id="row-su2-phase" style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <label data-i18n="controlPanel.su2Phase" style="font-size: 10.5px; color: var(--text-muted);">Spinor fázis (χ, 5. koord):</label>
              <span id="su2-phase-val" style="font-size: 10.5px; font-weight: bold; color: var(--accent-cyan); font-family: monospace;">0°</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; width: 100%;">
              <input type="range" id="su2-phase-slider" class="range-slider" min="0" max="720" step="2" value="0" style="flex: 1;">
              <button id="btn-su2-autorotate" class="btn-toggle-opt" title="Auto-forgatás" style="padding: 2px 6px; font-size: 10px;">⟳</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. LAYER KONFIGURÁCIÓK (PRESETEK) -->
      <div class="control-section" id="section-presets">
        <div class="section-header-collapsible">
          <div class="section-title" data-i18n="controlPanel.presetsTitle">🎭 Layer Konfigurációk</div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          <div class="form-row">
            <select id="select-layer-preset" class="select-input" style="width: 100%; padding: 6px 10px; font-size: 11px;">
              ${this.renderPresetOptions()}
            </select>
          </div>
        </div>
      </div>

      <!-- 4. MEGJELENÍTETT RÉTEGEK (TELJESEN FÜGGETLEN LAYER LISTA) -->
      <div class="control-section" id="section-layers">
        <div class="section-header-collapsible">
          <div style="display: flex; align-items: center; justify-content: space-between; flex: 1; margin-right: 8px;">
            <div class="section-title" data-i18n="controlPanel.layersTitle">📑 Megjelenített Rétegek</div>
            <label class="header-switch-label" title="Dinamikus Zoom-LOD (Automatikus részletbontás) / Dynamic Zoom-LOD" style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: normal; color: var(--accent-cyan); cursor: pointer; text-transform: none; letter-spacing: normal;">
              <input type="checkbox" id="chk-layer-auto-lod" style="cursor: pointer; width: 12px; height: 12px; accent-color: var(--accent-cyan);">
              <span data-i18n="controlPanel.layers.autoLODShort">Zoom-LOD</span>
            </label>
          </div>
          <span class="section-toggle-icon">▾</span>
        </div>
        <div class="section-content">
          ${this.renderLayerGroupsHTML()}
        </div>
      </div>
    `;

    this.bindEvents(body);
    this.updateElementState(this.currentZ);
    this.applyTranslations();
  }

  bindEvents(root) {
    // Collapsible Sections Accordion Handling
    root.querySelectorAll('.section-header-collapsible').forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('.header-switch-label')) return;
        const sec = header.closest('.control-section');
        if (sec) {
          sec.classList.toggle('is-collapsed');
          const isCollapsed = sec.classList.contains('is-collapsed');
          const icon = header.querySelector('.section-toggle-icon');
          if (icon) icon.textContent = isCollapsed ? '▸' : '▾';
          this.emit('accordionToggle', { sectionId: sec.id, isCollapsed, states: this.getAccordionStates() });
        }
      });
    });

    // 0. Beágyazott Szintek Gombok
    root.querySelectorAll('.btn-ctrl-level').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('.btn-ctrl-level').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        this.emit('changeLevel', b.dataset.level);
      });
    });

    // 0.5. Dinamikus Folyamat Szimulátor Vezérlők
    root.querySelector('#btn-proc-play')?.addEventListener('click', () => {
      this.emit('toggleProcessPlay');
    });

    root.querySelector('#btn-proc-next')?.addEventListener('click', () => {
      this.emit('nextProcessPhase');
    });

    root.querySelector('#btn-proc-prev')?.addEventListener('click', () => {
      this.emit('prevProcessPhase');
    });

    root.querySelector('#btn-proc-reset')?.addEventListener('click', () => {
      this.emit('resetProcess');
    });

    root.querySelector('#btn-manual-recoil')?.addEventListener('click', () => {
      this.emit('triggerRecoilImpulse');
    });

    root.querySelector('#select-proc-phase')?.addEventListener('change', (e) => {
      this.emit('setProcessPhase', parseInt(e.target.value, 10));
    });

    root.querySelector('#select-excite-subshell')?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'valence') {
        this.emit('changeExcitationSubshell', null);
      } else {
        const [n, l] = val.split(':').map((x) => parseInt(x, 10));
        this.emit('changeExcitationSubshell', { n, l });
      }
    });

    // N1. Nukleon vezérlők (2. szint)
    root.querySelector('#btn-nuc-proton')?.addEventListener('click', () => {
      root.querySelector('#btn-nuc-proton')?.classList.add('active');
      root.querySelector('#btn-nuc-neutron')?.classList.remove('active');
      this.emit('changeNucleonType', { isProton: true });
    });
    root.querySelector('#btn-nuc-neutron')?.addEventListener('click', () => {
      root.querySelector('#btn-nuc-neutron')?.classList.add('active');
      root.querySelector('#btn-nuc-proton')?.classList.remove('active');
      this.emit('changeNucleonType', { isProton: false });
    });
    root.querySelector('#chk-nuc-bag')?.addEventListener('change', (e) => {
      this.emit('toggleNucleonLayer', { layer: 'showBag', visible: e.target.checked });
    });
    root.querySelector('#chk-nuc-tubes')?.addEventListener('change', (e) => {
      this.emit('toggleNucleonLayer', { layer: 'showFluxTubes', visible: e.target.checked });
    });
    root.querySelector('#chk-nuc-sea')?.addEventListener('change', (e) => {
      this.emit('toggleNucleonLayer', { layer: 'showSea', visible: e.target.checked });
    });
    root.querySelector('#chk-nuc-wire')?.addEventListener('change', (e) => {
      this.emit('toggleNucleonLayer', { layer: 'showBagWire', visible: e.target.checked });
    });

    // Q1. Kvark vezérlők (3. szint)
    root.querySelector('#btn-quark-up')?.addEventListener('click', () => {
      root.querySelector('#btn-quark-up')?.classList.add('active');
      root.querySelector('#btn-quark-down')?.classList.remove('active');
      this.emit('changeQuarkType', { type: 'up', charge: '+⅔ e' });
    });
    root.querySelector('#btn-quark-down')?.addEventListener('click', () => {
      root.querySelector('#btn-quark-down')?.classList.add('active');
      root.querySelector('#btn-quark-up')?.classList.remove('active');
      this.emit('changeQuarkType', { type: 'down', charge: '-⅓ e' });
    });
    root.querySelector('#chk-quark-throat')?.addEventListener('change', (e) => {
      this.emit('toggleQuarkLayer', { layer: 'throat', visible: e.target.checked });
    });
    root.querySelector('#chk-quark-kerr')?.addEventListener('change', (e) => {
      this.emit('toggleQuarkLayer', { layer: 'kerr', visible: e.target.checked });
    });
    root.querySelector('#chk-quark-cy')?.addEventListener('change', (e) => {
      this.emit('toggleQuarkLayer', { layer: 'calabiYau', visible: e.target.checked });
    });
    root.querySelector('#chk-quark-bounce')?.addEventListener('change', (e) => {
      this.emit('toggleQuarkLayer', { layer: 'bounce', visible: e.target.checked });
    });
    root.querySelector('#chk-quark-hawking')?.addEventListener('change', (e) => {
      this.emit('toggleQuarkLayer', { layer: 'hawking', visible: e.target.checked });
    });

    // J1. Janus vezérlők
    root.querySelector('#chk-janus-sheet')?.addEventListener('change', (e) => {
      this.emit('toggleJanusLayer', { layer: 'sheet', visible: e.target.checked });
    });
    root.querySelector('#chk-janus-positrons')?.addEventListener('change', (e) => {
      this.emit('toggleJanusLayer', { layer: 'positrons', visible: e.target.checked });
    });
    root.querySelector('#chk-janus-antiproton')?.addEventListener('change', (e) => {
      this.emit('toggleJanusLayer', { layer: 'antiproton', visible: e.target.checked });
    });

    // 0.5. Process Simulator Controls & Header Play/Stop Button
    root.querySelector('#btn-header-proc-play')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const sec = root.querySelector('#section-process-sim');
      const isRunning = !!(this.cachedProcTele && this.cachedProcTele.isPlaying);

      if (isRunning) {
        // Stop & Reset requested: reset process, collapse section, revert icon to play
        this.emit('resetProcess');
        if (sec) {
          sec.classList.add('is-collapsed');
          const icon = sec.querySelector('.section-toggle-icon');
          if (icon) icon.textContent = '▸';
          this.emit('accordionToggle', { sectionId: sec.id, isCollapsed: true, states: this.getAccordionStates() });
        }
        const btn = root.querySelector('#btn-header-proc-play');
        if (btn) {
          btn.textContent = '▶';
          btn.classList.remove('is-active-stop');
          btn.title = i18n.getLanguage() === 'hu' ? 'Folyamat Indítása' : 'Start Process';
        }
      } else {
        // Start requested: open section, emit play
        if (sec) {
          sec.classList.remove('is-collapsed');
          const icon = sec.querySelector('.section-toggle-icon');
          if (icon) icon.textContent = '▾';
          this.emit('accordionToggle', { sectionId: sec.id, isCollapsed: false, states: this.getAccordionStates() });
        }
        this.emit('toggleProcessPlay');
      }
    });

    // 1. Z Slider & Stepper & Periodic Table Picker
    const sliderZ = root.querySelector('#slider-z');
    const btnMinus = root.querySelector('#btn-z-minus');
    const btnPlus = root.querySelector('#btn-z-plus');
    const btnOpenPt = root.querySelector('#btn-open-pt');
    const elemBadge = root.querySelector('#ctrl-elem-badge');

    const onUserChangeZ = (newZ) => {
      newZ = Math.max(1, Math.min(ELEMENTS.length, parseInt(newZ, 10)));
      this.currentZ = newZ;
      this.updateElementState(newZ);
      this.emit('changeZ', newZ);
    };

    sliderZ?.addEventListener('input', (e) => onUserChangeZ(e.target.value));
    btnMinus?.addEventListener('click', () => onUserChangeZ(this.currentZ - 1));
    btnPlus?.addEventListener('click', () => onUserChangeZ(this.currentZ + 1));
    btnOpenPt?.addEventListener('click', () => this.emit('openPeriodicTable', this.currentZ));
    elemBadge?.addEventListener('click', () => this.emit('openPeriodicTable', this.currentZ));

    // 2. Permanens Shapes vezérlők (Direction 2: Shapes -> Elem szinkron)
    const onUserChangeShapes = (syncElem = true) => {
      if (this.isInternalUpdate) return;
      const activeN = parseInt(root.querySelector('#shapes-n-group .active')?.dataset.n || 1, 10);
      const activeL = parseInt(root.querySelector('#shapes-l-group .active')?.dataset.l || 0, 10);
      const selM = parseInt(root.querySelector('#select-shapes-m')?.value || 0, 10);
      const selMs = parseFloat(root.querySelector('#shapes-ms-group .active')?.dataset.ms || 0.5);

      this.currentN = activeN;
      this.currentL = activeL;
      this.currentM = selM;
      this.currentMs = selMs;

      this.emit('changeShapesConfig', { n: activeN, l: activeL, m: selM, ms: selMs, syncElement: syncElem });
    };

    root.querySelectorAll('#shapes-n-group .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#shapes-n-group .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        const nVal = parseInt(b.dataset.n, 10);
        // Ensure l < n
        this.restrictLButtons(root, nVal);
        onUserChangeShapes(true);
      });
    });

    root.querySelectorAll('#shapes-l-group .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        if (b.classList.contains('disabled')) return;
        root.querySelectorAll('#shapes-l-group .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        const lVal = parseInt(b.dataset.l, 10);
        this.populateMOptions(root, lVal);
        onUserChangeShapes(true);
      });
    });

    root.querySelector('#select-shapes-m')?.addEventListener('change', () => onUserChangeShapes(true));

    root.querySelectorAll('#shapes-ms-group .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#shapes-ms-group .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        onUserChangeShapes(false);
      });
    });

    root.querySelectorAll('#shapes-cutaway-group .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#shapes-cutaway-group .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        const deg = parseFloat(b.dataset.cutaway || 0);
        const rad = (deg * Math.PI) / 180;
        this.emit('cutawayChange', { cutawayAngle: rad, deg });
      });
    });

    // 5. koordináta: Spinor fázisszög és auto-forgatás
    const su2Slider = root.querySelector('#su2-phase-slider');
    const su2Val = root.querySelector('#su2-phase-val');
    const btnSu2Auto = root.querySelector('#btn-su2-autorotate');
    let su2AutoInterval = null;

    const onSu2Change = (deg) => {
      if (su2Val) su2Val.textContent = `${Math.round(deg)}°`;
      const rad = (deg * Math.PI) / 180;
      this.emit('su2PhaseChange', { angleRad: rad, angleDeg: deg });
    };

    su2Slider?.addEventListener('input', (e) => {
      onSu2Change(parseFloat(e.target.value));
    });

    btnSu2Auto?.addEventListener('click', () => {
      btnSu2Auto.classList.toggle('active');
      const isRunning = btnSu2Auto.classList.contains('active');
      if (isRunning) {
        su2AutoInterval = setInterval(() => {
          let cur = parseFloat(su2Slider.value || 0);
          cur = (cur + 3) % 720;
          su2Slider.value = cur;
          onSu2Change(cur);
        }, 30);
      } else {
        if (su2AutoInterval) clearInterval(su2AutoInterval);
        su2AutoInterval = null;
      }
    });

    // 3. Layer Presets Dropdown
    root.querySelector('#select-layer-preset')?.addEventListener('change', (e) => {
      const preset = e.target.value;
      if (!preset) return;
      this.applyPresetCheckboxes(root, preset);
      this.emit('applyPreset', preset);
    });

    // 4. Dinamikusan generalt Layer Checkboxok
    this.layerCheckboxMappings = LAYER_DEFINITIONS.map(def => ({
      id: `#${def.checkboxId}`,
      layer: def.id
    }));

    LAYER_DEFINITIONS.forEach(def => {
      const el = root.querySelector(`#${def.checkboxId}`);
      el?.addEventListener('change', (e) => {
        const visible = e.target.checked;
        this.clearPresetSelection(root);

        // Automatikus fuggosegfeloldas (pl. tracks bekapcsolasa bekapcsolja az electrons-t)
        const currentLayers = this.getLayerCheckboxValues(root);
        const depChanges = resolveLayerDependencies(def.id, visible, currentLayers);

        Object.entries(depChanges).forEach(([targetLayer, targetVis]) => {
          const targetDef = LAYER_DEFINITIONS.find(d => d.id === targetLayer);
          if (targetDef) {
            const chk = root.querySelector(`#${targetDef.checkboxId}`);
            if (chk && chk.checked !== targetVis) {
              chk.checked = targetVis;
            }
          }
          this.emit('toggleLayer', { layer: targetLayer, visible: targetVis });
        });
      });
    });
  }

  getLayerCheckboxValues(root = this.panelElement) {
    const vals = {};
    if (!root) return vals;
    LAYER_DEFINITIONS.forEach(def => {
      const chk = root.querySelector(`#${def.checkboxId}`);
      if (chk) vals[def.id] = chk.checked;
    });
    return vals;
  }

  restrictLButtons(root, n) {
    root.querySelectorAll('#shapes-l-group .btn-toggle-opt').forEach(b => {
      const l = parseInt(b.dataset.l, 10);
      const isAllowed = l < n;
      b.classList.toggle('disabled', !isAllowed);
      b.style.opacity = isAllowed ? '1' : '0.3';
      b.style.pointerEvents = isAllowed ? 'auto' : 'none';
      if (!isAllowed && b.classList.contains('active')) {
        b.classList.remove('active');
        const sBtn = root.querySelector('#shapes-l-group [data-l="0"]');
        if (sBtn) sBtn.classList.add('active');
        this.populateMOptions(root, 0);
      }
    });
  }

  populateMOptions(root, l) {
    const select = root.querySelector('#select-shapes-m');
    if (!select) return;
    select.innerHTML = '';

    const labels = {
      0: { 0: 'm = 0 (s-gömb)' },
      1: { '-1': 'm = -1 (py)', '0': 'm = 0 (pz / fuggoleges)', '1': 'm = +1 (px)' },
      2: { '-2': 'm = -2 (dxy)', '-1': 'm = -1 (dyz)', '0': 'm = 0 (dz²)', '1': 'm = +1 (dxz)', '2': 'm = +2 (dx²-y²)' },
      3: { '-3': 'm = -3', '-2': 'm = -2', '-1': 'm = -1', '0': 'm = 0 (fz³)', '1': 'm = +1', '2': 'm = +2', '3': 'm = +3' }
    };

    for (let m = -l; m <= l; m++) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = labels[l]?.[m] || `m = ${m}`;
      if (m === 0) opt.selected = true;
      select.appendChild(opt);
    }
  }

  populatePhaseOptions(root) {
    if (!root) return;
    const sel = root.querySelector('#select-proc-phase');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '';
    for (let i = 0; i <= 6; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = i18n.t(`phases.${i}.selectLabel`, `${i}: Phase ${i}`);
      sel.appendChild(opt);
    }
    if (currentVal !== undefined && currentVal !== '') {
      sel.value = currentVal;
    }
  }

  clearPresetSelection(root = this.panelElement) {
    if (!root) return;
    const presetSel = root.querySelector('#select-layer-preset');
    if (presetSel) {
      presetSel.value = '';
    }
  }

  applyPresetCheckboxes(root, preset) {
    const presetSel = root.querySelector('#select-layer-preset');
    if (presetSel && presetSel.value !== preset) {
      presetSel.value = preset || '';
    }

    if (!preset) return;

    const presetState = getPresetLayerState(preset);
    if (!presetState) return;

    LAYER_DEFINITIONS.forEach(def => {
      const el = root.querySelector(`#${def.checkboxId}`);
      if (el && presetState[def.id] !== undefined) {
        el.checked = !!presetState[def.id];
      }
    });

    const lodEl = root.querySelector('#chk-layer-auto-lod');
    if (lodEl && presetState.autoLOD !== undefined) {
      lodEl.checked = !!presetState.autoLOD;
    }
  }

  /**
   * Updates element UI controls and populates its subshells
   * @param {number} Z
   */
  updateElementState(Z) {
    this.currentZ = Z;
    const elem = getElement(Z);
    const root = this.panelElement;
    if (!root) return;

    // Badge
    const badge = root.querySelector('#ctrl-elem-badge');
    if (badge) {
      const localizedName = i18n.getElementName(elem.sym, elem.name);
      badge.innerHTML = `
        <span class="elem-sym" style="color: #${elem.color.toString(16).padStart(6, '0')}">${elem.sym}</span>
        <span class="elem-info">${localizedName} (Z = ${elem.Z}, A = ${elem.mass})</span>
      `;
    }

    // Slider & text
    const sliderZ = root.querySelector('#slider-z');
    const valZ = root.querySelector('#val-z');
    if (sliderZ) sliderZ.value = Z;
    if (valZ) valZ.textContent = `${Z} e⁻`;

    // Populate occupied subshells list for this element
    const valInfo = getElementValenceOrbital(Z);
    const subList = root.querySelector('#elem-subshells-list');
    if (subList) {
      subList.innerHTML = '';
      valInfo.allSubshells.forEach(sub => {
        const btn = document.createElement('button');
        btn.className = `btn-subshell-chip ${sub.n === this.currentN && sub.l === this.currentL ? 'active' : ''}`;
        btn.textContent = `${sub.label} (${sub.count})`;
        btn.title = `${sub.label} alhéj kiválasztása ehhez az elemhez`;
        btn.addEventListener('click', () => {
          this.setOrbitalState(sub.n, sub.l, 0);
          this.emit('changeShapesConfig', { n: sub.n, l: sub.l, m: 0, syncElement: false });
        });
        subList.appendChild(btn);
      });
    }

    // Populate the excitation subshell selector (which electron absorbs the excitation)
    const exciteSel = root.querySelector('#select-excite-subshell');
    if (exciteSel) {
      const prev = exciteSel.value;
      exciteSel.innerHTML = '<option value="valence">Valencia (automatikus)</option>';
      valInfo.allSubshells.forEach((sub) => {
        const opt = document.createElement('option');
        opt.value = `${sub.n}:${sub.l}`;
        opt.textContent = `${sub.label} (${sub.count} e⁻)`;
        exciteSel.appendChild(opt);
      });
      // Restore previous selection if still valid
      if (prev && Array.from(exciteSel.options).some((o) => o.value === prev)) {
        exciteSel.value = prev;
      }
    }
  }

  /**
   * Updates the excitation channel info banner with the current element's transition.
   * @param {Object} channel - result of getExcitationChannel()
   */
  updateChannelInfo(channel) {
    if (!this.panelElement || !channel) return;
    const info = this.panelElement.querySelector('#proc-channel-info');
    if (info) {
      const absorb = channel.canAbsorb ? '' : ' ⚠ E_in < ΔE';
      info.textContent = `Csatorna: ${channel.source.label} ➔ ${channel.target.label} (ΔE = ${channel.deltaE.toFixed(2)} eV, λ = ${channel.lambdaNm.toFixed(0)} nm)${absorb}`;
    }
  }

  /**
   * Sets orbital state without triggering circular event loop
   */
  setOrbitalState(n, l, m, ms = 0.5) {
    this.isInternalUpdate = true;
    this.currentN = n;
    this.currentL = l;
    this.currentM = m;
    this.currentMs = ms;

    const root = this.panelElement;
    if (!root) {
      this.isInternalUpdate = false;
      return;
    }

    // n buttons
    root.querySelectorAll('#shapes-n-group .btn-toggle-opt').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.n, 10) === n);
    });

    this.restrictLButtons(root, n);

    // l buttons
    root.querySelectorAll('#shapes-l-group .btn-toggle-opt').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.l, 10) === l);
    });

    this.populateMOptions(root, l);

    const selM = root.querySelector('#select-shapes-m');
    if (selM) selM.value = m;

    if (ms !== undefined) {
      root.querySelectorAll('#shapes-ms-group .btn-toggle-opt').forEach(b => {
        const bMs = parseFloat(b.dataset.ms);
        b.classList.toggle('active', Math.abs(bMs - ms) < 0.1);
      });
    }

    // Update active subshell chip highlight
    root.querySelectorAll('#elem-subshells-list .btn-subshell-chip').forEach(chip => {
      chip.classList.toggle('active', chip.textContent.startsWith(`${n}${['s','p','d','f'][l]}`));
    });

    this.isInternalUpdate = false;
  }

  setSu2AngleState(deg) {
    const root = this.panelElement;
    if (!root) return;
    const su2Slider = root.querySelector('#su2-phase-slider');
    const su2Val = root.querySelector('#su2-phase-val');
    if (su2Slider) su2Slider.value = deg;
    if (su2Val) su2Val.textContent = `${Math.round(deg)}°`;
  }

  setCutawayState(angle) {
    const root = this.panelElement;
    if (!root) return;
    const deg = Math.round((angle * 180) / Math.PI);
    root.querySelectorAll('#shapes-cutaway-group .btn-toggle-opt').forEach(b => {
      const bDeg = parseInt(b.dataset.cutaway || 0, 10);
      b.classList.toggle('active', Math.abs(bDeg - deg) < 15);
    });
  }

  setPauseState(isPaused) {
    const btn = this.panelElement?.querySelector('#btn-pause-play');
    if (btn) btn.textContent = isPaused ? '▶️ Lejátszás' : '⏸️ Szünet';
  }

  setLevel(level, details = {}) {
    if (!this.panelElement) return;

    this.currentLevel = level;

    // 1. Update Level buttons: ONLY the active level has .active
    this.panelElement.querySelectorAll('.btn-ctrl-level').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });

    // Reset camera preset buttons active state to perspective
    this.panelElement.querySelectorAll('.btn-cam').forEach(b => {
      b.classList.toggle('active', b.dataset.cam === 'perspective');
    });

    const isAtom = (level === 'atom');
    const isNucleon = (level === 'nucleon');
    const isQuark = (level === 'quark');
    const isJanus = (level === 'janus');

    // 2. Atom specific sections: show/enable only in Atom view
    const atomSectionSelectors = [
      '#section-process-sim',
      '#section-element',
      '#section-shapes-perm',
      '#section-presets',
      '#section-layers'
    ];

    atomSectionSelectors.forEach(sel => {
      const sec = this.panelElement.querySelector(sel);
      if (sec) {
        sec.style.display = isAtom ? 'block' : 'none';
        sec.classList.toggle('section-disabled', !isAtom);
        sec.querySelectorAll('button, input, select').forEach(el => {
          el.disabled = !isAtom;
        });
      }
    });

    // Remove .active from atom buttons when not in atom view
    if (!isAtom) {
      this.panelElement.querySelectorAll(
        '#shapes-n-group .btn-toggle-opt, #shapes-l-group .btn-toggle-opt, #arrangement-group .btn-toggle-opt'
      ).forEach(el => {
        el.classList.remove('active');
      });
    } else {
      // Re-apply active state to current element, orbital, arrangement
      this.updateElementState(this.currentZ);
      this.setOrbitalState(this.currentN, this.currentL, this.currentM);

      const arrBtn = this.panelElement.querySelector(`#arrangement-group .btn-toggle-opt[data-arr="single"]`);
      if (arrBtn) arrBtn.classList.add('active');
    }

    // 3. Nucleon Section
    const secNucleon = this.panelElement.querySelector('#section-nucleon-ctrl');
    if (secNucleon) {
      secNucleon.style.display = isNucleon ? 'block' : 'none';
      if (isNucleon) {
        const isProt = (details.isProton !== undefined) ? details.isProton : true;
        const btnProt = secNucleon.querySelector('#btn-nuc-proton');
        const btnNeut = secNucleon.querySelector('#btn-nuc-neutron');
        btnProt?.classList.toggle('active', isProt);
        btnNeut?.classList.toggle('active', !isProt);
      }
    }

    // 4. Quark Section
    const secQuark = this.panelElement.querySelector('#section-quark-ctrl');
    if (secQuark) {
      secQuark.style.display = isQuark ? 'block' : 'none';
      if (isQuark) {
        const isUp = (details.type !== 'down');
        const btnUp = secQuark.querySelector('#btn-quark-up');
        const btnDown = secQuark.querySelector('#btn-quark-down');
        btnUp?.classList.toggle('active', isUp);
        btnDown?.classList.toggle('active', !isUp);
      }
    }

    // 5. Janus Section
    const secJanus = this.panelElement.querySelector('#section-janus-ctrl');
    if (secJanus) {
      secJanus.style.display = isJanus ? 'block' : 'none';
    }
  }

  updateProcessUI(procTele) {
    if (!this.panelElement || !procTele) return;
    this.cachedProcTele = procTele;
    const banner = this.panelElement.querySelector('#proc-phase-title');
    const bar = this.panelElement.querySelector('#proc-progress-bar');
    const playBtn = this.panelElement.querySelector('#btn-proc-play');
    const selectPhase = this.panelElement.querySelector('#select-proc-phase');

    if (banner) {
      banner.textContent = `${procTele.phase.title} (${Math.round(procTele.progress * 100)}%)`;
    }
    if (bar) {
      bar.style.width = `${Math.round(procTele.progress * 100)}%`;
    }
    if (playBtn) {
      playBtn.textContent = procTele.isPlaying
        ? i18n.t('controlPanel.processPause', '⏸ Pause')
        : i18n.t('controlPanel.processStart', '▶ Start Process');
    }
    const headerPlayBtn = this.panelElement.querySelector('#btn-header-proc-play');
    if (headerPlayBtn) {
      const isRunning = !!procTele.isPlaying;
      headerPlayBtn.textContent = isRunning ? '⏹' : '▶';
      headerPlayBtn.title = isRunning
        ? (i18n.getLanguage() === 'hu' ? 'Stop & Visszaállítás' : 'Stop & Reset')
        : (i18n.getLanguage() === 'hu' ? 'Folyamat Indítása' : 'Start Process');
      headerPlayBtn.classList.toggle('is-active-stop', isRunning);
    }
    if (selectPhase && parseInt(selectPhase.value, 10) !== procTele.phase.id) {
      selectPhase.value = procTele.phase.id;
    }
  }

  applyTranslations() {
    if (!this.panelElement) return;
    this.setTitle(i18n.t('controlPanel.title', 'Control Panel'));

    this.panelElement.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = i18n.t(key, el.textContent);
    });

    this.panelElement.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle;
      el.title = i18n.t(key, el.title);
    });

    this.updateElementState(this.currentZ);
    this.populateMOptions(this.panelElement, this.currentL);
    this.populatePhaseOptions(this.panelElement);

    const presetSel = this.panelElement.querySelector('#select-layer-preset');
    if (presetSel) {
      const currentVal = presetSel.value;
      presetSel.innerHTML = this.renderPresetOptions();
      presetSel.value = currentVal;
    }

    if (this.cachedProcTele) {
      this.updateProcessUI(this.cachedProcTele);
    }
  }

  setLayers(layerState) {
    if (!layerState || !this.panelElement || !this.layerCheckboxMappings) return;
    this.layerCheckboxMappings.forEach(({ id, layer }) => {
      if (layerState[layer] !== undefined) {
        const el = this.panelElement.querySelector(id);
        if (el) el.checked = !!layerState[layer];
      }
    });
    if (layerState.vacuumWire !== undefined) {
      const el = this.panelElement.querySelector('#chk-vacuum-wire');
      if (el) el.checked = !!layerState.vacuumWire;
    }
  }

  setPlaybackUI(playback) {
    if (!playback || !this.panelElement) return;
    if (playback.Z !== undefined) {
      this.updateElementState(playback.Z);
    }
    if (playback.selectedOrbital) {
      this.setOrbitalState(playback.selectedOrbital.n, playback.selectedOrbital.l, playback.selectedOrbital.m || 0);
    }
    if (playback.isPaused !== undefined) {
      this.setPauseState(playback.isPaused);
    }
    const presetSel = this.panelElement.querySelector('#select-layer-preset');
    if (presetSel) {
      presetSel.value = playback.preset || '';
    }
  }
}
