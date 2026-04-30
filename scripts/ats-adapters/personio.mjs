#!/usr/bin/env node
// Personio adapter — Phase 2.8 Step 3 (D-15).
// Run: node scripts/ats-adapters/personio.mjs [--dry-run]

import { pathToFileURL } from "node:url";
import { runAdapter } from "./_lib.mjs";
import { fetchPersonio } from "../../career-ops/lib/ats-clients.mjs";

export async function run({ dryRun = false } = {}) {
  return runAdapter({ providerName: "personio", fetcher: fetchPersonio, dryRun });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => process.exit(r.errors.length > 0 ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(2); });
}
