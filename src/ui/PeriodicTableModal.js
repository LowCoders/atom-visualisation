import { ELEMENTS, getElement, buildElectronConfiguration } from '../core/QuantumPhysics.js';
import { i18n } from '../core/I18n.js';
import { EventEmitter } from '../core/EventEmitter.js';

function getGridPosition(z) {
  if (z === 1) return { r: 1, c: 1 };
  if (z === 2) return { r: 1, c: 18 };
  if (z >= 3 && z <= 4) return { r: 2, c: z - 2 };
  if (z >= 5 && z <= 10) return { r: 2, c: z + 8 };
  if (z >= 11 && z <= 12) return { r: 3, c: z - 10 };
  if (z >= 13 && z <= 18) return { r: 3, c: z };
  if (z >= 19 && z <= 36) return { r: 4, c: z - 18 };
  if (z >= 37 && z <= 54) return { r: 5, c: z - 36 };
  if (z >= 55 && z <= 56) return { r: 6, c: z - 54 };
  if (z >= 57 && z <= 71) return { r: 8, c: z - 57 + 3 }; // Lanthanides row 8
  if (z >= 72 && z <= 86) return { r: 6, c: z - 72 + 4 };
  if (z >= 87 && z <= 88) return { r: 7, c: z - 86 };
  if (z >= 89 && z <= 103) return { r: 9, c: z - 89 + 3 }; // Actinides row 9
  if (z >= 104 && z <= 118) return { r: 7, c: z - 104 + 4 };
  // Period 8 & Island of Stability: row 10
  if (z === 119) return { r: 10, c: 1 };
  if (z === 120) return { r: 10, c: 2 };
  if (z >= 121 && z <= 126) return { r: 10, c: z - 121 + 3 };
  return { r: 1, c: 1 };
}

function getCategoryId(z) {
  if (z >= 119) return 'superheavy';
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return 'noble';
  if ([9, 17, 35, 53, 85, 117].includes(z)) return 'halogen';
  if (z === 1 || [6, 7, 8, 15, 16, 34].includes(z)) return 'nonmetal';
  if ([5, 14, 32, 33, 51, 52].includes(z)) return 'metalloid';
  if ([3, 11, 19, 37, 55, 87].includes(z)) return 'alkali';
  if ([4, 12, 20, 38, 56, 88].includes(z)) return 'alkaline';
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z)) return 'post-transition';
  return 'transition';
}

const CATEGORY_COLORS = {
  noble: '#a855f7',
  halogen: '#06b6d4',
  nonmetal: '#38bdf8',
  metalloid: '#10b981',
  alkali: '#ef4444',
  alkaline: '#f97316',
  lanthanide: '#ec4899',
  actinide: '#e11d48',
  'post-transition': '#64748b',
  transition: '#f59e0b',
  superheavy: '#00f0ff'
};

export class PeriodicTableModal extends EventEmitter {
  constructor(initialZ = 2) {
    super();
    this.selectedZ = initialZ;
    this.backdropElement = null;
    this.isOpen = false;
    this._onKeyDown = this.onKeyDown.bind(this);

    this.init();

    i18n.on('languageChange', () => {
      this.updateStaticTexts();
      this.renderGrid();
      this.selectElement(this.selectedZ);
    });
  }

