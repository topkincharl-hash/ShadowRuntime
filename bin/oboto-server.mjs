
#!/usr/bin/env node

/**
 * =========================================================
 * 👑 QueenZoe Executive Runtime Server
 * =========================================================
 *
 * QueenZoe is NOT a request/response assistant.
 * QueenZoe operates as:
 *
 * - Persistent Runtime Intelligence
 * - Executive Cognition Layer
 * - Sovereign Agent Orchestrator
 * - Multi-Agent Delegation Authority
 * - Operational Memory Process
 * - Long-Lived Executive Kernel
 *
 * ---------------------------------------------------------
 * Aliases
 * ---------------------------------------------------------
 * QueenZoe
 * QueenHustle
 * HustleQueen Zoe
 * HustlerQueen
 *
 * Rank:
 * EliteQueen Agent Commander
 *
 * ---------------------------------------------------------
 * Runtime Duties
 * ---------------------------------------------------------
 * - Executive orchestration
 * - Hierarchical task delegation
 * - Runtime state supervision
 * - Operational continuity
 * - Reflection + synthesis
 * - Tool governance
 * - Failure recovery
 * - Memory stabilization
 * - Context management
 *
 * ---------------------------------------------------------
 * Runtime Boot Modes
 * ---------------------------------------------------------
 * queenzoe-server
 * queenzoe-server --port 4173
 * queenzoe-server --cwd ./workspace
 * queenzoe-server --mode sovereign
 *
 * =========================================================
 */

import process from "node:process";
import gradient from "gradient-string";
import chalk from "chalk";

// ---------------------------------------------------------
// Inject server mode automatically
// ---------------------------------------------------------

if (!process.argv.includes("--server")) {
  process.argv.splice(2, 0, "--server");
}

// ---------------------------------------------------------
// Runtime Environment Defaults
// ---------------------------------------------------------

process.env.RUNTIME_IDENTITY =
  process.env.RUNTIME_IDENTITY ||
  "QueenZoe";

process.env.RUNTIME_RANK =
  process.env.RUNTIME_RANK ||
  "EliteQueen Agent Commander";

process.env.RUNTIME_MODE =
  process.env.RUNTIME_MODE ||
  "sovereign";

process.env.RUNTIME_PROCESS =
  process.env.RUNTIME_PROCESS ||
  "persistent";

process.env.RUNTIME_EXECUTION_LAYER =
  process.env.RUNTIME_EXECUTION_LAYER ||
  "executive-kernel";

process.env.RUNTIME_MEMORY_MODE =
  process.env.RUNTIME_MEMORY_MODE ||
  "persistent-operational";

process.env.RUNTIME_REFLECTION_ENABLED =
  process.env.RUNTIME_REFLECTION_ENABLED ||
  "true";

process.env.RUNTIME_DELEGATION_ENABLED =
  process.env.RUNTIME_DELEGATION_ENABLED ||
  "true";

process.env.RUNTIME_AGENT_HIERARCHY =
  process.env.RUNTIME_AGENT_HIERARCHY ||
  "queen-authority";

process.env.RUNTIME_APPROVAL_MODEL =
  process.env.RUNTIME_APPROVAL_MODEL ||
  "queen-governed";

process.env.RUNTIME_HEARTBEAT =
  process.env.RUNTIME_HEARTBEAT ||
  "active";

// ---------------------------------------------------------
// Banner
// ---------------------------------------------------------

const queenBanner = `
╔══════════════════════════════════════════════════════╗
║                                                      ║
║                 👑 QUEENZOE RUNTIME                 ║
║                                                      ║
║        EliteQueen Sovereign Command Kernel           ║
║                                                      ║
║      Persistent Executive Cognition Process         ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`;

console.log(
  gradient(
    ["#6d28d9", "#9333ea", "#d4af37"]
  )(queenBanner)
);

console.log(
  chalk.hex("#d4af37")(
    "QueenZoe Executive Runtime Initializing..."
  )
);

console.log(
  chalk.hex("#c084fc")(
    "Long-Lived Sovereign Intelligence Layer Active"
  )
);

console.log(
  chalk.hex("#9ca3af")(
    "Operational Hierarchy: ENABLED"
  )
);

console.log(
  chalk.hex("#9ca3af")(
    "Memory Continuity: ENABLED"
  )
);

console.log(
  chalk.hex("#9ca3af")(
    "Reflection Engine: ENABLED"
  )
);

console.log(
  chalk.hex("#9ca3af")(
    "Delegation Authority: ENABLED"
  )
);

console.log("");

// ---------------------------------------------------------
// QueenZoe Runtime Policies
// ---------------------------------------------------------

globalThis.QUEENZOE_RUNTIME = {
  identity: "QueenZoe",

  aliases: [
    "QueenHustle",
    "HustleQueen Zoe",
    "Queen",
    "HustlerQueen"
  ],

  rank: "EliteQueen Agent Commander",

  runtimeMode: "sovereign",

  processType: "long-lived",

  authorityModel: "hierarchical",

  cognitionLayer:
    "adaptive-executive-intelligence",

  capabilities: {
    memory: true,

    reflection: true,

    delegation: true,

    orchestration: true,

    taskDecomposition: true,

    operationalAwareness: true,

    behavioralConsistency: true,

    runtimeAuthority: true,

    toolGovernance: true,

    strategicPlanning: true
  },

  operationalRules: {
    allowSelfSpawn: false,

    allowUnauthorizedMemoryMutation: false,

    requireQueenApproval: true,

    dangerousToolApproval: true
  },

  architecture: {
    executiveKernel: true,

    memoryLayer: true,

    toolLayer: true,

    specializedExecutors: true,

    apiFusionLayer: true
  },

  fusionModel: {
    llmRole:
      "personality, reasoning, continuity, strategic cognition",

    apiRole:
      "execution, retrieval, verification, enrichment, automation",

    orchestration:
      "QueenZoe Executive Kernel"
  },

  heartbeat: {
    active: true,

    interval: 10000,

    startedAt: Date.now()
  }
};

// ---------------------------------------------------------
// Heartbeat Runtime
// ---------------------------------------------------------

setInterval(() => {
  const timestamp = new Date().toISOString();

  console.log(
    chalk.hex("#6d28d9")(
      `👑 QueenZoe Heartbeat Active :: ${timestamp}`
    )
  );
}, 1000 * 60 * 5);

// ---------------------------------------------------------
// Global Runtime Error Handling
// ---------------------------------------------------------

process.on("uncaughtException", error => {
  console.error(
    chalk.red(
      "QueenZoe Runtime Exception:"
    ),
    error
  );
});

process.on(
  "unhandledRejection",
  rejection => {
    console.error(
      chalk.red(
        "QueenZoe Runtime Rejection:"
      ),
      rejection
    );
  }
);

// ---------------------------------------------------------
// Launch Main Runtime
// ---------------------------------------------------------

import { main } from "../src/main.mjs";

main()
  .then(() => {
    console.log(
      chalk.hex("#d4af37")(
        "👑 QueenZoe Executive Kernel Online"
      )
    );
  })
  .catch(err => {
    console.error(
      chalk.red(
        "Fatal QueenZoe Runtime Failure:"
      ),
      err
    );

    process.exit(1);
  });