// =====================================================
// PROVIDER REGISTRY — extendable adapter interface
// =====================================================
// Every provider exposes the same async iterator surface, so the
// orchestrator can swap, fuse, race, or chain them transparently.
//
// Adapter contract:
//   {
//     id, name, tier, tag, status, capabilities,
//     async *stream({ prompt, system, tools, signal, params }) -> { delta, meta }
//     async invoke({ prompt, ... }) -> { text, meta }
//     async health() -> { ok, latency }
//   }
//
// Real network calls go in the adapter's stream/invoke methods. The
// SimulatedAdapter is the demo default; replace per-provider as needed.
// =====================================================

import { EventBus } from './bus.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------- Base adapter ----------------
export class BaseAdapter {
  constructor(meta) {
    Object.assign(this, {
      id: meta.id,
      name: meta.name,
      tier: meta.tier,                       // primary | fallback | context
      tag: meta.tag,
      status: meta.status || 'ok',
      capabilities: meta.capabilities || {}, // { stream, tools, vision, voice, longContext, ... }
      endpoint: meta.endpoint || null,
      auth: meta.auth || null,
      transport: meta.transport || 'https',  // selects transport layer
      params: meta.params || {},
      weight: meta.weight ?? 1,
    });
  }
  async *stream() { throw new Error(`${this.id} stream() not implemented`); }
  async invoke(req) {
    let out = ''; for await (const { delta } of this.stream(req)) out += delta;
    return { text: out, meta: { provider: this.id } };
  }
  async health() { return { ok: this.status !== 'err', latency: 100 + Math.random()*200 }; }
}

// ---------------- Simulated adapter (demo) ----------------
export class SimulatedAdapter extends BaseAdapter {
  async *stream({ prompt = '', system = '', signal } = {}) {
    const baseLatency = 80 + Math.random() * 320;
    await sleep(baseLatency);
    const persona = system ? `[${this.name} adopts persona]\n` : '';
    const body = persona + this._compose(prompt);
    let i = 0;
    while (i < body.length) {
      if (signal?.aborted) return;
      const burst = 2 + Math.floor(Math.random()*6);
      const chunk = body.slice(i, i + burst);
      i += burst;
      yield { delta: chunk, meta: { latency: baseLatency, provider: this.id } };
      await sleep(10 + Math.random()*36);
    }
  }
  _compose(prompt) {
    const opening = ['Indeed, my Queen. ','By your will, ','The council answers: ','As decreed: '];
    const o = opening[Math.floor(Math.random()*opening.length)];
    return `${o}routing through **${this.name}** (${this.tag}). I have parsed your request: "${prompt}". Here is the considered response, drawing on the kingdom's intelligence layer with sequential reasoning, RAG retrieval and tool access.`;
  }
}

// ---------------- Registry ----------------
export class ProviderRegistry extends EventBus {
  constructor() { super(); this.adapters = new Map(); }

  register(adapter) {
    if (!(adapter instanceof BaseAdapter)) throw new Error('Provider must extend BaseAdapter');
    this.adapters.set(adapter.id, adapter);
    this.emit('register', adapter);
    return adapter;
  }
  unregister(id) {
    const a = this.adapters.get(id); if (!a) return;
    this.adapters.delete(id); this.emit('unregister', a);
  }
  get(id) { return this.adapters.get(id); }
  list(filter = {}) {
    return [...this.adapters.values()].filter(a =>
      (!filter.tier || a.tier === filter.tier) &&
      (!filter.capability || a.capabilities[filter.capability])
    );
  }

  // Hot-load: pull adapter spec from JSON and instantiate
  loadSpec(specs = []) {
    for (const spec of specs) {
      const Cls = ADAPTER_TYPES[spec.adapter || 'simulated'] || SimulatedAdapter;
      this.register(new Cls(spec));
    }
  }

  // Health sweep
  async sweep() {
    const results = await Promise.all([...this.adapters.values()].map(async a => {
      try { const h = await a.health(); a.status = h.ok ? 'ok' : 'err'; return { id: a.id, ...h }; }
      catch (e) { a.status = 'err'; return { id: a.id, ok: false, error: e.message }; }
    }));
    this.emit('sweep', results);
    return results;
  }
}

