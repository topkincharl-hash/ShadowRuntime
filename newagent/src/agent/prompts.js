// =====================================================
// PROMPTING TECHNIQUES
// =====================================================
// Strategies you can compose around a base prompt:
//   - chainOfThought
//   - reAct                (think → act → observe loop)
//   - reflexion            (do → critique self → retry)
//   - treeOfThoughts       (branch, score, pick best)
//   - fewShot              (inject examples)
//   - skeletonOfThought    (outline first, then expand)
//   - selfConsistency      (sample N, vote)
//   - planAndExecute       (planner + executor split)
// =====================================================

export const Prompts = {
  chainOfThought(prompt) {
    return `${prompt}\n\nThink step by step. Show reasoning in numbered steps before the final answer.\nFinal answer must be prefixed with "ROYAL VERDICT:".`;
  },

  reAct(prompt, tools = []) {
    const toolList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n') || '- (none registered)';
    return `${prompt}\n\nYou may use the ReAct loop:\nThought: ...\nAction: tool_name[arg]\nObservation: ...\n(repeat)\nFinal Answer: ...\n\nAvailable tools:\n${toolList}`;
  },

  reflexion(prompt) {
    return `${prompt}\n\n1) Draft an answer.\n2) Critique it harshly as a council elder.\n3) Rewrite the answer incorporating the critique.\nReturn only the rewritten royal answer.`;
  },

  treeOfThoughts(prompt, breadth = 3) {
    return `${prompt}\n\nGenerate ${breadth} distinct reasoning branches. Label them BRANCH A, B, C…\nFor each branch give a score 1–10 and a one-line justification.\nReturn the highest-scoring branch as the final royal answer.`;
  },

  fewShot(prompt, examples = []) {
    const ex = examples.map((e,i) =>
      `Example ${i+1}:\nUser: ${e.input}\nQueenZoe: ${e.output}`).join('\n\n');
    return `${ex}\n\nNow respond in the same regal style:\nUser: ${prompt}\nQueenZoe:`;
  },

  skeleton(prompt) {
    return `${prompt}\n\nFirst output a bulleted skeleton (3-7 points). Then expand each point into a paragraph. Conclude with "By royal decree…".`;
  },

  selfConsistency(prompt, n = 3) {
    return `${prompt}\n\nGenerate ${n} independent candidate answers (labelled A1..A${n}). Then pick the one that the most candidates agree on. Output only the chosen answer.`;
  },

  planAndExecute(prompt) {
    return `${prompt}\n\nPHASE 1 — PLAN: list ordered steps required.\nPHASE 2 — EXECUTE: walk through each step producing intermediate output.\nPHASE 3 — DELIVER: synthesise the final royal answer.`;
  },

  /** Compose: wrap a prompt with multiple techniques in order. */
  compose(prompt, techniques = []) {
    return techniques.reduce((acc, t) => {
      const fn = typeof t === 'string' ? Prompts[t] : Prompts[t.name];
      return fn ? fn(acc, t.args) : acc;
    }, prompt);
  },

  /** Build full message envelope */
  build({ systemPrompt, memoryContext, prompt, techniques = [], examples = [] }) {
    const mem = memoryContext
      ? `## Recent conversation\n${memoryContext.recent}\n\n## Long-term memory\n${memoryContext.longTerm}\n`
      : '';
    let p = prompt;
    if (examples?.length) p = Prompts.fewShot(p, examples);
    p = Prompts.compose(p, techniques);
    return { system: systemPrompt, prompt: `${mem}\n\nUser: ${p}` };
  },
};
