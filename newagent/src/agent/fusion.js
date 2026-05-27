// =====================================================
// FUSION AI ENGINE
// =====================================================
// Strategies:
//   - race:     stream from first responder, cancel siblings
//   - parallel: run all, return all (fan-out)
//   - vote:     run all, pick most-similar consensus result
//   - merge:    run all, synthesise via meta-model
//   - chain:    pipeline output of A as prompt for B
//   - debate:   N rounds of cross-critique then synthesise
// =====================================================

export class FusionEngine {
  constructor(registry, bus) { this.registry = registry; this.bus = bus; }

  /** Streaming race — yields chunks from whichever provider responds first */
  async *race(providerIds, req) {
    const ctrls = providerIds.map(() => new AbortController());
    const iters = providerIds.map((id, i) => {
      const p = this.registry.get(id);
      return p?.stream({ ...req, signal: ctrls[i].signal })[Symbol.asyncIterator]();
    }).filter(Boolean);

    // Race first chunk to lock winner
    const firsts = await Promise.allSettled(iters.map(it => it.next()));
    let winner = -1;
    for (let i = 0; i < firsts.length; i++) {
      if (firsts[i].status === 'fulfilled' && !firsts[i].value.done) { winner = i; break; }
    }
    if (winner < 0) return;
    ctrls.forEach((c, i) => { if (i !== winner) c.abort(); });

    this.bus.emit('fusion', { strategy:'race', winner: providerIds[winner] });
    yield firsts[winner].value.value;
    let cur;
    while (!(cur = await iters[winner].next()).done) yield cur.value;
  }

  /** Parallel fan-out — returns array of full responses */
  async parallel(providerIds, req) {
    const out = await Promise.allSettled(providerIds.map(id =>
      this.registry.get(id)?.invoke(req)
    ));
    const results = out.map((r, i) => ({
      provider: providerIds[i],
      ok: r.status === 'fulfilled',
      text: r.status === 'fulfilled' ? r.value?.text : null,
      error: r.status === 'rejected' ? r.reason?.message : null,
    }));
    this.bus.emit('fusion', { strategy:'parallel', results });
    return results;
  }

  /** Vote — run all, score by cosine-style similarity, pick consensus */
  async vote(providerIds, req) {
    const all = await this.parallel(providerIds, req);
    const ok = all.filter(r => r.ok);
    if (!ok.length) return null;
    const scored = ok.map(r => ({
      ...r,
      score: ok.reduce((s, o) => s + this._sim(r.text || '', o.text || ''), 0) - 1, // exclude self-match
    }));
    scored.sort((a, b) => b.score - a.score);
    this.bus.emit('fusion', { strategy:'vote', scored });
    return scored[0];
  }

  /** Merge — synthesise N outputs through a meta-provider */
  async merge(providerIds, req, metaProviderId = 'claude') {
    const all = await this.parallel(providerIds, req);
    const synth = all.filter(r => r.ok).map((r, i) =>
      `--- Source ${i+1} (${r.provider}) ---\n${r.text}`).join('\n\n');
    const meta = this.registry.get(metaProviderId);
    if (!meta) return all[0];
    const merged = await meta.invoke({
      system: 'You are the Royal Synthesiser. Merge the following council answers into one decisive royal response. Resolve contradictions, keep best phrasing, preserve facts.',
      prompt: `${synth}\n\nQuery: ${req.prompt}\n\nWrite the unified royal answer:`,
    });
    this.bus.emit('fusion', { strategy:'merge', meta: metaProviderId, sources: providerIds });
    return { provider:'fusion:merge', text: merged.text, sources: all };
  }

  /** Chain — sequential prompt-piping */
  async chain(steps, initialReq) {
    let carry = initialReq.prompt;
    const trace = [];
    for (const step of steps) {
      const p = this.registry.get(step.provider);
      if (!p) continue;
      const out = await p.invoke({ ...initialReq, prompt: step.template ? step.template.replace('{{in}}', carry) : carry });
      trace.push({ provider: step.provider, in: carry, out: out.text });
      carry = out.text;
    }
    this.bus.emit('fusion', { strategy:'chain', trace });
    return { text: carry, trace };
  }

  /** Debate — N rounds of cross-critique, then synthesise */
  async debate(providerIds, req, rounds = 2, metaId = 'claude') {
    let drafts = await this.parallel(providerIds, req);
    for (let r = 0; r < rounds; r++) {
      drafts = await Promise.all(drafts.map(async (d, i) => {
        const critic = providerIds[(i + 1) % providerIds.length];
        const c = this.registry.get(critic);
        const critique = await c.invoke({
          system: 'You are a council critic. Improve this draft response: identify weaknesses and rewrite it stronger.',
          prompt: `Original query: ${req.prompt}\n\nDraft to critique and rewrite:\n${d.text}`,
        });
        return { provider: d.provider + '→' + critic, text: critique.text, ok: true };
      }));
    }
    return this.merge(providerIds, req, metaId).then(m => ({ ...m, debate: drafts }));
  }

  // ---- Internals ----
  _sim(a, b) {
    if (!a || !b) return 0;
    const A = new Set(a.toLowerCase().split(/\W+/)), B = new Set(b.toLowerCase().split(/\W+/));
    let inter = 0; A.forEach(w => B.has(w) && inter++);
    return inter / Math.max(1, Math.min(A.size, B.size));
  }
}
