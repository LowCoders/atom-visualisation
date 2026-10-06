import { i18n } from '../core/I18n.js';
import { EventEmitter } from '../core/EventEmitter.js';

/**
 * SettingsModal: Glassmorphic settings popup window.
 * Hosts advanced physics & simulation configurations:
 * 1. Spacetime Curvature (Colormap: Depth, Curvature, Entropy)
 * 2. Entropic Time & Recoil (Debye-Waller factor, Manual recoil)
 * 3. Energy Flow & Extra Dimensions (Flow speed, Dimensional depth)
 * 4. Atomic Construction & Arrangement (1 Atom, Molecule, Water, Lattice)
 */
export class SettingsModal extends EventEmitter {
  constructor(options = {}) {
    super();
    this.backdropElement = null;
    this.modalElement = null;
    this.isOpen = false;
    this._onKeyDown = this.onKeyDown.bind(this);

    this.init();

    i18n.on('languageChange', () => {
      this.applyTranslations();
    });
  }

  init() {
    this.backdropElement = document.createElement('div');
    this.backdropElement.id = 'settings-modal-backdrop';
    this.backdropElement.className = 'modal-backdrop';
    this.backdropElement.style.display = 'none';

    this.backdropElement.innerHTML = `
      <div class="modal-dialog glass-panel settings-modal" style="max-width: 460px; width: 92vw;">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">⚙️</span>
            <span class="modal-title-text" data-i18n="settingsModal.title">Beállítások & Szimuláció</span>
          </div>
          <button class="modal-btn-close" title="Bezárás">✕</button>
        </div>

        <div class="modal-body" style="padding: 14px 18px; display: flex; flex-direction: column; gap: 14px; max-height: 80vh; overflow-y: auto;">
          <!-- 1. TÉRIDŐ-GÖRBÜLET & ENTRÓPIKUS IDŐ -->
          <div class="settings-group">
            <div class="settings-group-title" style="color: var(--accent-cyan); font-weight: 700; font-size: 11px; margin-bottom: 6px;" data-i18n="controlPanel.curvatureTitle">
              🌌 Téridő-görbület & Entrópikus Idő
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-bottom: 6px;" data-i18n="controlPanel.colormapLabel">Vákuumszőnyeg Színleképezés:</div>
            <div class="btn-group-toggle" id="modal-vacuum-colormode" style="display: flex; gap: 6px;">
              <button class="btn-toggle-opt active" data-vmode="depth" data-i18n="controlPanel.modeDepth">Mélység (δg₀₀)</button>
              <button class="btn-toggle-opt" data-vmode="curvature" data-i18n="controlPanel.modeCurvature">Riemann Görbület</button>
              <button class="btn-toggle-opt" data-vmode="entropy" data-i18n="controlPanel.modeEntropy">Entrópikus Hullámok</button>
            </div>

            <div style="font-size: 11px; color: #94a3b8; margin-top: 10px; margin-bottom: 6px;" data-i18n="controlPanel.recoilCoupling">Visszalökődési Csatolás (Debye–Waller):</div>
            <div class="btn-group-toggle" id="modal-debye-waller" style="display: flex; gap: 6px;">
              <button class="btn-toggle-opt active" data-fdw="0.0" data-i18n="controlPanel.freeAtom" title="Szabad mag: maximális visszalökődés, ugró entrópikus idő">Szabad mag (f_DW = 0)</button>
              <button class="btn-toggle-opt" data-fdw="0.8" data-i18n="controlPanel.latticeAtom" title="Mössbauer kristályrács: a rács kollektívan veszi fel a lendületet">Kristályrács (f_DW = 0.8)</button>
            </div>
          </div>

          <!-- 2. ENERGIAÁRAMLÁS & EXTRA DIMENZIÓ -->
          <div class="settings-group">
            <div class="settings-group-title" style="color: var(--accent-gold); font-weight: 700; font-size: 11px; margin-bottom: 6px;" data-i18n="controlPanel.energyFlowTitle">
              ✨ Energiaáramlás & Extra Dimenzió
            </div>
            <div class="slider-row" style="margin-bottom: 6px;">
              <label style="font-size: 11px;" data-i18n="controlPanel.flowSpeed">Áramlási sebesség:</label>
              <input type="range" id="modal-slider-flow-speed" min="0.2" max="3" value="1.6" step="0.1">
              <span class="slider-val" id="modal-val-flow-speed">1.6x</span>
            </div>
            <div class="slider-row">
              <label style="font-size: 11px;" data-i18n="controlPanel.dipDepth">Dimenziós mélység:</label>
              <input type="range" id="modal-slider-dip-depth" min="0.5" max="6" value="3.2" step="0.1">
              <span class="slider-val" id="modal-val-dip-depth">3.2</span>
            </div>
          </div>

          <!-- 3. ATOM KONSTRUKCIÓ & ELRENDEZÉS -->
          <div class="settings-group">
            <div class="settings-group-title" style="color: var(--accent-magenta); font-weight: 700; font-size: 11px; margin-bottom: 6px;" data-i18n="controlPanel.arrangementTitle">
              🌌 Atom Konstrukció & Elrendezés
            </div>
            <div class="btn-group-toggle" id="modal-arrangement-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <button class="btn-toggle-opt active" data-arr="single" data-i18n="controlPanel.singleAtom">1 Atom</button>
              <button class="btn-toggle-opt" data-arr="diatomic" data-i18n="controlPanel.molecule2">Molekula (2)</button>
              <button class="btn-toggle-opt" data-arr="triatomic" data-i18n="controlPanel.waterH2O">Víz (H₂O)</button>
              <button class="btn-toggle-opt" data-arr="lattice" data-i18n="controlPanel.lattice4">Rács (4)</button>
            </div>

            <div style="font-size: 11px; color: #94a3b8; margin-top: 10px; margin-bottom: 6px;" data-i18n="controlPanel.drumTitle">🥁 s-típusú Membrán Rezgésmódok:</div>
            <div class="btn-group-toggle" id="modal-drum-mode-group" style="display: flex; gap: 6px;">
              <button class="btn-toggle-opt" data-drum="1">1s analog (n=1)</button>
              <button class="btn-toggle-opt active" data-drum="2">2s analog (n=2, 1 csomó)</button>
              <button class="btn-toggle-opt" data-drum="3">3s analog (n=3, 2 csomó)</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.backdropElement);

    // Close button & click outside
    const btnClose = this.backdropElement.querySelector('.modal-btn-close');
    btnClose?.addEventListener('click', () => this.close());
    this.backdropElement.addEventListener('click', (e) => {
      if (e.target === this.backdropElement) this.close();
    });

    this.bindEvents();
    this.applyTranslations();
  }

  bindEvents() {
    const root = this.backdropElement;

    // Colormap
    root.querySelectorAll('#modal-vacuum-colormode .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#modal-vacuum-colormode .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        this.emit('changeVacuumColorMode', b.dataset.vmode);
      });
    });

    // Debye-Waller
    root.querySelectorAll('#modal-debye-waller .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#modal-debye-waller .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        const fdw = parseFloat(b.dataset.fdw);
        this.emit('changeDebyeWaller', fdw);
      });
    });

    // Sliders
    const sliderFlow = root.querySelector('#modal-slider-flow-speed');
    const valFlow = root.querySelector('#modal-val-flow-speed');
    sliderFlow?.addEventListener('input', (e) => {
      const spd = parseFloat(e.target.value);
      if (valFlow) valFlow.textContent = `${spd.toFixed(1)}x`;
      this.emit('changeFlowSpeed', spd);
    });

    const sliderDip = root.querySelector('#modal-slider-dip-depth');
    const valDip = root.querySelector('#modal-val-dip-depth');
    sliderDip?.addEventListener('input', (e) => {
      const dip = parseFloat(e.target.value);
      if (valDip) valDip.textContent = dip.toFixed(1);
      this.emit('changeDipDepth', dip);
    });

    // Arrangement
    root.querySelectorAll('#modal-arrangement-group .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#modal-arrangement-group .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        this.emit('changeArrangement', b.dataset.arr);
      });
    });

    // s-Type Membrane Modes
    root.querySelectorAll('#modal-drum-mode-group .btn-toggle-opt').forEach(b => {
      b.addEventListener('click', () => {
        root.querySelectorAll('#modal-drum-mode-group .btn-toggle-opt').forEach(btn => btn.classList.remove('active'));
        b.classList.add('active');
        this.emit('changeDrumConfig', { modeIndex: parseInt(b.dataset.drum, 10) });
      });
    });
  }

  open() {
    this.isOpen = true;
    if (this.backdropElement) {
      this.backdropElement.style.display = 'flex';
      requestAnimationFrame(() => {
        this.backdropElement.classList.add('modal-visible');
      });
    }
    window.addEventListener('keydown', this._onKeyDown);
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this.backdropElement) {
      this.backdropElement.classList.remove('modal-visible');
      setTimeout(() => {
        if (!this.isOpen && this.backdropElement) {
          this.backdropElement.style.display = 'none';
        }
      }, 200);
    }
    window.removeEventListener('keydown', this._onKeyDown);
  }

  onKeyDown(e) {
    if (e.key === 'Escape') this.close();
  }

  setValues(playback) {
    if (!playback || !this.backdropElement) return;
    const root = this.backdropElement;

    if (playback.vacuumColorMode) {
      root.querySelectorAll('#modal-vacuum-colormode .btn-toggle-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.vmode === playback.vacuumColorMode);
      });
    }
    if (playback.fDebyeWaller !== undefined) {
      root.querySelectorAll('#modal-debye-waller .btn-toggle-opt').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.fdw) === playback.fDebyeWaller);
      });
    }
    if (playback.flowSpeed !== undefined) {
      const s = root.querySelector('#modal-slider-flow-speed');
      const v = root.querySelector('#modal-val-flow-speed');
      if (s) s.value = playback.flowSpeed;
      if (v) v.textContent = `${playback.flowSpeed.toFixed(1)}x`;
    }
    if (playback.dipDepth !== undefined) {
      const s = root.querySelector('#modal-slider-dip-depth');
      const v = root.querySelector('#modal-val-dip-depth');
      if (s) s.value = playback.dipDepth;
      if (v) v.textContent = playback.dipDepth.toFixed(1);
    }
    if (playback.arrangement) {
      root.querySelectorAll('#modal-arrangement-group .btn-toggle-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.arr === playback.arrangement);
      });
    }
    if (playback.drumModeIndex !== undefined) {
      root.querySelectorAll('#modal-drum-mode-group .btn-toggle-opt').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.drum, 10) === playback.drumModeIndex);
      });
    }
  }

  applyTranslations() {
    if (!this.backdropElement) return;
    this.backdropElement.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      el.textContent = i18n.t(key, el.textContent);
    });
    this.backdropElement.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.dataset.i18nTitle;
      el.title = i18n.t(key, el.title);
    });
  }
}
