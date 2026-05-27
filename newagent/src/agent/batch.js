// =====================================================
// BATCH WATCHFLOW
// =====================================================
// Schedule a queue of jobs across providers with:
//   - concurrency cap
//   - priorities
//   - retries + backoff
//   - live watch dashboard events
//   - per-job hooks (pre/post/transform)
// =====================================================

export class BatchWatchflow {
  constructor(registry, bus, opts = {}) {
    this.registry = registry; this.bus = bus;
    this.concurrency = opts.concurrency ?? 4;
    this.queue = [];
    this.running = new Map();
    this.history = [];
    this.paused = false;
  }

  /** Add job: { id?, providerId, request, priority, retries, transform, onDone } */
  enqueue(job) {
    const j = {
      id: job.id || crypto.randomUUID(),
      providerId: job.providerId,
      request: job.request,
      priority: job.priority ?? 5,
      retries: job.retries ?? 1,
      attempt: 0,
      status: 'queued',
      enqueuedAt: Date.now(),
      transform: job.transform,
      onDone: job.onDone,
    };
    this.queue.push(j);
    this.queue.sort((a, b) => a.priority - b.priority);
    this.bus.emit('batch:enqueue', j);
    this._tick();
    return j.id;
  }

  enqueueMany(jobs) { return jobs.map(j => this.enqueue(j)); }
  pause() { this.paused = true; this.bus.emit('batch:pause'); }
  resume() { this.paused = false; this._tick(); this.bus.emit('batch:resume'); }

  /** Internal scheduler */
  _tick() {
    if (this.paused) return;
    while (this.running.size < this.concurrency && this.queue.length) {
      const job = this.queue.shift();
      this._run(job);
    }
  }

  async _run(job) {
    job.status = 'running'; job.startedAt = Date.now();
    this.running.set(job.id, job);
    this.bus.emit('batch:start', job);
    const p = this.registry.get(job.providerId);
    try {
      if (!p) throw new Error(`No provider ${job.providerId}`);
      let out = await p.invoke(job.request);
      if (job.transform) out = await job.transform(out, job);
      job.status = 'done'; job.result = out; job.finishedAt = Date.now();
      this.bus.emit('batch:done', job);
      job.onDone?.(null, out);
    } catch (err) {
      job.attempt += 1;
      if (job.attempt <= job.retries) {
        job.status = 'retry';
        this.bus.emit('batch:retry', { job, err });
        const backoff = 250 * Math.pow(2, job.attempt);
        setTimeout(() => { this.queue.unshift(job); this._tick(); }, backoff);
      } else {
        job.status = 'error'; job.error = err.message; job.finishedAt = Date.now();
        this.bus.emit('batch:error', { job, err });
        job.onDone?.(err);
      }
    } finally {
      this.running.delete(job.id);
      this.history.unshift(job);
      this.history = this.history.slice(0, 200);
      this._tick();
    }
  }

  stats() {
    return {
      queued: this.queue.length,
      running: this.running.size,
      done:   this.history.filter(j => j.status === 'done').length,
      error:  this.history.filter(j => j.status === 'error').length,
      concurrency: this.concurrency,
      paused: this.paused,
    };
  }
}
