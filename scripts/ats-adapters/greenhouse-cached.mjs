#!/usr/bin/env node
// Greenhouse adapter for CACHED discoveries only — Phase 2.8 Step 5 follow-up.
// scan.mjs (vendored upstream) already handles direct-ATS Greenhouse URLs in
// portals.yml. This adapter ONLY consumes cache entries written by Layer 1
// firecrawl-discover.mjs. Pre-Step-4 cache is empty → no-op.
//
// Run: node scripts/ats-adapters/greenhouse-cached.mjs [--dry-run]

import { pathToFileURL } from "node:url";
import { runAdapterCacheOnly } from "./_lib.mjs";
import { fetchGreenhouse } from "../../career-ops/lib/ats-clients.mjs";

export async function run({ dryRun = false } = {}) {
  return runAdapterCacheOnly({ providerName: "greenhouse", fetcher: fetchGreenhouse, dryRun });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => process.exit(r.errors.length > 0 ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(2); });
}
