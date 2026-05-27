// =====================================================
// QUEENZOE ORCHESTRATOR
// =====================================================
// The brain. Ties together:
//   personality + memory + providers + fusion + batch +
//   tools + prompts + voice + a2a + transports + skills
//
// Public API:
//   await zoe.boot()
//   for await (const c of zoe.streamRespond(text)) ...
//   await zoe.respond(text)             // non-streaming
//   zoe.setMode('chat'|'decree'|'rally'|'intel')
//   zoe.setFusion('off'|'race'|'merge'|'vote'|'debate')
//   zoe.setTechniques(['chainOfThought', ...])
//   zoe.providers / fusion / batch / memory / personality / tools / a2a / voice / transports / skills
// =====================================================

import { EventBus } from './bus.js';
import { ProviderRegistry, SEED_PROVIDERS } from './providers.js';
import { FusionEngine } from './fusion.js';
import { BatchWatchflow } from './batch.js';
import { Memory } from './memory.js';
import { Personality } from './personality.js';
import { Prompts } from './prompts.js';
import { ToolRegistry, registerDefaultTools } from './tools.js';
import { A2A } from './a2a.js';
import { VoiceEngine } from './voice.js';
import { TransportLayer } from './transports.js';
import { SkillRegistry, registerDefaultSkills } from './skills.js';

export class QueenZoeOrchestrator extends EventBus {
  constructor(opts = {}) {
    super();
    this.opts = opts;

    // Subsystems
    this.bus         = this; // shared bus
    this.providers   = new ProviderRegistry();
    this.fusion      = new FusionEngine(this.providers, this.bus);
    this.batch       = new BatchWatchflow(this.providers, this.bus, { concurrency: opts.concurrency || 4 });
    this.memory      = new Memory();
    this.personality = new Personality(opts.persona);
    this.tools       = new ToolRegistry();
    this.a2a         = new A2A({ selfId: 'queenzoe' });
    this.voice       = new VoiceEngine(opts.voice);
    this.transports  = new TransportLayer(opts.transports);
    this.skills      = new SkillRegistry();

    // Runtime state
    this.activeProviderId = opts.defaultProvider || 'claude';
    this.mode = 'chat';                  // chat | decree | rally | intel
    this.fusionStrategy = 'off';         // off | race | merge | vote | debate
    this.techniques = ['chainOfThought'];// prompting techniques composed in order
    this.fusionGroup = ['openai','claude','openrouter'];
  }

  // ---- boot ----
  async boot() {
    // Load seed providers via simulated adapter
    this.providers.loadSpec(SEED_PROVIDERS);
    await this.memory.init();
    registerDefaultTools(this.tools, this);
    registerDefaultSkills(this.skills);
    this._wireA2A();
    this._consolidationLoop();
    this.emit('boot', { providers: this.providers.list().length });
    return this;
  }

  // ---- public setters ----
  setProvider(id) { if (this.providers.get(id)) { this.activeProviderId = id; this.emit('provider:select', id); } }
  setMode(m) { this.mode = m; this.emit('mode', m); }
  setFusion(s) { this.fusionStrategy = s; this.emit('fusion:strategy', s); }
  setTechniques(t) { this.techniques = Array.isArray(t) ? t : [t]; this.emit('techniques', this.techniques); }
  setFusionGroup(ids) { this.fusionGroup = ids; this.emit('fusion:group', ids); }
  setTone(tone) { this.personality.setTone(tone); this.emit('tone', tone); }

  // ---- core: respond ----
  async respond(userText) {
    let out = '';
    for await (const c of this.streamRespond(userText)) out += c.delta;
    return out;
  }

