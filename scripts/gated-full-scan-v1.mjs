#!/usr/bin/env node
// Shadow-only gated scan entry point for refined rules.
// Default mode is dry-run/no-network and writes checkpoint ledgers only.

import { resolve } from "node:path";
import { runDirectCoreV1 } from "./ats-adapters/direct-core-v1.mjs";

function parseArgs(argv) {
  const flags = {
    runDate: new Date().toISOString().slice(0, 10),
    company: null,
    dryRun: true,
    allowNetwork: false,
    allowWrite: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--run-date") flags.runDate = argv[++i];
    else if (a === "--company") flags.company = argv[++i];
    else if (a === "--allow-network") flags.allowNetwork = true;
    else if (a === "--allow-write") flags.allowWrite = true;
    else if (a === "--dry-run") flags.dryRun = true;
    else if (a === "--help" || a === "-h") {
      console.log("Usage: node scripts/gated-full-scan-v1.mjs [--run-date YYYY-MM-DD] [--company NAME] [--allow-network] [--allow-write]");
      process.exit(0);
    } else {
      throw new Error(`Unknown flag: ${a}`);
    }
  }
  if (flags.allowWrite && !flags.allowNetwork) {
    throw new Error("--allow-write requires --allow-network, and V1 still writes ledgers only");
  }
  return flags;
}

async function main() {
  const flags = parseArgs(process.argv);
  const outputDir = resolve("career-ops", "output", "checkpoints", flags.runDate);
  const direct = await runDirectCoreV1({
    runDate: flags.runDate,
    company: flags.company,
    dryRun: flags.dryRun,
    allowNetwork: flags.allowNetwork,
    outputDir,
  });
  console.log(`gated-full-scan-v1 direct ATS targets: ${direct.attempted}`);
  console.log(`network fetched: ${direct.fetched}`);
  console.log(`ledger: ${direct.ledger}`);
  if (direct.errors.length) {
    console.log(`errors: ${direct.errors.length}`);
  }
  console.log("No pipeline/history/cache/tracker writes performed.");
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
