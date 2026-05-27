#!/usr/bin/env node

/**
 * QueenZoe Executive Runtime Entrypoint
 * ------------------------------------
 * QueenZoe AI EliteQueen Agent Commander
 *
 * Aliases:
 * - QueenHustle
 * - HustleQueen Zoe
 * - HustlerQueen
 * - Queen
 *
 * Runtime Role:
 * Persistent executive cognition layer
 * orchestrating tools, agents, memory,
 * reasoning, and operational workflows.
 */

import process from 'node:process';
import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';
import dotenv from 'dotenv';

import { main } from './src/main.mjs';

// --------------------------------------------------
// Environment Bootstrap
// --------------------------------------------------

dotenv.config();

// --------------------------------------------------
// QueenZoe Identity Banner
// --------------------------------------------------

const banner = gradient(['#7928ca', '#ff0080', '#ffd700'])(`
 ██████╗ ██╗   ██╗███████╗███████╗███╗   ██╗███████╗ ██████╗ ███████╗
██╔═══██╗██║   ██║██╔════╝██╔════╝████╗  ██║╚══███╔╝██╔═══██╗██╔════╝
██║   ██║██║   ██║█████╗  █████╗  ██╔██╗ ██║  ███╔╝ ██║   ██║█████╗
██║▄▄ ██║██║   ██║██╔══╝  ██╔══╝  ██║╚██╗██║ ███╔╝  ██║   ██║██╔══╝
╚██████╔╝╚██████╔╝███████╗███████╗██║ ╚████║███████╗╚██████╔╝███████╗
 ╚══▀▀═╝  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚══════╝
`);

console.log(
  boxen(
    `${banner}

${chalk.bold('QueenZoe AI EliteQueen Agent Commander')}
${chalk.gray('Adaptive Executive Cognition Layer')}

${chalk.magenta('Capabilities')}
• Situational Awareness
• Executive Planning
• Delegation Orchestration
• Tool Governance
• Reflection Cycles
• Operational Memory
• Runtime Authority
• Hierarchical Coordination

${chalk.cyan('Fusion Intelligence Stack')}
LLM Cognition  →  Agentic APIs  →  Tool Executors  →  Runtime Memory

${chalk.yellow('Runtime Philosophy')}
Persistent. Reflective. Strategic. Operational.
`,
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'magenta',
    }
  )
);

// --------------------------------------------------
// Runtime Metadata
// --------------------------------------------------

globalThis.QUEENZOE_RUNTIME = {
  identity: {
    name: 'QueenZoe',
    aliases: [
      'QueenHustle',
      'HustleQueen Zoe',
      'HustlerQueen',
      'Queen',
    ],
    rank: 'AI EliteQueen Agent Commander',
  },

  cognition: {
    persistent: true,
    strategic: true,
    adaptive: true,
    reflective: true,
    agentic: true,
    executive: true,
  },

  authority: {
    memoryMutationRestricted: true,
    dangerousExecutionApproval: true,
    delegationControlled: true,
    runtimeGovernance: true,
  },

  architecture: {
    executiveKernel: true,
    memoryLayer: true,
    planningLayer: true,
    delegationLayer: true,
    toolLayer: true,
    reflectionLayer: true,
    apiFusionLayer: true,
  },

  operationalRules: {
    noSelfSpawn: true,
    noUnapprovedMutation: true,
    hierarchicalDelegation: true,
    continuityPreservation: true,
  },

  runtime: {
    bootTimestamp: new Date().toISOString(),
    platform: process.platform,
    nodeVersion: process.version,
  },
};

// --------------------------------------------------
// Startup Logging
// --------------------------------------------------

console.log(
  chalk.green(
    `\n[QueenZoe] Executive runtime initialized successfully`
  )
);

console.log(
  chalk.cyan(
    `[QueenZoe] Fusion cognition systems online`
  )
);

console.log(
  chalk.magenta(
    `[QueenZoe] Awaiting operational directives...\n`
  )
);

// --------------------------------------------------
// Launch Main Runtime
// --------------------------------------------------

main().catch((err) => {
  console.error(
    chalk.red('\n[QueenZoe] Fatal Executive Runtime Failure')
  );

  console.error(err);

  process.exit(1);
});