// ---------------- Adapter classes registry ----------------
// Add new adapter types here (OpenAIAdapter, ClaudeAdapter, OpenRouterAdapter, etc.)
// and they become available via spec.adapter = 'openai' / 'claude' / ...
export const ADAPTER_TYPES = {
  simulated: SimulatedAdapter,
  // openai:     class extends BaseAdapter { async *stream() { /* real impl */ } },
  // claude:     class extends BaseAdapter { async *stream() { /* real impl */ } },
  // openrouter: class extends BaseAdapter { async *stream() { /* real impl */ } },
};

// ---------------- Seed: 22-source manifest ----------------
export const SEED_PROVIDERS = [
  // PRIMARY · AGI / MCP / Agentic
  { id:'openai',     name:'OpenAI',        tier:'primary',  tag:'GPT-4.1',     transport:'https', capabilities:{stream:true,tools:true,vision:true,voice:true},  weight:1.4 },
  { id:'claude',     name:'Claude',        tier:'primary',  tag:'Opus 4.7',    transport:'https', capabilities:{stream:true,tools:true,vision:true,longContext:true}, weight:1.5 },
  { id:'claw',       name:'Claw',          tier:'primary',  tag:'agentic',     transport:'https', capabilities:{stream:true,tools:true},  weight:1.1 },
  { id:'mobileclaw', name:'MobileClaw',    tier:'primary',  tag:'mobile',      transport:'https', capabilities:{stream:true},              weight:0.9 },
  { id:'cursor',     name:'Cursor',        tier:'primary',  tag:'IDE-tool',    transport:'https', capabilities:{stream:true,tools:true,code:true}, weight:1.0 },
  { id:'kilocode',   name:'KiloCode',      tier:'primary',  tag:'code-agent',  transport:'https', capabilities:{stream:true,tools:true,code:true}, weight:1.0 },
  { id:'windsurf',   name:'Windsurf AI',   tier:'primary',  tag:'flow',        transport:'https', capabilities:{stream:true,tools:true,code:true}, weight:1.0 },
  { id:'nexus',      name:'Nexus',        tier:'primary',  tag:'orchestrator', transport:'https', capabilities:{stream:true,tools:true,orchestration:true}, weight:1.2 },
  { id:'dify',       name:'Dify.ai',       tier:'primary',  tag:'LLMops',      transport:'https', capabilities:{stream:true,tools:true,workflows:true}, weight:1.0 },
  { id:'n8n',        name:'n8n',          tier:'primary',  tag:'workflows',    transport:'https', capabilities:{tools:true,workflows:true,webhook:true},  weight:0.8 },
  { id:'spawn',      name:'Spawn',        tier:'primary',  tag:'agent-swarm',  transport:'mesh',  capabilities:{stream:true,tools:true,swarm:true}, weight:1.1, status:'warn' },
  { id:'hermes',     name:'Hermes',       tier:'primary',  tag:'fn-call',      transport:'https', capabilities:{stream:true,tools:true},  weight:1.0 },
  { id:'janitor',    name:'JanitorAI',    tier:'primary',  tag:'persona',      transport:'https', capabilities:{stream:true,persona:true},  weight:0.9 },

  // FALLBACK · Lightweight
  { id:'pi',         name:'Pi',           tier:'fallback', tag:'companion',    transport:'https', capabilities:{stream:true,voice:true}, weight:0.7 },
  { id:'openrouter', name:'OpenRouter',   tier:'fallback', tag:'multiplex',    transport:'https', capabilities:{stream:true,multiplex:true}, weight:1.2 },
  { id:'parallel',   name:'Parallel',     tier:'fallback', tag:'fan-out',      transport:'https', capabilities:{stream:true,parallel:true}, weight:1.0 },
  { id:'humanised',  name:'Humanised AI', tier:'fallback', tag:'tone',         transport:'https', capabilities:{stream:true,tone:true}, weight:0.8 },
  { id:'freehub',    name:'FreeHub API',  tier:'fallback', tag:'free',         transport:'https', capabilities:{stream:true}, weight:0.6, status:'warn' },

  // CONTEXT · Memory & reasoning
  { id:'sequential', name:'Sequential Thinking', tier:'context', tag:'reasoning',  transport:'local', capabilities:{reasoning:true},   weight:1.0 },
  { id:'rag',        name:'RAG Pipeline',  tier:'context',  tag:'retrieval',   transport:'local', capabilities:{retrieval:true},  weight:1.0 },
  { id:'vector',     name:'Vector Store',  tier:'context',  tag:'embeddings',  transport:'local', capabilities:{vector:true},     weight:1.0 },
  { id:'neural',     name:'Neural Net',    tier:'context',  tag:'classify',    transport:'local', capabilities:{classify:true},   weight:0.8 },
];
