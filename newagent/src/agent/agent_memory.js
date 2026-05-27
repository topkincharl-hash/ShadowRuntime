// =====================================================
// MEMORY SUBSYSTEM
// =====================================================
// Three tiers:
//   - working (short-term): last N turns, in-RAM ring buffer
//   - episodic (medium-term): per-session events, persisted to IndexedDB
//   - semantic (long-term): vector-indexed knowledge, IndexedDB + embeddings
//
// Learning hooks:
//   - reinforce(memId, signal)   -> adjusts weight (Hebbian)
//   - consolidate()              -> moves hot episodic → semantic
//   - decay()                    -> exponential forgetting
//   - upgrade(memId, patch)      -> in-place evolution of long-term facts
// =====================================================

import { EventBus } from './bus.js';

const DB_NAME = 'queenzoe-memory';
const DB_VER = 1;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('episodic'))
        db.createObjectStore('episodic', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('semantic'))
        db.createObjectStore('semantic', { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

async function txAll(store, mode = 'readonly') {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    const out = [];
    s.openCursor().onsuccess = e => {
      const cur = e.target.result;
      if (cur) { out.push(cur.value); cur.continue(); } else res(out);
    };
    tx.onerror = () => rej(tx.error);
  });
}
async function txPut(store, value) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => res(value);
    tx.onerror = () => rej(tx.error);
  });
}

// --- Tiny pseudo-embedding (hash bag of words → 64d vector) ---
// Swap with real embedding provider in production.
export function embed(text, dim = 64) {
  const v = new Float32Array(dim);
  const tokens = text.toLowerCase().match(/\w+/g) || [];
  for (const t of tokens) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = (h * 16777619) >>> 0; }
    v[h % dim] += 1;
  }
  // L2 normalise
  let s = 0; for (const x of v) s += x*x; s = Math.sqrt(s) || 1;
  for (let i = 0; i < dim; i++) v[i] /= s;
  return Array.from(v);
}
export function cosine(a, b) { let s = 0; for (let i=0;i<a.length;i++) s += a[i]*b[i]; return s; }

export class Memory extends EventBus {
  constructor(opts = {}) {
    super();
    this.workingSize = opts.workingSize ?? 24;
    this.working = []; // {role, text, ts}
    this.semanticCache = []; // hydrated on init
    this.episodicCache = [];
    this.decayHalfLifeMs = opts.decayHalfLifeMs ?? 1000*60*60*24*7;
  }

  async init() {
    this.semanticCache = await txAll('semantic').catch(() => []);
    this.episodicCache = await txAll('episodic').catch(() => []);
    this.emit('ready', { semantic: this.semanticCache.length, episodic: this.episodicCache.length });
  }

  // ---- working memory ----
  pushTurn(role, text, meta = {}) {
    const t = { id: crypto.randomUUID(), role, text, ts: Date.now(), ...meta };
    this.working.push(t);
    if (this.working.length > this.workingSize) this.working.shift();
    this.emit('working:push', t);
    return t;
  }
  recent(n = 8) { return this.working.slice(-n); }

  // ---- episodic ----
  async logEpisode(event) {
    const e = { id: crypto.randomUUID(), ts: Date.now(), weight: 1.0, ...event };
    this.episodicCache.unshift(e);
    await txPut('episodic', e);
    this.emit('episodic:log', e);
    return e;
  }

  // ---- semantic (long-term) ----
  async remember(text, tags = []) {
    const m = {
      id: crypto.randomUUID(),
      text, tags, ts: Date.now(),
      weight: 1.0,
      vector: embed(text),
    };
    this.semanticCache.unshift(m);
    await txPut('semantic', m);
    this.emit('semantic:write', m);
    return m;
  }

  async recall(query, { k = 5, tag = null } = {}) {
    const q = embed(query);
    const pool = tag ? this.semanticCache.filter(m => m.tags?.includes(tag)) : this.semanticCache;
    const scored = pool.map(m => ({ m, score: cosine(q, m.vector) * (m.weight || 1) }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(s => ({ ...s.m, score: s.score }));
  }

  // ---- learning ----
  async reinforce(id, signal = 0.2) {
    const m = this.semanticCache.find(x => x.id === id);
    if (!m) return;
    m.weight = Math.min(5, (m.weight || 1) + signal);
    await txPut('semantic', m);
    this.emit('semantic:reinforce', m);
  }

  async upgrade(id, patch) {
    const m = this.semanticCache.find(x => x.id === id);
    if (!m) return;
    Object.assign(m, patch);
    if (patch.text) m.vector = embed(patch.text);
    await txPut('semantic', m);
    this.emit('semantic:upgrade', m);
  }

  /** Consolidate hot episodes into semantic memory (sleep-like). */
  async consolidate(threshold = 3) {
    const hot = this.episodicCache.filter(e => (e.weight || 1) >= threshold && !e.consolidated);
    for (const e of hot) {
      await this.remember(e.text || JSON.stringify(e), e.tags || ['episode']);
      e.consolidated = true;
      await txPut('episodic', e);
    }
    this.emit('consolidate', hot.length);
    return hot.length;
  }

  /** Exponential decay sweep. */
  async decay() {
    const now = Date.now();
    for (const m of this.semanticCache) {
      const age = now - m.ts;
      const k = Math.pow(0.5, age / this.decayHalfLifeMs);
      m.weight = (m.weight || 1) * k;
      await txPut('semantic', m);
    }
    this.semanticCache = this.semanticCache.filter(m => m.weight > 0.05);
    this.emit('decay', this.semanticCache.length);
  }

  /** Build a context block for prompt injection. */
  async buildContext(query) {
    const recent = this.recent(6).map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');
    const recalled = await this.recall(query, { k: 5 });
    const longTerm = recalled.map(r => `• ${r.text}  [score=${r.score.toFixed(2)}]`).join('\n');
    return { recent, longTerm, recalled };
  }
}
