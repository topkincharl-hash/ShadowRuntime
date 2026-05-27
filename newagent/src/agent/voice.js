// =====================================================
// VOICE — Speech-to-Text + Text-to-Speech
// =====================================================
// Wraps the Web Speech API + AudioWorklet hooks. Designed
// so a server-side engine (Whisper, Eleven, Coqui, Azure)
// can swap in by replacing the `engine` instance.
// =====================================================

import { EventBus } from './bus.js';

export class VoiceEngine extends EventBus {
  constructor(opts = {}) {
    super();
    this.lang = opts.lang ?? 'en-US';
    this.voiceName = opts.voiceName ?? null; // chosen TTS voice
    this.rate = opts.rate ?? 1.0;
    this.pitch = opts.pitch ?? 1.05;        // a touch regal
    this.volume = opts.volume ?? 1.0;
    this.continuous = opts.continuous ?? false;
    this.interim = opts.interim ?? true;

    this._rec = null;
    this._listening = false;
    this._tts = (typeof window !== 'undefined' && window.speechSynthesis) || null;
    this._voices = [];
    if (this._tts) {
      const load = () => { this._voices = this._tts.getVoices(); this.emit('voices', this._voices); };
      load(); this._tts.onvoiceschanged = load;
    }
  }

  // ---- STT ----
  startListening({ onPartial, onFinal } = {}) {
    const SR = (typeof window !== 'undefined') && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { this.emit('error', new Error('SpeechRecognition not supported')); return false; }
    if (this._listening) return true;
    this._rec = new SR();
    this._rec.lang = this.lang;
    this._rec.continuous = this.continuous;
    this._rec.interimResults = this.interim;
    this._rec.onresult = (e) => {
      let partial = '', final = '';
      for (const r of e.results) (r.isFinal ? final += r[0].transcript : partial += r[0].transcript);
      if (partial) { onPartial?.(partial); this.emit('partial', partial); }
      if (final)   { onFinal?.(final);     this.emit('final', final); }
    };
    this._rec.onerror = (e) => this.emit('error', e);
    this._rec.onend = () => { this._listening = false; this.emit('end'); };
    this._rec.start();
    this._listening = true;
    this.emit('start');
    return true;
  }

  stopListening() { try { this._rec?.stop(); } catch {} this._listening = false; }
  isListening() { return this._listening; }

  // ---- TTS ----
  speak(text, opts = {}) {
    if (!this._tts) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang || this.lang;
    u.rate = opts.rate ?? this.rate;
    u.pitch = opts.pitch ?? this.pitch;
    u.volume = opts.volume ?? this.volume;
    const v = this._pickVoice(opts.voiceName || this.voiceName);
    if (v) u.voice = v;
    u.onstart = () => this.emit('speak:start', text);
    u.onend   = () => this.emit('speak:end', text);
    this._tts.speak(u);
    return u;
  }
  cancel() { this._tts?.cancel(); }
  voices() { return this._voices; }
  setVoice(name) { this.voiceName = name; }

  /** Stream speak: speak as text arrives in chunks (for streaming responses). */
  streamSpeak(stream, { sentenceFlush = /[.!?]\s/ } = {}) {
    let buf = '';
    const flush = () => { if (buf.trim()) { this.speak(buf.trim()); buf = ''; } };
    return {
      push: (chunk) => { buf += chunk; if (sentenceFlush.test(buf)) flush(); },
      end:  () => flush(),
    };
  }

  _pickVoice(name) {
    if (!this._voices?.length) return null;
    if (name) {
      const exact = this._voices.find(v => v.name === name);
      if (exact) return exact;
    }
    // Prefer female English voice for queenly tone
    return this._voices.find(v => /female|samantha|victoria|amelia|joanna|libby/i.test(v.name)) ||
           this._voices.find(v => v.lang?.startsWith('en')) ||
           this._voices[0];
  }
}