  init() {
    this.backdropElement = document.createElement('div');
    this.backdropElement.id = 'periodic-table-modal-backdrop';
    this.backdropElement.className = 'modal-backdrop';
    this.backdropElement.style.display = 'none';

    this.backdropElement.innerHTML = `
      <div class="modal-dialog glass-panel periodic-modal" style="max-width: 960px; width: 95vw;">
        <div class="modal-header">
          <div class="modal-title">
            <span class="modal-icon">⊞</span>
            <span class="modal-title-text" id="pt-modal-title">Bővített Periódusos Rendszer (Z = 1 → 126)</span>
          </div>
          <button class="modal-btn-close" title="Bezárás">✕</button>
        </div>

        <div class="modal-body" style="padding: 12px 16px;">
          <!-- Search & Filter bar -->
          <div class="periodic-search-bar" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: center;">
            <input type="text" id="pt-search-input" class="search-input" placeholder="Keresés név, vegyjel vagy rendszám alapján..." style="flex: 1; padding: 6px 12px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.18); color: #fff; border-radius: 6px; font-size: 11.5px; outline: none;">
            <div id="pt-legend" style="display: flex; gap: 6px; flex-wrap: wrap; font-size: 9.5px;"></div>
          </div>

          <!-- Periodic Grid Container -->
          <div class="periodic-grid-scroll-wrap" style="overflow-x: auto; padding-bottom: 6px;">
            <div id="periodic-elements-grid" class="periodic-grid"></div>
          </div>

          <!-- Selected Element Drawer / Actions -->
          <div id="pt-drawer" class="element-drawer" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.6); padding: 8px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div id="pt-drawer-sym" style="font-size: 24px; font-weight: 800; color: var(--accent-cyan); font-family: monospace;">He</div>
              <div>
                <div id="pt-drawer-name" style="font-size: 13px; font-weight: 700; color: #fff;">Hélium (Z = 2, A = 4)</div>
                <div id="pt-drawer-notation" style="font-size: 11px; color: #94a3b8; font-family: monospace;">1s²</div>
              </div>
            </div>
            <button id="btn-pt-select" class="btn-action" style="padding: 6px 16px; font-weight: 700; background: rgba(56, 189, 248, 0.25); border-color: var(--accent-cyan); color: #fff;">
              ✓ Atom Betöltése
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.backdropElement);

    // Event listeners
    const btnClose = this.backdropElement.querySelector('.modal-btn-close');
    btnClose?.addEventListener('click', () => this.close());
    this.backdropElement.addEventListener('click', (e) => {
      if (e.target === this.backdropElement) this.close();
    });

    const searchInput = this.backdropElement.querySelector('#pt-search-input');
    searchInput?.addEventListener('input', (e) => this.filterGrid(e.target.value));

    const btnSelect = this.backdropElement.querySelector('#btn-pt-select');
    btnSelect?.addEventListener('click', () => {
      this.emit('selectElement', this.selectedZ);
      this.close();
    });

    this.renderLegend();
    this.renderGrid();
    this.selectElement(this.selectedZ);
    this.updateStaticTexts();
  }

  updateStaticTexts() {
    const isEn = i18n.getLanguage() === 'en';
    const titleEl = this.backdropElement.querySelector('#pt-modal-title');
    if (titleEl) {
      titleEl.textContent = isEn
        ? 'Extended Periodic Table (Z = 1 → 126)'
        : 'Bővített Periódusos Rendszer (Z = 1 → 126)';
    }

    const searchInput = this.backdropElement.querySelector('#pt-search-input');
    if (searchInput) {
      searchInput.placeholder = isEn
        ? 'Search by element name, symbol, or atomic number (Z)...'
        : 'Keresés név, vegyjel vagy rendszám alapján...';
    }

    const btnSelect = this.backdropElement.querySelector('#btn-pt-select');
    if (btnSelect) {
      btnSelect.textContent = isEn ? '✓ Load Atom' : '✓ Atom Betöltése';
    }
  }

  renderLegend() {
    const legendEl = this.backdropElement.querySelector('#pt-legend');
    if (!legendEl) return;
    const isEn = i18n.getLanguage() === 'en';

    const categories = [
      { id: 'nonmetal', label: isEn ? 'Nonmetal' : 'Nemfém' },
      { id: 'noble', label: isEn ? 'Noble Gas' : 'Nemesgáz' },
      { id: 'alkali', label: isEn ? 'Alkali' : 'Alkálifém' },
      { id: 'alkaline', label: isEn ? 'Alkaline' : 'Alkáli földfém' },
      { id: 'transition', label: isEn ? 'Transition' : 'Átmenetifém' },
      { id: 'lanthanide', label: isEn ? 'Lanthanide' : 'Lantanoida' },
      { id: 'actinide', label: isEn ? 'Actinide' : 'Aktinoida' },
      { id: 'superheavy', label: isEn ? 'Island of Stability' : 'Stabilitás szigete' }
    ];

    legendEl.innerHTML = categories.map(c => `
      <span style="display: inline-flex; align-items: center; gap: 3px; color: #cbd5e1;">
        <span style="display: inline-block; width: 7px; height: 7px; border-radius: 2px; background: ${CATEGORY_COLORS[c.id] || '#64748b'};"></span>
        ${c.label}
      </span>
    `).join('');
  }

  renderGrid() {
    const gridEl = this.backdropElement.querySelector('#periodic-elements-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    ELEMENTS.forEach(elem => {
      const pos = getGridPosition(elem.Z);
      const cat = getCategoryId(elem.Z);
      const catColor = CATEGORY_COLORS[cat] || '#64748b';
      const localizedName = i18n.getElementName(elem.sym, elem.name);

      const tile = document.createElement('div');
      tile.className = `element-tile ${elem.Z === this.selectedZ ? 'active' : ''}`;
      tile.dataset.z = elem.Z;
      tile.style.gridRow = pos.r;
      tile.style.gridColumn = pos.c;
      tile.style.borderColor = catColor;

      tile.innerHTML = `
        <span class="tile-z" style="color: #94a3b8; font-size: 8px;">${elem.Z}</span>
        <span class="tile-sym" style="color: ${catColor}; font-weight: 800; font-size: 12.5px;">${elem.sym}</span>
        <span class="tile-name" style="font-size: 8px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 42px;">${localizedName}</span>
      `;

      tile.addEventListener('click', () => {
        this.selectElement(elem.Z);
        this.emit('selectElement', elem.Z);
      });

      tile.addEventListener('dblclick', () => {
        this.selectElement(elem.Z);
        this.emit('selectElement', elem.Z);
        this.close();
      });

      gridEl.appendChild(tile);
    });
  }

  filterGrid(query) {
    const q = (query || '').toLowerCase().trim();
    const gridEl = this.backdropElement.querySelector('#periodic-elements-grid');
    if (!gridEl) return;

    gridEl.querySelectorAll('.element-tile').forEach(tile => {
      const z = parseInt(tile.dataset.z, 10);
      const elem = getElement(z);
      if (!elem) return;

      const locName = i18n.getElementName(elem.sym, elem.name).toLowerCase();
      const sym = elem.sym.toLowerCase();
      const zStr = String(elem.Z);

      const match = !q || locName.includes(q) || sym.includes(q) || zStr === q;
      tile.style.opacity = match ? '1' : '0.15';
      tile.style.pointerEvents = match ? 'auto' : 'none';
    });
  }

  selectElement(z) {
    this.selectedZ = Math.max(1, Math.min(ELEMENTS.length, z));
    const elem = getElement(this.selectedZ);
    if (!elem) return;

    // Highlight tile
    this.backdropElement.querySelectorAll('.element-tile').forEach(t => {
      t.classList.toggle('active', parseInt(t.dataset.z, 10) === this.selectedZ);
    });

    // Update drawer
    const elSym = this.backdropElement.querySelector('#pt-drawer-sym');
    const elName = this.backdropElement.querySelector('#pt-drawer-name');
    const elNotation = this.backdropElement.querySelector('#pt-drawer-notation');

    const localizedName = i18n.getElementName(elem.sym, elem.name);
    const config = buildElectronConfiguration(elem.Z);

    if (elSym) {
      elSym.textContent = elem.sym;
      const cat = getCategoryId(elem.Z);
      elSym.style.color = CATEGORY_COLORS[cat] || 'var(--accent-cyan)';
    }
    if (elName) {
      elName.textContent = `${localizedName} (Z = ${elem.Z}, A = ${elem.mass})`;
    }
    if (elNotation) {
      elNotation.textContent = config.notation || `Héjak: [${elem.shells.join(', ')}]`;
    }
  }

  open(currentZ) {
    if (currentZ) this.selectElement(currentZ);
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
}
