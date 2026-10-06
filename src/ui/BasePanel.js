import { EventEmitter } from '../core/EventEmitter.js';

/**
 * BasePanel: Common base class for glassmorphic HUD interface panels.
 * Provides uniform window lifecycle, collapsible headers, close/dock toggles,
 * and standard UI utility methods.
 */
export class BasePanel extends EventEmitter {
  /**
   * @param {string} id - HTML ID for the panel
   * @param {Object} [options={}]
   * @param {string} [options.title='Panel']
   * @param {string} [options.icon='📑']
   * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'} [options.position='top-left']
   * @param {number} [options.width=340]
   */
  constructor(id, options = {}) {
    super();
    this.id = id;
    this.title = options.title || 'Panel';
    this.icon = options.icon || '📑';
    this.position = options.position || 'top-left';
    this.width = options.width || 340;
    this.isCollapsed = !!options.collapsed;
    this.isVisible = options.visible !== undefined ? options.visible : true;

    this.container = null;
    this.panelElement = null;
    this.headerElement = null;
    this.bodyElement = null;
    this.togglePill = null;
  }

  /**
   * Mounts the panel into a parent container element.
   * @param {HTMLElement} parent
   */
  mount(parent = document.body) {
    this.container = parent;

    // Create panel wrapper
    this.panelElement = document.createElement('div');
    this.panelElement.id = this.id;
    this.panelElement.className = `glass-panel panel-${this.position} ${this.isCollapsed ? 'collapsed' : ''}`;
    this.panelElement.style.width = `${this.width}px`;
    if (!this.isVisible) this.panelElement.style.display = 'none';

    // Header
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'panel-header';
    this.headerElement.innerHTML = `
      <div class="panel-title">
        <span class="panel-icon">${this.icon}</span>
        <span class="panel-title-text">${this.title}</span>
      </div>
      <div class="panel-actions">
        <button class="panel-btn-collapse" title="Összecsukás / Kinyitás">▾</button>
        <button class="panel-btn-close" title="Bezárás">✕</button>
      </div>
    `;
    this.panelElement.appendChild(this.headerElement);

    // Body container
    this.bodyElement = document.createElement('div');
    this.bodyElement.className = 'panel-body';
    this.panelElement.appendChild(this.bodyElement);

    this.container.appendChild(this.panelElement);

    // Setup header button listeners
    const btnCollapse = this.headerElement.querySelector('.panel-btn-collapse');
    btnCollapse.addEventListener('click', () => this.toggleCollapse());

    const btnClose = this.headerElement.querySelector('.panel-btn-close');
    btnClose.addEventListener('click', () => this.hide());

    // Render subclass custom content
    this.renderContent(this.bodyElement);

    // Setup trigger pill in case panel is hidden
    this.setupTriggerPill();
  }

  /**
   * Setup floating pill button to restore panel if closed
   */
  setupTriggerPill() {
    const pillContainer = document.getElementById('floating-pills') || this.createPillContainer();
    this.togglePill = document.createElement('button');
    this.togglePill.className = `pill-trigger-btn ${this.isVisible ? 'active' : ''}`;
    this.togglePill.innerHTML = `${this.icon} ${this.title}`;
    this.togglePill.addEventListener('click', () => this.toggle());
    pillContainer.appendChild(this.togglePill);
  }

  createPillContainer() {
    let pills = document.getElementById('floating-pills');
    if (!pills) {
      pills = document.createElement('div');
      pills.id = 'floating-pills';
      pills.className = 'floating-pills-bar';
      this.container.appendChild(pills);
    }
    return pills;
  }

  /**
   * Subclasses override this method to render their specific widgets, sliders, and telemetry
   * @param {HTMLElement} body
   */
  renderContent(body) {
    // Overridden by ControlPanel and DisplayPanel
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.panelElement.classList.toggle('collapsed', this.isCollapsed);
    const btn = this.headerElement.querySelector('.panel-btn-collapse');
    if (btn) btn.textContent = this.isCollapsed ? '▸' : '▾';
    this.emit('collapse', this.isCollapsed);
  }

  setCollapsed(collapsed) {
    this.isCollapsed = !!collapsed;
    if (this.panelElement) {
      this.panelElement.classList.toggle('collapsed', this.isCollapsed);
    }
    const btn = this.headerElement ? this.headerElement.querySelector('.panel-btn-collapse') : null;
    if (btn) btn.textContent = this.isCollapsed ? '▸' : '▾';
    this.emit('collapse', this.isCollapsed);
  }

  getAccordionStates() {
    const states = {};
    if (this.bodyElement) {
      this.bodyElement.querySelectorAll('.control-section[id]').forEach(sec => {
        states[sec.id] = sec.classList.contains('is-collapsed');
      });
    }
    return states;
  }

  setAccordionStates(states = {}) {
    if (!this.bodyElement || !states) return;
    Object.entries(states).forEach(([secId, isCollapsed]) => {
      const sec = this.bodyElement.querySelector(`#${secId}`);
      if (sec) {
        sec.classList.toggle('is-collapsed', !!isCollapsed);
        const icon = sec.querySelector('.section-toggle-icon');
        if (icon) icon.textContent = isCollapsed ? '▸' : '▾';
      }
    });
  }

  show() {
    this.isVisible = true;
    if (this.panelElement) this.panelElement.style.display = 'flex';
    if (this.togglePill) this.togglePill.classList.add('active');
    this.emit('visibilityChange', true);
  }

  hide() {
    this.isVisible = false;
    if (this.panelElement) this.panelElement.style.display = 'none';
    if (this.togglePill) this.togglePill.classList.remove('active');
    this.emit('visibilityChange', false);
  }

  toggle() {
    if (this.isVisible) this.hide();
    else this.show();
  }

  setTitle(newTitle) {
    this.title = newTitle;
    const titleEl = this.headerElement.querySelector('.panel-title-text');
    if (titleEl) titleEl.textContent = newTitle;
  }

  destroy() {
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
    }
    if (this.togglePill && this.togglePill.parentNode) {
      this.togglePill.parentNode.removeChild(this.togglePill);
    }
    this.removeAllListeners();
  }
}