  async *streamRespond(userText) {
    if (!userText?.trim()) return;
    this.memory.pushTurn('user', userText);
    this.personality.observe({ positive: /thank|please|good|love/i.test(userText) });
    this.personality.feel({ valence: 0.05, arousal: 0.05 });

    // 1) NL skill match — may short-circuit normal response
    const match = this.skills.match(userText);
    if (match && match.score > 1.2) {
      this.emit('skill:match', match);
      const out = await this.skills.execute(match.skill.name, { prompt: userText }, this).catch(e => ({ error: e.message }));
      const text = typeof out === 'string' ? out : (out?.decree || out?.rally || out?.text || JSON.stringify(out, null, 2));
      yield { delta: `⟦Skill · ${match.skill.name}⟧\n` };
      yield { delta: text };
      this.memory.pushTurn('assistant', text, { skill: match.skill.name });
      this.memory.logEpisode({ kind:'skill', skill: match.skill.name, prompt:userText, result:text, weight:1.2 });
      return;
    }

    // 2) Build context (memory + persona)
    const ctx = await this.memory.buildContext(userText);
    const system = this.personality.systemPrompt();
    const built  = Prompts.build({
      systemPrompt: system,
      memoryContext: ctx,
      prompt: this._modeWrap(userText),
      techniques: this.techniques,
    });

    // 3) Route — single provider, or fusion
    const t0 = performance.now();
    let full = '';
    if (this.fusionStrategy !== 'off' && this.fusionStrategy !== 'race') {
      // Non-streaming fusion strategies: do it, then yield as one chunk.
      const result = await this._fusionRun(this.fusionStrategy, built);
      const text = result?.text || JSON.stringify(result, null, 2);
      yield { delta: text, meta: { fusion: this.fusionStrategy } };
      full = text;
    } else {
      const ids = this.fusionStrategy === 'race' ? this.fusionGroup : [this.activeProviderId];
      const iter = this.fusionStrategy === 'race'
        ? this.fusion.race(ids, built)
        : this.providers.get(this.activeProviderId)?.stream(built);
      if (!iter) { yield { delta: '⚠ No provider available.' }; return; }
      for await (const chunk of iter) { full += chunk.delta; yield chunk; }
    }
    const elapsed = performance.now() - t0;
    this.emit('respond:done', { ms: elapsed, chars: full.length });

    // 4) Persist + consolidate
    this.memory.pushTurn('assistant', full, { provider: this.activeProviderId });
    this.memory.logEpisode({ kind:'turn', prompt:userText, response:full, weight: 1 });
  }

  // ---- helpers ----
  _modeWrap(text) {
    switch (this.mode) {
      case 'decree': return `Issue a Royal Decree in response to: ${text}`;
      case 'rally':  return `Issue a Rally signal to allied banners: ${text}`;
      case 'intel':  return `Provide an Intelligence Report on: ${text}`;
      default:       return text;
    }
  }

  async _fusionRun(strategy, req) {
    const g = this.fusionGroup;
    switch (strategy) {
      case 'merge':  return this.fusion.merge(g, req, this.activeProviderId);
      case 'vote':   return this.fusion.vote(g, req);
      case 'debate': return this.fusion.debate(g, req, 2, this.activeProviderId);
      case 'parallel': return { text: (await this.fusion.parallel(g, req)).map(r => `▸ ${r.provider}\n${r.text}`).join('\n\n') };
      default: throw new Error('Unknown strategy ' + strategy);
    }
  }

  _wireA2A() {
    // Handlers we expose to peer agents
    this.a2a.on('ask', async ({ prompt }) => ({ text: await this.respond(prompt) }));
    this.a2a.on('remember', async ({ text, tags }) => this.memory.remember(text, tags));
    this.a2a.on('recall',   async ({ query, k }) => this.memory.recall(query, { k }));
    this.a2a.on('tool',     async ({ name, args }) => this.tools.call(name, args));
    this.a2a.on('skill',    async ({ name, prompt }) => this.skills.execute(name, { prompt }, this));
  }

  _consolidationLoop() {
    // Background "sleep" — every 5 min, consolidate hot memories and decay cold ones.
    setInterval(async () => {
      try {
        const n = await this.memory.consolidate();
        if (n) this.emit('consolidate', n);
        await this.memory.decay();
      } catch (e) { this.emit('error', e); }
    }, 1000 * 60 * 5);
  }
}
