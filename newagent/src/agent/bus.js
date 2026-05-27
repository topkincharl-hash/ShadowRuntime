// Tiny event bus shared by every subsystem.
export class EventBus {
  constructor() { this._h = new Map(); }
  on(evt, fn)   { (this._h.get(evt) || this._h.set(evt, new Set()).get(evt)).add(fn); return () => this.off(evt, fn); }
  off(evt, fn)  { this._h.get(evt)?.delete(fn); }
  emit(evt, p)  { this._h.get(evt)?.forEach(fn => { try { fn(p); } catch(e){ console.warn(e); } }); }
}
