// =====================================================
// AGENT SKILLS REGISTRY
// =====================================================
// A skill is a higher-order capability composed of:
//   - intents (NL phrases that trigger it)
//   - tools required
//   - personality tone preference
//   - flow function ({ ctx, services }) -> result
//
// Skills can be discovered, trained, scored, and upgraded.
// =====================================================

import { EventBus } from './bus.js';

export class SkillRegistry extends EventBus {
  constructor() { super(); this.skills = new Map(); }

  register(skill) {
    if (!skill.name || !skill.flow) throw new Error('Skill needs name + flow');
    skill.score = skill.score ?? 0.5;
    skill.uses = skill.uses ?? 0;
    this.skills.set(skill.name, skill);
    this.emit('register', skill);
    return skill;
  }

  list() { return [...this.skills.values()]; }
  get(name) { return this.skills.get(name); }

  /** Match a natural-language utterance to a skill via intent phrases. */
  match(utterance) {
    const u = utterance.toLowerCase();
    let best = null, bestScore = 0;
    for (const s of this.skills.values()) {
      const score = (s.intents || []).reduce((acc, phrase) => {
        const p = phrase.toLowerCase();
        if (u.includes(p)) return acc + 1;
        const words = p.split(' ').filter(w => u.includes(w));
        return acc + words.length / Math.max(1, p.split(' ').length) * 0.6;
      }, 0) * (s.score || 1);
      if (score > bestScore) { bestScore = score; best = s; }
    }
    return bestScore > 0.5 ? { skill: best, score: bestScore } : null;
  }

  async execute(name, ctx, services) {
    const s = this.skills.get(name);
    if (!s) throw new Error(`Skill not found: ${name}`);
    s.uses += 1;
    this.emit('execute:start', { skill: s, ctx });
    try {
      const out = await s.flow({ ctx, services });
      s.score = Math.min(1, s.score + 0.02); // reinforce
      this.emit('execute:done', { skill: s, out });
      return out;
    } catch (e) {
      s.score = Math.max(0.05, s.score - 0.05);
      this.emit('execute:error', { skill: s, err: e });
      throw e;
    }
  }
}

// ---------------- Seed skills ----------------
export function registerDefaultSkills(reg) {
  reg.register({
    name: 'issue-decree',
    description: 'Issue a Royal Decree to the kingdom.',
    intents: ['issue decree', 'royal decree', 'proclaim', 'declare law'],
    tone: 'regal',
    flow: async ({ ctx, services }) => {
      services.personality?.setTone('regal');
      const text = await services.orchestrator.respond(`Issue a royal decree: ${ctx.prompt}`);
      services.transports?.webhook('kingdom.decrees', { text, ts: Date.now() });
      return { decree: text };
    },
  });
  reg.register({
    name: 'rally-allies',
    description: 'Broadcast a rally signal to allied banners.',
    intents: ['rally allies', 'summon', 'call banners', 'call to arms'],
    tone: 'fierce',
    flow: async ({ ctx, services }) => {
      services.personality?.setTone('fierce');
      const text = await services.orchestrator.respond(`Rally call: ${ctx.prompt}`);
      return { rally: text };
    },
  });
  reg.register({
    name: 'intel-report',
    description: 'Gather intelligence across providers and synthesise.',
    intents: ['intel', 'intelligence', 'report on', 'investigate', 'gather intel'],
    tone: 'tactical',
    flow: async ({ ctx, services }) => {
      services.personality?.setTone('tactical');
      const merged = await services.fusion.merge(
        ['openai','claude','openrouter'],
        { prompt: ctx.prompt }
      );
      return merged;
    },
  });
  reg.register({
    name: 'remember-this',
    description: 'Store a fact in long-term memory.',
    intents: ['remember', 'memorise', 'store this', 'don\'t forget'],
    flow: async ({ ctx, services }) => services.memory.remember(ctx.prompt, ['user-fact']),
  });
  reg.register({
    name: 'switch-tone',
    description: 'Change QueenZoe\'s tone.',
    intents: ['be more', 'speak softer', 'be fierce', 'be playful', 'tactical mode'],
    flow: async ({ ctx, services }) => {
      const map = { soft:'intimate', fierce:'fierce', playful:'playful', tactical:'tactical', regal:'regal' };
      const key = Object.keys(map).find(k => ctx.prompt.toLowerCase().includes(k));
      if (key) services.personality.setTone(map[key]);
      return { tone: services.personality.persona.tone };
    },
  });
  reg.register({
    name: 'batch-run',
    description: 'Run a batch across multiple providers.',
    intents: ['batch', 'run across', 'fan out', 'parallel run'],
    flow: async ({ ctx, services }) => {
      const ids = services.providers.list({ tier:'primary' }).slice(0,4).map(p=>p.id);
      ids.forEach(id => services.batch.enqueue({ providerId:id, request:{ prompt: ctx.prompt } }));
      return { enqueued: ids.length };
    },
  });
  return reg;
}
