#!/usr/bin/env node
// Recruitee adapter — Phase 2.8 Step 3 (D-15).
// Run: node scripts/ats-adapters/recruitee.mjs [--dry-run]

import { pathToFileURL } from "node:url";
import { runAdapter } from "./_lib.mjs";
import { fetchRecruitee } from "../../career-ops/lib/ats-clients.mjs";

export async function run({ dryRun = false } = {}) {
  // Recruitee fetcher takes a baseUrl. _lib detects {provider:'recruitee', slug:<tenant>}
  // from URLs like {tenant}.recruitee.com — convert to baseUrl form expected by fetcher.
  const wrappedFetcher = (slug) => fetchRecruitee(`https://${slug}.recruitee.com/`);
  return runAdapter({ providerName: "recruitee", fetcher: wrappedFetcher, dryRun });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => process.exit(r.errors.length > 0 ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(2); });
}
