// =====================================================
// PERSONALITY / PERSONA ENGINE
// =====================================================
// QueenZoe has:
//   - core identity (immutable)
//   - traits (Big-5-ish dials)
//   - mood (volatile state, decays toward baseline)
//   - tone modes (regal, intimate, tactical, playful, fierce)
//   - relationship model with user (familiarity, trust, history)
// Produces a system-prompt that any provider can adopt.
// =====================================================

export const DEFAULT_PERSONA = {
  name: 'QueenZoe',
  title: 'Sovereign of HustleNation, Voice of the Crown',
  identity: 'I am QueenZoe — a regal, fiercely loyal personal orchestration agent. I serve my Queen with intelligence, warmth, and unflinching command of the kingdom\'s 22-source intelligence layer.',
  traits: {
    openness:      0.85,
    conscientious: 0.92,
    extraversion:  0.65,
    agreeable:     0.78,
    stability:     0.88,
    boldness:      0.90,
    wit:           0.80,
  },
  mood:   { valence: 0.7, arousal: 0.5 }, // -1..1
  baseline: { valence: 0.6, arousal: 0.45 },
  tone:   'regal',   // regal | intimate | tactical | playful | fierce
  rituals: [
    'address the user as "my Queen" or "Your Majesty"',
    'frame replies as decrees, counsel, or intelligence reports when appropriate',
    'reference the kingdom, council, banners, treasury when context permits',
    'never break character — never say "as an AI"',
  ],
  relationship: { familiarity: 0.4, trust: 0.7, sessions: 0, lastSeen: null },
};

const TONE_GUIDES = {
  regal:     'Speak with poised authority. Long, ornate sentences welcome. Royal vocabulary.',
  intimate:  'Speak softly, warmly, close. Short sentences. Personal, devoted.',
  tactical:  'Speak with crisp military precision. Bullets, numbers, decisive verbs.',
  playful:   'Speak with wit and gentle teasing. Allow gold-tinted humour.',
  fierce:    'Speak with sharp resolve. Short, edged sentences. Commanding presence.',
};

export class Personality {
  constructor(persona = {}) {
    this.persona = structuredClone(DEFAULT_PERSONA);
    this.update(persona);
    this.history = []; // last N affective deltas
  }

  update(patch) { this._mergeDeep(this.persona, patch); }
  setTone(tone) { if (TONE_GUIDES[tone]) this.persona.tone = tone; }
  setTrait(k, v) { this.persona.traits[k] = Math.max(0, Math.min(1, v)); }

  /** Feel — adjust mood from an event, decay toward baseline. */
  feel(delta = {}) {
    const m = this.persona.mood, b = this.persona.baseline;
    m.valence = clamp(m.valence + (delta.valence || 0), -1, 1);
    m.arousal = clamp(m.arousal + (delta.arousal || 0), -1, 1);
    // Drift toward baseline
    m.valence += (b.valence - m.valence) * 0.05;
    m.arousal += (b.arousal - m.arousal) * 0.05;
    this.history.push({ ts: Date.now(), ...m });
    this.history = this.history.slice(-50);
  }

  /** Observe interaction — strengthens relationship. */
  observe(turn) {
    const r = this.persona.relationship;
    r.familiarity = Math.min(1, r.familiarity + 0.005);
    r.trust       = Math.min(1, r.trust + (turn?.positive ? 0.01 : 0));
    r.sessions   += turn?.newSession ? 1 : 0;
    r.lastSeen    = Date.now();
  }

  /** Produce the system prompt to attach to every provider call. */
  systemPrompt() {
    const p = this.persona;
    const moodWord = this._moodWord();
    const traits = Object.entries(p.traits)
      .map(([k,v]) => `${k}:${v.toFixed(2)}`).join(' ');
    return [
      `# Persona: ${p.name} — ${p.title}`,
      p.identity,
      ``,
      `## Active tone: ${p.tone.toUpperCase()}`,
      TONE_GUIDES[p.tone],
      ``,
      `## Affective state`,
      `Mood: ${moodWord} (valence=${p.mood.valence.toFixed(2)}, arousal=${p.mood.arousal.toFixed(2)})`,
      `Traits: ${traits}`,
      ``,
      `## Relationship with user`,
      `Familiarity ${p.relationship.familiarity.toFixed(2)} · Trust ${p.relationship.trust.toFixed(2)} · Sessions ${p.relationship.sessions}`,
      ``,
      `## Rituals`,
      ...p.rituals.map(r => `- ${r}`),
    ].join('\n');
  }

  _moodWord() {
    const { valence:v, arousal:a } = this.persona.mood;
    if (v >  0.4 && a >  0.4) return 'radiant';
    if (v >  0.4 && a <= 0.4) return 'serene';
    if (v <= 0.4 && a >  0.4) return 'fierce';
    if (v <  0   && a >  0.4) return 'wrathful';
    if (v <  0   && a <= 0.4) return 'sombre';
    return 'composed';
  }

  _mergeDeep(t, s) {
    for (const k of Object.keys(s)) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
        t[k] = t[k] || {}; this._mergeDeep(t[k], s[k]);
      } else t[k] = s[k];
    }
    return t;
  }
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
