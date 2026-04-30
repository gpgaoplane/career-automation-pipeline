#!/usr/bin/env node
// Workday CXS adapter — Phase 2.8 Step 3 (D-15).
// Sibling to scan.mjs (D-3 invariant — scan.mjs untouched).
// Run: node scripts/ats-adapters/workday-cxs.mjs [--dry-run]

import { pathToFileURL } from "node:url";
import { runAdapter } from "./_lib.mjs";
import { fetchWorkdayCxs } from "../../career-ops/lib/ats-clients.mjs";

export async function run({ dryRun = false } = {}) {
  return runAdapter({ providerName: "workday-cxs", fetcher: fetchWorkdayCxs, dryRun });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => process.exit(r.errors.length > 0 ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(2); });
}
