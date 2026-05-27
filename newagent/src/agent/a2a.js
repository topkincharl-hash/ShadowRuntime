// =====================================================
// AGENT-TO-AGENT (A2A) PROTOCOL
// =====================================================
// A small message bus / RPC layer for peer agents.
// Wire-formats supported: in-process, BroadcastChannel,
// WebSocket, MessagePort, postMessage iframe, webhook.
//
// Each peer registers a manifest:
//   { id, name, capabilities, transport, endpoint?, handler? }
//
// Envelope:
//   { id, from, to, task, payload, replyTo?, ts, hops }
// =====================================================

import { EventBus } from './bus.js';

const MAX_HOPS = 6;

export class A2A extends EventBus {
  constructor({ selfId = 'queenzoe' } = {}) {
    super();
    this.selfId = selfId;
    this.peers = new Map();          // id -> manifest
    this.handlers = new Map();       // task -> fn
    this.pending = new Map();        // correlation id -> resolver
    this._wireBroadcast();
  }

  // ---- peer management ----
  register(manifest) {
    this.peers.set(manifest.id, manifest);
    this.emit('peer:register', manifest);
    return manifest;
  }
  unregister(id) { this.peers.delete(id); this.emit('peer:unregister', id); }
  list() { return [...this.peers.values()]; }

  // ---- task handlers ----
  on(task, fn) {
    this.handlers.set(task, fn);
    return () => this.handlers.delete(task);
  }

  // ---- dispatch / call ----
  async dispatch(toAgent, task, payload = {}, opts = {}) {
    const env = {
      id: crypto.randomUUID(),
      from: this.selfId,
      to: toAgent,
      task,
      payload,
      ts: Date.now(),
      hops: (opts.hops || 0) + 1,
      replyTo: opts.replyTo,
      meta: opts.meta || {},
    };
    if (env.hops > MAX_HOPS) throw new Error('A2A hop limit reached');
    this.emit('send', env);
    return this._route(env);
  }

  async _route(env) {
    const peer = this.peers.get(env.to);
    if (!peer) throw new Error(`Peer not found: ${env.to}`);
    switch (peer.transport) {
      case 'in-process': return peer.handler(env);
      case 'broadcast':  this._bc?.postMessage(env);
                         return this._awaitReply(env);
      case 'ws':         return this._ws(peer, env);
      case 'webhook':    return this._webhook(peer, env);
      case 'postmessage':return this._postMessage(peer, env);
      default: throw new Error(`Unknown transport: ${peer.transport}`);
    }
  }

  /** Receive an inbound envelope and route to local handler. */
  async receive(env) {
    this.emit('recv', env);
    const fn = this.handlers.get(env.task);
    if (!fn) return { ok:false, error:`No handler for task ${env.task}` };
    try {
      const result = await fn(env.payload, env);
      return { ok:true, result };
    } catch (e) {
      return { ok:false, error: e.message };
    }
  }

  _awaitReply(env, ms = 8000) {
    return new Promise((res, rej) => {
      this.pending.set(env.id, { resolve: res, reject: rej });
      setTimeout(() => {
        if (this.pending.has(env.id)) {
          this.pending.delete(env.id);
          rej(new Error('A2A timeout'));
        }
      }, ms);
    });
  }

  // ---- transports ----
  _wireBroadcast() {
    if (typeof BroadcastChannel === 'undefined') return;
    try { this._bc = new BroadcastChannel('queenzoe-a2a'); } catch { return; }
    this._bc.onmessage = async ({ data }) => {
      if (!data || data.to !== this.selfId && data.replyTo !== this.selfId) return;
      if (data.replyTo && this.pending.has(data.correlatesTo)) {
        const p = this.pending.get(data.correlatesTo);
        this.pending.delete(data.correlatesTo);
        p.resolve(data.payload);
        return;
      }
      const result = await this.receive(data);
      this._bc.postMessage({ id: crypto.randomUUID(), correlatesTo: data.id, to: data.from, from: this.selfId, replyTo: data.from, payload: result, ts: Date.now() });
    };
  }

  async _ws(peer, env) {
    const ws = peer._ws ?? (peer._ws = new WebSocket(peer.endpoint));
    return new Promise((res, rej) => {
      const send = () => { ws.send(JSON.stringify(env)); };
      if (ws.readyState === 1) send(); else ws.addEventListener('open', send, { once:true });
      const onMsg = ({ data }) => {
        try { const m = JSON.parse(data); if (m.correlatesTo === env.id) { ws.removeEventListener('message', onMsg); res(m.payload); } }
        catch (e) { rej(e); }
      };
      ws.addEventListener('message', onMsg);
    });
  }

  async _webhook(peer, env) {
    const r = await fetch(peer.endpoint, {
      method:'POST',
      headers:{'Content-Type':'application/json','X-A2A-From':this.selfId},
      body: JSON.stringify(env),
    });
    return r.json();
  }

  async _postMessage(peer, env) {
    peer.target?.postMessage(env, peer.origin || '*');
    return this._awaitReply(env);
  }
}
