// =====================================================
// MULTI-TRANSPORT COMMUNICATIONS
// =====================================================
// One unified surface that abstracts:
//   http, https, httpx, socks5, tor, proxy, mesh, ftp,
//   websocket, sse, webhook, tunnel, postmessage,
//   broadcast, cloud, vm-isolated, p2p node
//
// Each transport implements { send/fetch/connect } that
// returns Promises or async iterables. In the browser
// many of these MUST be proxied through a backend
// gateway — config their endpoint with `gatewayUrl`.
// =====================================================

import { EventBus } from './bus.js';

export const TRANSPORTS = [
  'https','http','httpx','httpx-stream',
  'ws','wss','sse','webhook','tunnel',
  'socks5','tor','proxy','mesh','p2p',
  'ftp','sftp','postmessage','broadcast',
  'cloud','vm-isolated','node',
];

export class TransportLayer extends EventBus {
  constructor(opts = {}) {
    super();
    this.gatewayUrl = opts.gatewayUrl || null; // backend for tor/socks/ftp/etc.
    this.tunnels = new Map();                  // id -> { type, endpoint, ws? }
    this.nodes   = new Map();                  // id -> { endpoint, role }
    this.webhookTargets = new Map();           // name -> url
    this.proxies = new Map();                  // name -> { url, auth }
    this.policies = opts.policies || {};       // per-transport throttles, retries, allowlists
  }

  // ---- targets ----
  registerWebhook(name, url) { this.webhookTargets.set(name, url); this.emit('webhook:register', { name, url }); }
  registerProxy(name, cfg)   { this.proxies.set(name, cfg); this.emit('proxy:register', { name, cfg }); }
  registerNode(id, cfg)      { this.nodes.set(id, cfg); this.emit('node:register', { id, cfg }); }

  // ---- universal fetch with transport selection ----
  async fetch(url, { transport = 'https', method = 'GET', headers = {}, body = null, proxy = null } = {}) {
    this.emit('fetch', { url, transport });
    switch (transport) {
      case 'http': case 'https':
        return this._http(url, { method, headers, body });
      case 'httpx': case 'httpx-stream':
        return this._httpx(url, { method, headers, body, stream: transport === 'httpx-stream' });
      case 'socks5': case 'tor': case 'proxy':
        return this._viaGateway(url, { method, headers, body, transport, proxy });
      case 'mesh':
        return this._mesh(url, { method, headers, body });
      case 'p2p': case 'node':
        return this._node(url, { method, headers, body });
      case 'ftp': case 'sftp':
        return this._ftp(url, { method, body });
      case 'cloud':
        return this._cloud(url, { method, headers, body });
      case 'vm-isolated':
        return this._vm(url, { method, headers, body });
      default:
        throw new Error(`Unknown transport: ${transport}`);
    }
  }

  // ---- direct HTTP(S) ----
  async _http(url, { method, headers, body }) {
    const r = await fetch(url, { method, headers, body });
    return { ok: r.ok, status: r.status, text: await r.text() };
  }

  // ---- HTTPX (HTTP/2 streaming-style) — browser falls back to fetch streams ----
  async _httpx(url, { method, headers, body, stream }) {
    const r = await fetch(url, { method, headers, body });
    if (!stream) return { ok: r.ok, status: r.status, text: await r.text() };
    return {
      ok: r.ok, status: r.status,
      async *[Symbol.asyncIterator]() {
        const reader = r.body.getReader(); const dec = new TextDecoder();
        for (;;) { const { value, done } = await reader.read(); if (done) return; yield dec.decode(value); }
      }
    };
  }

  // ---- Backend gateway for restricted transports ----
  async _viaGateway(url, opts) {
    if (!this.gatewayUrl) throw new Error('Gateway not configured for ' + opts.transport);
    const r = await fetch(this.gatewayUrl + '/relay', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ url, ...opts, proxy: opts.proxy || this.proxies.get(opts.transport) || null }),
    });
    return r.json();
  }

  async _ftp(url, opts)   { return this._viaGateway(url, { ...opts, transport: 'ftp' }); }
  async _cloud(url, opts) { return this._viaGateway(url, { ...opts, transport: 'cloud' }); }
  async _vm(url, opts)    { return this._viaGateway(url, { ...opts, transport: 'vm-isolated' }); }

  // ---- Mesh (libp2p-style via gateway) ----
  async _mesh(target, opts) { return this._viaGateway(target, { ...opts, transport: 'mesh' }); }
  async _node(target, opts) { return this._viaGateway(target, { ...opts, transport: 'node' }); }

  // ---- Webhook out ----
  async webhook(name, payload) {
    const url = this.webhookTargets.get(name) || name; // allow raw URL too
    if (!url) throw new Error(`Webhook target not registered: ${name}`);
    try {
      const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','X-QueenZoe':'1'}, body: JSON.stringify(payload) });
      this.emit('webhook:sent', { url, ok: r.ok });
      return { ok: r.ok, status: r.status };
    } catch (e) {
      this.emit('webhook:error', { url, err: e });
      return { ok:false, error: e.message };
    }
  }

  // ---- Tunnel open/close (over WS, SSH-like via gateway) ----
  async openTunnel({ id = crypto.randomUUID(), type = 'wss', endpoint, auth = null } = {}) {
    const t = { id, type, endpoint, status:'connecting' };
    if (type === 'wss' || type === 'ws') {
      const ws = new WebSocket(endpoint);
      t.ws = ws;
      ws.onopen  = () => { t.status='open';  this.emit('tunnel:open', t); };
      ws.onclose = () => { t.status='closed';this.emit('tunnel:close', t); };
      ws.onerror = (e) => { t.status='error';this.emit('tunnel:error', { t, e }); };
      ws.onmessage = (m) => this.emit('tunnel:message', { t, data:m.data });
    } else {
      // delegate to gateway (tor, ssh tunnel, etc.)
      const r = await this._viaGateway(endpoint, { transport:type, method:'OPEN', headers:{ auth } });
      t.status = r.ok ? 'open' : 'error';
    }
    this.tunnels.set(id, t);
    return t;
  }
  closeTunnel(id) { const t = this.tunnels.get(id); try { t?.ws?.close(); } catch {} this.tunnels.delete(id); this.emit('tunnel:close', t); }

  // ---- SSE subscribe ----
  sse(url, { onEvent } = {}) {
    const es = new EventSource(url);
    es.onmessage = (e) => onEvent?.(e.data);
    return es;
  }

  // ---- BroadcastChannel ----
  broadcast(channel, payload) {
    const bc = new BroadcastChannel(channel);
    bc.postMessage(payload); bc.close();
  }
}
