#!/usr/bin/env node
// SmartRecruiters adapter — Phase 2.8 Step 3 (D-15).
// Run: node scripts/ats-adapters/smartrecruiters.mjs [--dry-run]

import { pathToFileURL } from "node:url";
import { runAdapter } from "./_lib.mjs";
import { fetchSmartrecruiters } from "../../career-ops/lib/ats-clients.mjs";

export async function run({ dryRun = false } = {}) {
  return runAdapter({ providerName: "smartrecruiters", fetcher: fetchSmartrecruiters, dryRun });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => process.exit(r.errors.length > 0 ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(2); });
}
