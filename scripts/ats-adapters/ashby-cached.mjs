#!/usr/bin/env node
// Ashby adapter for CACHED discoveries only.
// scan.mjs handles portals.yml direct-ATS Ashby URLs; this consumes cache only.

import { pathToFileURL } from "node:url";
import { runAdapterCacheOnly } from "./_lib.mjs";
import { fetchAshby } from "../../career-ops/lib/ats-clients.mjs";

export async function run({ dryRun = false } = {}) {
  return runAdapterCacheOnly({ providerName: "ashby", fetcher: fetchAshby, dryRun });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run({ dryRun: process.argv.includes("--dry-run") })
    .then((r) => process.exit(r.errors.length > 0 ? 1 : 0))
    .catch((e) => { console.error(e); process.exit(2); });
}
