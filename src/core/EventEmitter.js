/**
 * EventEmitter: Standard event pub/sub base class.
 * Eliminates redundant event listener maps and dispatch implementations across components.
 */
export class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  /**
   * Registers an event listener.
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Removes an event listener.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this._listeners.has(event)) {
      this._listeners.get(event).delete(handler);
    }
  }

  /**
   * Dispatches an event to all registered listeners.
   * @param {string} event
   * @param {*} [data]
   */
  emit(event, data) {
    if (this._listeners.has(event)) {
      for (const handler of this._listeners.get(event)) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[EventEmitter] Error in event listener for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Clears all listeners.
   */
  removeAllListeners() {
    this._listeners.clear();
  }
}
