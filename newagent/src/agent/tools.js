// =====================================================
// TOOL / FUNCTION CALLING + MCP INTEGRATION
// =====================================================
// Unified tool registry that surfaces to providers as either:
//   - OpenAI/Claude function-call JSON schema
//   - MCP server tools (mounted via mountMCP())
//   - Local JS handlers (sync or async)
//
// Each tool: { name, description, schema, handler, mcpServer?, capabilities? }
// =====================================================

import { EventBus } from './bus.js';

export class ToolRegistry extends EventBus {
  constructor() { super(); this.tools = new Map(); this.mcp = new Map(); }

  register(tool) {
    if (!tool.name || !tool.handler) throw new Error('Tool needs name + handler');
    this.tools.set(tool.name, tool);
    this.emit('register', tool);
    return tool;
  }

  unregister(name) {
    this.tools.delete(name); this.emit('unregister', name);
  }

  list() { return [...this.tools.values()]; }
  get(name) { return this.tools.get(name); }

  /** Mount an MCP server: spec = { name, url, transport, tools:[{name,description,schema}] } */
  async mountMCP(spec) {
    this.mcp.set(spec.name, spec);
    for (const t of (spec.tools || [])) {
      this.register({
        name: `${spec.name}.${t.name}`,
        description: t.description,
        schema: t.schema,
        mcpServer: spec.name,
        handler: async (args) => this._callMCP(spec, t.name, args),
      });
    }
    this.emit('mcp:mount', spec);
  }

  async _callMCP(spec, tool, args) {
    // In production: route through proper MCP transport (stdio/ws/sse).
    // For demo, simulate.
    return { ok: true, server: spec.name, tool, args, result: `[MCP ${spec.name}.${tool}] executed` };
  }

  /** Resolve & execute a model-issued tool call. */
  async call(name, args = {}, ctx = {}) {
    const t = this.tools.get(name);
    if (!t) throw new Error(`Tool not found: ${name}`);
    this.emit('call:start', { name, args });
    try {
      const result = await t.handler(args, ctx);
      this.emit('call:done', { name, args, result });
      return result;
    } catch (err) {
      this.emit('call:error', { name, args, err });
      throw err;
    }
  }

  /** JSON-schema export for OpenAI/Claude tool-calling APIs. */
  toOpenAISchema() {
    return this.list().map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.schema || { type:'object', properties:{} } }
    }));
  }
  toClaudeSchema() {
    return this.list().map(t => ({
      name: t.name, description: t.description, input_schema: t.schema || { type:'object', properties:{} }
    }));
  }
}

// ---------------- Default toolset ----------------
export function registerDefaultTools(reg, services = {}) {
  reg.register({
    name: 'memory.remember',
    description: 'Persist a fact in long-term memory.',
    schema: { type:'object', properties:{ text:{type:'string'}, tags:{type:'array',items:{type:'string'}} }, required:['text'] },
    handler: async ({ text, tags }) => services.memory?.remember(text, tags),
  });
  reg.register({
    name: 'memory.recall',
    description: 'Search long-term memory.',
    schema: { type:'object', properties:{ query:{type:'string'}, k:{type:'number'} }, required:['query'] },
    handler: async ({ query, k }) => services.memory?.recall(query, { k }),
  });
  reg.register({
    name: 'web.fetch',
    description: 'Fetch a URL via configured transport.',
    schema: { type:'object', properties:{ url:{type:'string'}, transport:{type:'string',enum:['https','http','httpx','tor','socks','proxy']} }, required:['url'] },
    handler: async ({ url, transport }) => services.transports?.fetch(url, { transport }),
  });
  reg.register({
    name: 'webhook.emit',
    description: 'Emit a webhook event to a configured target.',
    schema: { type:'object', properties:{ target:{type:'string'}, payload:{type:'object'} }, required:['target','payload'] },
    handler: async ({ target, payload }) => services.transports?.webhook(target, payload),
  });
  reg.register({
    name: 'agent.dispatch',
    description: 'Dispatch a task to a peer agent via A2A.',
    schema: { type:'object', properties:{ agentId:{type:'string'}, task:{type:'string'}, payload:{type:'object'} }, required:['agentId','task'] },
    handler: async ({ agentId, task, payload }) => services.a2a?.dispatch(agentId, task, payload),
  });
  reg.register({
    name: 'batch.enqueue',
    description: 'Enqueue a job in the batch watchflow.',
    schema: { type:'object', properties:{ providerId:{type:'string'}, prompt:{type:'string'}, priority:{type:'number'} }, required:['providerId','prompt'] },
    handler: async ({ providerId, prompt, priority }) =>
      services.batch?.enqueue({ providerId, request:{ prompt }, priority }),
  });
  reg.register({
    name: 'fusion.merge',
    description: 'Run a fusion-merge across N providers.',
    schema: { type:'object', properties:{ providers:{type:'array',items:{type:'string'}}, prompt:{type:'string'} }, required:['providers','prompt'] },
    handler: async ({ providers, prompt }) => services.fusion?.merge(providers, { prompt }),
  });
  reg.register({
    name: 'persona.tone',
    description: 'Switch QueenZoe\'s tone.',
    schema: { type:'object', properties:{ tone:{type:'string',enum:['regal','intimate','tactical','playful','fierce']} }, required:['tone'] },
    handler: async ({ tone }) => { services.personality?.setTone(tone); return { ok:true, tone }; },
  });
  return reg;
}
